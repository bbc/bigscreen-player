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

type Message = { type: EntryType.MESSAGE } & (
  | { level: MessageLevel.ERROR; data: Error }
  | { level: MessageLevel.INFO; data: string }
  | { level: MessageLevel.TRACE; data: string }
  | {
      level: MessageLevel.TRACE
      data: {
        kind: "api-call"
        functionName: string
        functionParameters: any[]
      }
    }
  | {
      level: MessageLevel.TRACE
      data: {
        kind: "event"
        eventType: string
      }
    }
  | { level: MessageLevel.WARNING; data: string }
)

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

type Metric = { type: EntryType.METRIC } & (
  | { key: MetricKey.AUTO_RESUME; data: number }
  | { key: MetricKey.BITRATE; data: number }
  | { key: MetricKey.BUFFER_LENGTH; data: number }
  | {
      key: MetricKey.READY_STATE
      data: HTMLMediaElement["readyState"]
    }
  | { key: MetricKey.CDNS_AVAILABLE; data: string[] }
  | { key: MetricKey.CURRENT_URL; data: string }
  | { key: MetricKey.DURATION; data: number }
  | { key: MetricKey.FRAMES_DROPPED; data: number }
  | { key: MetricKey.INITIAL_PLAYBACK_TIME; data: number }
  | { key: MetricKey.PAUSED; data: HTMLMediaElement["paused"] }
  | { key: MetricKey.REPRESENTATION_AUDIO; data: { qualityIndex: number; bitrate: number } }
  | { key: MetricKey.REPRESENTATION_VIDEO; data: { qualityIndex: number; bitrate: number } }
  | { key: MetricKey.SEEKABLE_RANGE; data: { start: number; end: number } }
  | { key: MetricKey.SEEKING; data: HTMLMediaElement["seeking"] }
  | { key: MetricKey.STRATEGY; data: string }
  | { key: MetricKey.SUBTITLE_CDNS_AVAILABLE; data: string[] }
  | { key: MetricKey.SUBTITLE_CURRENT_URL; data: string }
  | { key: MetricKey.VERSION; data: string }
)

type Entry = Message | Metric

type History = Entry[]

export type MessageForLevel<Level extends MessageLevel> = Extract<Message, { level: Level }>
export type MetricForKey<Key extends MetricKey> = Extract<Metric, { key: Key }>

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

type ChronicleLog = { type: string; currentTime?: number; timestamp?: number } & (
  | { type: typeof TYPES.APICALL; calltype: string }
  | { type: typeof TYPES.EVENT; event: object | string }
  | { type: typeof TYPES.WARNING; warning: object | string }
  | { type: typeof TYPES.INFO; message: object | string }
  | { type: typeof TYPES.ERROR; error: Error }
  | { type: typeof TYPES.TIME; currentTime: number }
  | { type: typeof TYPES.KEYVALUE; keyvalue: object }
)

type ChronicleUpdateCallback = (chronicle: History) => void

class Chronicle {
  static TYPES = TYPES

  private updateCallbacks: ChronicleUpdateCallback[] = []
  private chronicle: History = []
  private firstTimeElement: boolean = true
  private compressTime: boolean = false

  private updates() {
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

  public pushToChronicle(obj: ChronicleLog) {
    if (obj.type !== "time") {
      this.firstTimeElement = true
      this.compressTime = false
    }

    this.timestamp(obj)
    this.chronicle.push(obj)
    this.updates()
  }

  public getElementTime() {
    return 0
  }

  public setElementTime(_seconds: number) {
    // stubbed
  }

  public pushMetric<Key extends MetricKey>(_key: Key, _value: MetricForKey<Key>["data"]) {
    // stubbed
  }

  public getLatestMetric<Key extends MetricKey>(_key: Key): MetricForKey<Key> {
    return null as unknown as MetricForKey<Key>
  }

  public error(_err: MessageForLevel<MessageLevel.ERROR>["data"]) {
    // empty
  }

  public info(_message: MessageForLevel<MessageLevel.INFO>["data"]) {
    // stub
  }

  public trace(_message: MessageForLevel<MessageLevel.TRACE>["data"]) {
    // stub
  }

  public warn(_message: MessageForLevel<MessageLevel.WARNING>["data"]) {
    // stub
  }

  public apicall(name: string, args: any[]) {
    // stub
  }

  public event(type: string) {
    // stub
  }
}

export default Chronicle
