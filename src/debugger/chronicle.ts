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

export enum TraceKind {
  API_CALL = "api-call",
  EVENT = "event",
}

type ErrorMessage = { type: EntryType.MESSAGE; level: MessageLevel.ERROR; data: Error }
type InfoMessage = { type: EntryType.MESSAGE; level: MessageLevel.INFO; data: string }
type WarningMessage = { type: EntryType.MESSAGE; level: MessageLevel.WARNING; data: string }
type TraceMessage = { type: EntryType.MESSAGE; level: MessageLevel.TRACE; data: string }

type Message = ErrorMessage | InfoMessage | WarningMessage | TraceMessage

export enum MetricKey {
  AUTO_RESUME = "auto-resume",
  BITRATE = "bitrate",
  BUFFER_LENGTH = "buffer-length",
  READY_STATE = "ready-state",
  CDNS_AVAILABLE = "cdns-available",
  CURRENT_URL = "current-url",
  DURATION = "duration",
  FRAMES_DROPPED = "frames-dropped",
  INITIAL_PLAYBACK_TIME = "initial-playback-time",
  PAUSED = "paused",
  REPRESENTATION_AUDIO = "representation-audio",
  REPRESENTATION_VIDEO = "representation-video",
  SEEKABLE_RANGE = "seekable-range",
  SEEKING = "seeking",
  STRATEGY = "strategy",
  SUBTITLE_CDNS_AVAILABLE = "subtitle-cdns-available",
  SUBTITLE_CURRENT_URL = "subtitle-current-url",
  VERSION = "version",
}

type Metric =
  | { type: EntryType.METRIC; key: MetricKey.AUTO_RESUME; data: number }
  | { type: EntryType.METRIC; key: MetricKey.BITRATE; data: number }
  | { type: EntryType.METRIC; key: MetricKey.BUFFER_LENGTH; data: number }
  | {
      type: EntryType.METRIC
      key: MetricKey.READY_STATE
      data: HTMLMediaElement["readyState"]
    }
  | { type: EntryType.METRIC; key: MetricKey.CDNS_AVAILABLE; data: string[] }
  | { type: EntryType.METRIC; key: MetricKey.CURRENT_URL; data: string }
  | { type: EntryType.METRIC; key: MetricKey.DURATION; data: number }
  | { type: EntryType.METRIC; key: MetricKey.FRAMES_DROPPED; data: number }
  | { type: EntryType.METRIC; key: MetricKey.INITIAL_PLAYBACK_TIME; data: number }
  | { type: EntryType.METRIC; key: MetricKey.PAUSED; data: HTMLMediaElement["paused"] }
  | { type: EntryType.METRIC; key: MetricKey.REPRESENTATION_AUDIO; data: { qualityIndex: number; bitrate: number } }
  | { type: EntryType.METRIC; key: MetricKey.REPRESENTATION_VIDEO; data: { qualityIndex: number; bitrate: number } }
  | { type: EntryType.METRIC; key: MetricKey.SEEKABLE_RANGE; data: { start: number; end: number } }
  | { type: EntryType.METRIC; key: MetricKey.SEEKING; data: HTMLMediaElement["seeking"] }
  | { type: EntryType.METRIC; key: MetricKey.STRATEGY; data: string }
  | { type: EntryType.METRIC; key: MetricKey.SUBTITLE_CDNS_AVAILABLE; data: string[] }
  | { type: EntryType.METRIC; key: MetricKey.SUBTITLE_CURRENT_URL; data: string }
  | { type: EntryType.METRIC; key: MetricKey.VERSION; data: string }

type Entry = Message | Metric

type History = Entry[]

export type MessageForLevel<Level extends MessageLevel> = Extract<Message, { level: Level }>
export type MetricForKey<Key extends MetricKey> = Extract<Metric, { key: Key }>

type EntryForIdentifier<I extends MessageLevel | MetricKey> = I extends MessageLevel
  ? MessageForLevel<I>
  : I extends MetricKey
    ? MetricForKey<I>
    : never

// type _ChronicleLogButElectric = ChronicleEntry[]
const TYPES = {
  APICALL: "apicall",
  ERROR: "error",
  EVENT: "event",
  INFO: "info",
  KEYVALUE: "keyvalue",
  TIME: "time",
  WARNING: "warning",
} as const

type ChronicleUpdateCallback = (chronicle: History) => void

class Chronicle {
  static TYPES = TYPES

  public currentElementTime: number = 0

  private updateCallbacks: ChronicleUpdateCallback[] = []
  private chronicle: History = []
  // private firstTimeElement: boolean = true
  // private compressTime: boolean = false

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

  public pushMetric<Key extends MetricKey>(_key: Key, _value: MetricForKey<Key>["data"]) {
    // stubbed
  }

  public getLatestMetric<Key extends MetricKey>(_key: Key): MetricForKey<Key> {
    return null as unknown as MetricForKey<Key>
  }

  public error(err: EntryForIdentifier<MessageLevel.ERROR>["data"]) {
    const entry: ErrorMessage = {
      type: EntryType.MESSAGE,
      level: MessageLevel.ERROR,
      data: err,
    }

    this.chronicle.push(entry)
  }

  public info(message: EntryForIdentifier<MessageLevel.INFO>["data"]) {
    const entry: InfoMessage = {
      type: EntryType.MESSAGE,
      level: MessageLevel.INFO,
      data: message,
    }

    this.chronicle.push(entry)
  }

  // TODO: Disamg Trace Type
  public trace(message: EntryForIdentifier<MessageLevel.TRACE>["data"]) {
    const entry: TraceMessage = {
      type: EntryType.MESSAGE,
      level: MessageLevel.TRACE,
      data: message,
    }

    this.chronicle.push(entry)
  }

  public warn(message: EntryForIdentifier<MessageLevel.WARNING>["data"]) {
    const entry: WarningMessage = {
      type: EntryType.MESSAGE,
      level: MessageLevel.WARNING,
      data: message,
    }

    this.chronicle.push(entry)
  }
}

export default Chronicle
