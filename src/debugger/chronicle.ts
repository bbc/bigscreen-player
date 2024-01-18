export enum EntryType {
  METRIC = "metric",
  MESSAGE = "message",
  TRACE = "trace",
}

type ErrorMessage = { level: "error"; data: Error }
type InfoMessage = { level: "info"; data: string }
type WarningMessage = { level: "warning"; data: string }
type DebugMessage = { level: "debug"; data: string }

export type Message = { type: EntryType.MESSAGE } & (ErrorMessage | InfoMessage | WarningMessage | DebugMessage)

export type Metric = { type: EntryType.METRIC } & (
  | { key: "auto-resume"; data: number }
  | { key: "bitrate"; data: number }
  | { key: "buffer-length"; data: number }
  | { key: "ready-state"; data: HTMLMediaElement["readyState"] }
  | { key: "cdns-available"; data: string[] }
  | { key: "current-url"; data: string }
  | { key: "duration"; data: number }
  | { key: "frames-dropped"; data: number }
  | { key: "initial-playback-time"; data: number }
  | { key: "paused"; data: HTMLMediaElement["paused"] }
  | { key: "representation-audio"; data: { qualityIndex: number; bitrate: number } }
  | { key: "representation-video"; data: { qualityIndex: number; bitrate: number } }
  | { key: "seekable-range"; data: { start: Date; end: Date } }
  | { key: "seeking"; data: HTMLMediaElement["seeking"] }
  | { key: "strategy"; data: string }
  | { key: "subtitle-cdns-available"; data: string[] }
  | { key: "subtitle-current-url"; data: string }
  | { key: "version"; data: string }
)

export type Trace = { type: EntryType.TRACE } & { kind: "event"; eventType: string; eventTarget: string }

export type Entry = Message | Metric | Trace

export type MessageLevel = Message["level"]
export type MetricKey = Metric["key"]
export type MetricValue = Metric["data"]
export type TraceKind = Trace["kind"]
export type EntryIdentifier = MessageLevel | MetricKey | TraceKind

export type TimestampedEntry = { currentElementTime: number; sessionTime: number } & Entry
export type EntryForType<Type extends EntryType> = Extract<TimestampedEntry, { type: Type }>
export type History = TimestampedEntry[]

export type MessageForLevel<Level extends MessageLevel> = Extract<Message, { level: Level }>
export type MetricForKey<Key extends MetricKey> = Extract<Metric, { key: Key }>
export type TraceForKind<Kind extends TraceKind> = Extract<Trace, { kind: Kind }>
export type EntryForIdentifier<I extends EntryIdentifier> = I extends Message["level"]
  ? MessageForLevel<I>
  : I extends Metric["key"]
    ? MetricForKey<I>
    : never

type EventListeners =
  | { type: "update"; listener: (change: Readonly<TimestampedEntry>) => void }
  | { type: "timeupdate"; listener: (seconds: number) => void }
type EventTypes = EventListeners["type"]
type EventListenerForType<Type extends EventTypes> = Extract<EventListeners, { type: Type }>["listener"]

class Chronicle {
  private currentElementTime: number = 0

  private chronicle: History = []
  private sessionStartTime: number = Date.now()
  private listeners: { [Type in EventTypes]: EventListenerForType<Type>[] } = { update: [], timeupdate: [] }

  private pushEntry(partial: Entry) {
    const entry = {
      ...partial,
      currentElementTime: this.currentElementTime,
      sessionTime: this.getSessionTime(),
    }

    this.chronicle.push(entry)

    this.triggerUpdate(entry)
  }

  private triggerUpdate(entry: TimestampedEntry) {
    this.listeners.update.forEach((callback) => callback(entry))
  }

  private triggerTimeUpdate(seconds: number) {
    this.listeners.timeupdate.forEach((callback) => callback(seconds))
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

  public retrieve() {
    return [...this.chronicle]
  }

  public pushMetric<Key extends Metric["key"]>(key: Key, data: MetricForKey<Key>["data"]) {
    this.pushEntry({ key, data, type: EntryType.METRIC } as TimestampedEntry)
  }

  public getLatestMetric<Key extends Metric["key"]>(key: Key): MetricForKey<Key> | undefined {
    const isMetricForKey = function (entry: Entry): entry is MetricForKey<Key> {
      return entry.type === EntryType.METRIC && entry.key === key
    }

    const filtered = (this.chronicle as Entry[]).filter(isMetricForKey)

    return filtered.length > 0 ? filtered[filtered.length - 1] : undefined
  }

  public error(err: MessageForLevel<"error">["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: "error", data: err })
  }

  public event(type: TraceForKind<"event">["eventType"], target: TraceForKind<"event">["eventTarget"]) {
    this.pushEntry({ type: EntryType.TRACE, kind: "event", eventType: type, eventTarget: target })
  }

  public info(message: MessageForLevel<"info">["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: "info", data: message })
  }

  public debug(message: MessageForLevel<"debug">["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: "debug", data: message })
  }

  public warn(message: MessageForLevel<"warning">["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: "warning", data: message })
  }
}

export default Chronicle
