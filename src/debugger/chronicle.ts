export enum ChronicleEntryType {
  METRIC = "metric",
  MESSAGE = "message",
}

enum ChronicleMessageLevel {
  ERROR = "error",
  INFO = "info",
  WARNING = "warning",
  TRACE = "trace",
}

type _ChronicleMessage = { type: ChronicleEntryType.MESSAGE } & (
  | { level: ChronicleMessageLevel.ERROR; data: Error }
  | { level: ChronicleMessageLevel.INFO; data: string }
  | {
      level: ChronicleMessageLevel.TRACE
      data: {
        kind: "api-call"
        functionName: string
        functionParameters: any[]
      }
    }
  | {
      level: ChronicleMessageLevel.TRACE
      data: {
        kind: "event"
        eventType: string
      }
    }
  | { level: ChronicleMessageLevel.WARNING; data: string }
)

enum ChronicleMetricKey {
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

type ChronicleMetric = { type: ChronicleEntryType.METRIC } & (
  | { key: ChronicleMetricKey.AUTO_RESUME; data: number }
  | { key: ChronicleMetricKey.BITRATE; data: number }
  | { key: ChronicleMetricKey.BUFFER_LENGTH; data: number }
  | {
      key: ChronicleMetricKey.READY_STATE
      data: HTMLMediaElement["readyState"]
    }
  | { key: ChronicleMetricKey.CDNS_AVAILABLE; data: string[] }
  | { key: ChronicleMetricKey.CURRENT_URL; data: string }
  | { key: ChronicleMetricKey.DURATION; data: number }
  | { key: ChronicleMetricKey.FRAMES_DROPPED; data: number }
  | { key: ChronicleMetricKey.INITIAL_PLAYBACK_TIME; data: number }
  | { key: ChronicleMetricKey.PAUSED; data: HTMLMediaElement["paused"] }
  | { key: ChronicleMetricKey.REPRESENTATION_AUDIO; data: { qualityIndex: number; bitrate: number } }
  | { key: ChronicleMetricKey.REPRESENTATION_VIDEO; data: { qualityIndex: number; bitrate: number } }
  | { key: ChronicleMetricKey.SEEKABLE_RANGE; data: { start: number; end: number } }
  | { key: ChronicleMetricKey.SEEKING; data: HTMLMediaElement["seeking"] }
  | { key: ChronicleMetricKey.STRATEGY; data: string }
  | { key: ChronicleMetricKey.SUBTITLE_CDNS_AVAILABLE; data: string[] }
  | { key: ChronicleMetricKey.SUBTITLE_CURRENT_URL; data: string }
  | { key: ChronicleMetricKey.VERSION; data: string }
)

type ChronicleMetricDataForKey<Key extends ChronicleMetricKey> = Extract<ChronicleMetric, { key: Key }>["data"]

function testExtract<Key extends ChronicleMetricKey>(_key: Key): ChronicleMetricDataForKey<Key> {
  return undefined as any as ChronicleMetricDataForKey<Key>
}

function _testExtractConsume<Key extends ChronicleMetricKey>(_key: Key) {
  testExtract(ChronicleMetricKey.REPRESENTATION_AUDIO)
}

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

type ChronicleUpdateCallback = (chronicle: ChronicleLog[]) => void

class Chronicle {
  static TYPES = TYPES

  private updateCallbacks: ChronicleUpdateCallback[] = []
  private chronicle: ChronicleLog[] = []
  private firstTimeElement: boolean = true
  private compressTime: boolean = false

  private updates() {
    const chronicleSoFar = this.retrieve()
    this.updateCallbacks.forEach((callback) => callback(chronicleSoFar))
  }

  public getElementTime() {
    return 0
  }

  public setElementTime(_seconds: number) {
    // stubbed
  }

  public pushMetric<Metric extends ChronicleMetric>(_key: Metric["key"], _value: Metric["data"]) {
    // stubbed
  }

  public getLatestMetric<Metric extends ChronicleMetric>(_key: Metric["key"]): Metric {
    return null as unknown as Metric
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

  public info(message: object | string) {
    this.pushToChronicle({ type: TYPES.INFO, message })
  }

  public verbose(message: object | string) {
    this.info(message)
  }

  public error(err: Error) {
    this.pushToChronicle({ type: TYPES.ERROR, error: err })
  }

  public warn(warning: object | string) {
    this.pushToChronicle({ type: TYPES.WARNING, warning })
  }

  public event(event: object | string) {
    this.pushToChronicle({ type: TYPES.EVENT, event })
  }

  public apicall(callType: string) {
    this.pushToChronicle({ type: TYPES.APICALL, calltype: callType })
  }

  public time(time: number) {
    if (this.firstTimeElement) {
      this.pushToChronicle({ type: TYPES.TIME, currentTime: time })
      this.firstTimeElement = false
    } else if (this.compressTime) {
      const lastElement = this.chronicle.pop()

      lastElement!.currentTime = time
      this.pushToChronicle(lastElement!)
    } else {
      this.pushToChronicle({ type: TYPES.TIME, currentTime: time })
      this.compressTime = true
    }
  }

  public keyValue(obj: object) {
    this.pushToChronicle({ type: TYPES.KEYVALUE, keyvalue: obj })
  }

  public retrieve() {
    return [...this.chronicle]
  }

  public timestamp(obj: ChronicleLog) {
    obj.timestamp = Date.now()
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
}

export default Chronicle
