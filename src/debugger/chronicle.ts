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

type ChronicleMetric = { type: ChronicleEntryType.METRIC } & (
  | { key: "auto-resume"; data: number }
  | { key: "bitrate"; data: number }
  | { key: "buffer-length"; data: number }
  | {
      key: "ready-state"
      data: HTMLMediaElement["readyState"]
    }
  | { key: "buffer-length"; data: number }
  | { key: "cdns-available"; data: string[] }
  | { key: "current-url"; data: string }
  | { key: "duration"; data: number }
  | { key: "frames-dropped"; data: number }
  | { key: "initial-playback-time"; data: number }
  | { key: "paused"; data: HTMLMediaElement["paused"] }
  | { key: "ready-state"; data: HTMLMediaElement["readyState"] }
  | { key: "representation-audio"; data: { qualityIndex: number; bitrate: number } }
  | { key: "representation-video"; data: { qualityIndex: number; bitrate: number } }
  | { key: "seekable-range"; data: { start: number; end: number } }
  | { key: "seeking"; data: HTMLMediaElement["seeking"] }
  | { key: "strategy"; data: string }
  | { key: "subtitle-cdns-available"; data: string[] }
  | { key: "subtitle-current-url"; data: string }
  | { key: "version"; data: string }
)

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
