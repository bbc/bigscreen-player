import { MediaState } from "../models/mediastate"
import getValues from "../utils/get-values"
import { MediaKinds } from "../models/mediakinds"

export enum EntryCategory {
  METRIC = "metric",
  MESSAGE = "message",
  TRACE = "trace",
}

type InfoMessage = { level: "info"; data: string }
type WarningMessage = { level: "warning"; data: string }
type DebugMessage = { level: "debug"; data: string }

export type Message = { category: EntryCategory.MESSAGE } & (InfoMessage | WarningMessage | DebugMessage)

export type Metric = { category: EntryCategory.METRIC } & (
  | { key: "auto-resume"; data: number }
  | { key: "bitrate"; data: number }
  | { key: "buffer-length"; data: number }
  | { key: "ended"; data: HTMLMediaElement["ended"] }
  | { key: "ready-state"; data: HTMLMediaElement["readyState"] }
  | { key: "cdns-available"; data: string[] }
  | { key: "current-url"; data: string }
  | { key: "duration"; data: number }
  | { key: "frames-dropped"; data: number }
  | { key: "initial-playback-time"; data: number }
  | { key: "paused"; data: HTMLMediaElement["paused"] }
  | { key: "representation-audio"; data: [qualityIndex: number, bitrate: number] }
  | { key: "representation-video"; data: [qualityIndex: number, bitrate: number] }
  | { key: "seekable-range"; data: [start: number, end: number] }
  | { key: "seeking"; data: HTMLMediaElement["seeking"] }
  | { key: "strategy"; data: string }
  | { key: "subtitle-cdns-available"; data: string[] }
  | { key: "subtitle-current-url"; data: string }
  | { key: "version"; data: string }
)

export type Trace = { category: EntryCategory.TRACE } & (
  | { kind: "buffered-ranges"; data: { kind: MediaKinds; buffered: [start: number, end: number][] } }
  | { kind: "error"; data: { name?: string; message: string } }
  | { kind: "event"; data: { eventType: string; eventTarget: string } }
  | { kind: "gap"; data: { from: number; to: number } }
  | { kind: "session-start"; data: number }
  | { kind: "session-end"; data: number }
  | { kind: "state-change"; data: MediaState }
)

export type Entry = Message | Metric | Trace

export type MessageLevel = Message["level"]
export type MetricKey = Metric["key"]
export type TraceKind = Trace["kind"]

export type Timestamped<Category> = { currentElementTime: number; sessionTime: number } & Category
export type TimestampedEntry = Timestamped<Entry>
export type History = TimestampedEntry[]
export type TimestampedMetric = Timestamped<Metric>
export type TimestampedMessage = Timestamped<Message>
export type TimestampedTrace = Timestamped<Trace>

export type MessageForLevel<Level extends MessageLevel> = Extract<Message, { level: Level }>
export type MetricForKey<Key extends MetricKey> = Extract<Metric, { key: Key }>
export type TraceForKind<Kind extends TraceKind> = Extract<Trace, { kind: Kind }>

export type EntrySelector = MessageLevel | MetricKey | TraceKind
export type EntryForSelector<Selector extends EntrySelector> = Selector extends MessageLevel
  ? MessageForLevel<Selector>
  : Selector extends MetricKey
    ? MetricForKey<Selector>
    : Selector extends TraceKind
      ? TraceForKind<Selector>
      : never
export type TimestampedEntryForSelector<Selector extends EntrySelector> = Timestamped<EntryForSelector<Selector>>

export const isMessage = <E extends Entry | TimestampedEntry, T extends E extends Entry ? Message : TimestampedMessage>(
  entry: E
): entry is E & T => entry.category === EntryCategory.MESSAGE

export const isMetric = <E extends Entry | TimestampedEntry, T extends E extends Entry ? Metric : TimestampedMetric>(
  entry: E
): entry is E & T => entry.category === EntryCategory.METRIC

export const isTrace = <E extends Entry | TimestampedEntry, T extends E extends Entry ? Trace : TimestampedTrace>(
  entry: E
): entry is E & T => entry.category === EntryCategory.TRACE

type EventListeners =
  | { type: "update"; listener: (change: Readonly<TimestampedEntry>) => void }
  | { type: "timeupdate"; listener: (seconds: number) => void }
type EventTypes = EventListeners["type"]
type EventListenerForType<Type extends EventTypes> = Extract<EventListeners, { type: Type }>["listener"]

function isValid<T>(data: T): boolean {
  const type = typeof data

  return (
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    (type === "object" && Array.isArray(data) && data.every((element) => isValid(element)))
  )
}

function isEqual<T>(left: T, right: T): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((element, index) => isEqual(element, right[index]))
  }

  return left === right
}

function sortEntries(someEntry: Timestamped<Entry>, otherEntry: Timestamped<Entry>): number {
  return someEntry.sessionTime === otherEntry.sessionTime
    ? someEntry.currentElementTime - otherEntry.currentElementTime
    : someEntry.sessionTime - otherEntry.sessionTime
}

function concatArrays<T>(someArray: T[], otherArray: T[]): T[] {
  return [...someArray, ...otherArray]
}

const METRIC_ENTRY_THRESHOLD = 100

class Chronicle {
  private sessionStartTime: number = Date.now()
  private currentElementTime: number = 0

  private messages: Timestamped<Message>[] = []
  private metrics: { [Key in MetricKey]?: Timestamped<MetricForKey<Key>>[] } = {}
  private traces: Timestamped<Trace>[] = []
  private listeners: { [Type in EventTypes]: EventListenerForType<Type>[] } = { update: [], timeupdate: [] }

  private triggerUpdate(entry: TimestampedEntry) {
    this.listeners.update.forEach((callback) => callback(entry))
  }

  private triggerTimeUpdate(seconds: number) {
    this.listeners.timeupdate.forEach((callback) => callback(seconds))
  }

  private timestamp<E extends Entry>(entry: E): Timestamped<E> {
    return { ...entry, currentElementTime: this.currentElementTime, sessionTime: this.getSessionTime() }
  }

  private pushMessage(message: Message): void {
    const entry = this.timestamp(message)

    this.messages.push(entry)
    this.triggerUpdate(entry)
  }

  public getCurrentElementTime(): number {
    return this.currentElementTime
  }

  public setCurrentElementTime(seconds: number) {
    this.currentElementTime = seconds

    this.triggerTimeUpdate(seconds)
  }

  public getSessionTime() {
    return Date.now() - this.sessionStartTime
  }

  public on<Type extends EventTypes>(type: Type, listener: EventListenerForType<Type>) {
    this.listeners[type].push(listener)
  }

  public off<Type extends EventTypes>(type: Type, listener: EventListenerForType<Type>) {
    const index = this.listeners[type].indexOf(listener)

    if (index === -1) {
      return
    }

    this.listeners[type].splice(index, 1)
  }

  public retrieve(): Timestamped<Entry>[] {
    const metrics = getValues(this.metrics).reduce(concatArrays, [])

    return [...this.messages, ...this.traces, ...metrics].sort(sortEntries) as Timestamped<Entry>[]
  }

  public size(): number {
    return (
      this.messages.length +
      this.traces.length +
      getValues(this.metrics).reduce((sumSoFar, metricsForKey) => sumSoFar + metricsForKey.length, 0)
    )
  }

  public appendMetric<Key extends MetricKey>(key: Key, data: MetricForKey<Key>["data"]) {
    if (!isValid(data)) {
      throw new TypeError(
        `A metric value can only be a primitive type, or an array of any depth containing primitive types. Got ${typeof data}`
      )
    }

    const latest = this.getLatestMetric(key)

    if (latest && isEqual(latest.data, data)) {
      return
    }

    if (this.metrics[key] == null) {
      this.metrics[key] = []
    }

    const metricsForKey = this.metrics[key] as Timestamped<MetricForKey<Key>>[]

    if (metricsForKey.length + 1 === METRIC_ENTRY_THRESHOLD) {
      this.warn(
        `Metric ${key} exceeded ${METRIC_ENTRY_THRESHOLD}. Consider a more selective sample, or not storing history.`
      )
    }

    const metric = this.timestamp({ key, data, category: EntryCategory.METRIC } as MetricForKey<Key>)

    metricsForKey.push(metric)

    this.triggerUpdate(metric)
  }

  public setMetric<Key extends MetricKey>(key: Key, data: MetricForKey<Key>["data"]) {
    this.metrics[key] = []

    this.appendMetric(key, data)
  }

  public getLatestMetric<Key extends MetricKey>(key: Key): MetricForKey<Key> | null {
    if (!this.metrics[key]?.length) {
      return null
    }

    const metricsForKey = this.metrics[key] as Timestamped<MetricForKey<Key>>[]

    return metricsForKey[metricsForKey.length - 1] as MetricForKey<Key>
  }

  public debug(message: MessageForLevel<"debug">["data"]) {
    this.pushMessage({ category: EntryCategory.MESSAGE, level: "debug", data: message })
  }

  public info(message: MessageForLevel<"info">["data"]) {
    this.pushMessage({ category: EntryCategory.MESSAGE, level: "info", data: message })
  }

  public trace<Kind extends TraceKind>(kind: Kind, data: TraceForKind<Kind>["data"]) {
    const entry = this.timestamp({ kind, data, category: EntryCategory.TRACE } as Trace)

    this.traces.push(entry)
    this.triggerUpdate(entry)
  }

  public warn(message: MessageForLevel<"warning">["data"]) {
    this.pushMessage({ category: EntryCategory.MESSAGE, level: "warning", data: message })
  }
}

export default Chronicle
