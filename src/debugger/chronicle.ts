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
  | { key: "seekable-range"; data: { start: number; end: number } }
  | { key: "seeking"; data: HTMLMediaElement["seeking"] }
  | { key: "strategy"; data: string }
  | { key: "subtitle-cdns-available"; data: string[] }
  | { key: "subtitle-current-url"; data: string }
  | { key: "version"; data: string }
)

export type Trace = { type: EntryType.TRACE } & { kind: "event"; eventType: string; eventTarget: string }

export type Entry = Message | Metric | Trace
export type EntryForType<Type extends EntryType> = Extract<Entry, { type: Type }>

export type MessageLevel = Message["level"]
export type MetricKey = Metric["key"]
export type TraceKind = Trace["kind"]
export type EntryIdentifier = MessageLevel | MetricKey | TraceKind

export type TimestampedEntry = { currentElementTime: number; sessionTime: number } & Entry
export type History = TimestampedEntry[]

export type MessageForLevel<Level extends MessageLevel> = Extract<Message, { level: Level }>
export type MetricForKey<Key extends MetricKey> = Extract<Metric, { key: Key }>
export type TraceForKind<Kind extends TraceKind> = Extract<Trace, { kind: Kind }>
export type EntryForIdentifier<I extends EntryIdentifier> = I extends Message["level"]
  ? MessageForLevel<I>
  : I extends Metric["key"]
    ? MetricForKey<I>
    : never

type EventTypes = "update"

type UpdateHandler = (chronicle: History) => void

class Chronicle {
  public currentElementTime: number = 0

  private chronicle: History = []
  private sessionStartTime: number = Date.now()
  private listeners: Record<EventTypes, UpdateHandler[]> = { update: [] }

  private getSessionTimeSoFar() {
    return Date.now() - this.sessionStartTime
  }

  private pushEntry(partial: Entry) {
    this.chronicle.push({
      ...partial,
      currentElementTime: this.currentElementTime,
      sessionTime: this.getSessionTimeSoFar(),
    })

    this.triggerUpdateListeners()
  }

  private triggerUpdateListeners() {
    const chronicleSoFar = this.retrieve()

    this.listeners.update.forEach((callback) => callback(chronicleSoFar))
  }

  public retrieve() {
    return [...this.chronicle]
  }

  public on(type: EventTypes, listener: UpdateHandler) {
    this.listeners[type].push(listener)
  }

  public off(type: EventTypes, listener: UpdateHandler) {
    this.listeners[type] = this.listeners[type].filter((callback) => callback !== listener)
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
