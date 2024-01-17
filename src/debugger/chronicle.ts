export enum EntryType {
  METRIC = "metric",
  MESSAGE = "message",
}

export enum MessageLevel {
  ERROR = "error",
  INFO = "info",
  WARNING = "warning",
  TRACE = "trace",
}

type ErrorMessage = { level: MessageLevel.ERROR; data: Error }
type InfoMessage = { level: MessageLevel.INFO; data: string }
type WarningMessage = { level: MessageLevel.WARNING; data: string }
type TraceMessage = { level: MessageLevel.TRACE; data: string }

type Message = { type: EntryType.MESSAGE } & (ErrorMessage | InfoMessage | WarningMessage | TraceMessage)

type Metric = { type: EntryType.METRIC } & (
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

type ChronicleEntry = { currentElementTime: number; sessionTime: number } & (Message | Metric)
type EntryIdentifier = Message["level"] | Metric["key"]

type History = ChronicleEntry[]

export type EntryForType<Type extends EntryType> = Extract<Message | Metric, { type: Type }>
type MessageForLevel<Level extends Message["level"]> = Extract<Message, { level: Level }>
type MetricForKey<Key extends Metric["key"]> = Extract<Metric, { key: Key }>

export type EntryForIdentifier<I extends EntryIdentifier> = I extends Message["level"]
  ? MessageForLevel<I>
  : I extends Metric["key"]
    ? MetricForKey<I>
    : never

type ChronicleUpdateCallback = (chronicle: History) => void

class Chronicle {
  public currentElementTime: number = 0

  private updateCallbacks: ChronicleUpdateCallback[] = []
  private chronicle: History = []
  private sessionStartTime = Date.now()

  private getSessionTimeSoFar() {
    return Date.now() - this.sessionStartTime
  }

  private pushEntry(partial: Message | Metric) {
    this.chronicle.push({
      ...partial,
      currentElementTime: this.currentElementTime,
      sessionTime: this.getSessionTimeSoFar(),
    })
  }

  private _updates() {
    const chronicleSoFar = this.retrieve()
    this.updateCallbacks.forEach((callback) => callback(chronicleSoFar))
  }

  public retrieve() {
    return [...this.chronicle]
  }

  public registerForUpdates(callback: ChronicleUpdateCallback) {
    this.updateCallbacks.push(callback)
  }

  public unregisterForUpdates(callback: ChronicleUpdateCallback) {
    const indexOf = this.updateCallbacks.indexOf(callback)

    if (indexOf !== -1) {
      this.updateCallbacks.splice(indexOf, 1)
    }
  }

  public pushMetric<Key extends Metric["key"]>(key: Key, data: MetricForKey<Key>["data"]) {
    this.pushEntry({ key, data, type: EntryType.METRIC } as ChronicleEntry)
  }

  public getLatestMetric<Key extends Metric["key"]>(_key: Key): MetricForKey<Key> {
    return null as unknown as MetricForKey<Key>
  }

  public error(err: EntryForIdentifier<MessageLevel.ERROR>["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: MessageLevel.ERROR, data: err })
  }

  public info(message: EntryForIdentifier<MessageLevel.INFO>["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: MessageLevel.INFO, data: message })
  }

  public trace(message: EntryForIdentifier<MessageLevel.TRACE>["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: MessageLevel.TRACE, data: message })
  }

  public warn(message: EntryForIdentifier<MessageLevel.WARNING>["data"]) {
    this.pushEntry({ type: EntryType.MESSAGE, level: MessageLevel.WARNING, data: message })
  }
}

export default Chronicle
