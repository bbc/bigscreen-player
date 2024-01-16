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

type ChronicleEntry =
  | ({ type: "message"; level: ChronicleMessageLevel; data: string } & (
      | { type: "message"; level: "error"; data: Error }
      | { type: "message"; level: "info"; data: string }
      | { type: "message"; level: "warning"; data: string }
      | {
          type: "message"
          level: "trace"
          data: {
            kind: "api-call"
            functionName: string
            functionParameters: any[]
          }
        }
      | {
          type: "message"
          level: "trace"
          data: {
            kind: "event"
            eventType: string
          }
        }
    ))
  | { type: "metric"; key: "auto-resume"; data: number }
  | { type: "metric"; key: "bitrate"; data: number }
  | { type: "metric"; key: "buffer-length"; data: number }
  | { type: "metric"; key: "cdns-available"; data: string[] }
  | { type: "metric"; key: "current-time"; data: HTMLMediaElement["currentTime"] }
  | { type: "metric"; key: "current-url"; data: string }
  | { type: "metric"; key: "duration"; data: number }
  | { type: "metric"; key: "frames-dropped"; data: number }
  | { type: "metric"; key: "initial-playback-time"; data: number }
  | { type: "metric"; key: "paused"; data: HTMLMediaElement["paused"] }
  | { type: "metric"; key: "ready-state"; data: HTMLMediaElement["readyState"] }
  | { type: "metric"; key: "representation-audio"; data: { qualityIndex: number; bitrate: number } }
  | { type: "metric"; key: "representation-video"; data: { qualityIndex: number; bitrate: number } }
  | { type: "metric"; key: "seekable-range"; data: { start: number; end: number } }
  | { type: "metric"; key: "seeking"; data: HTMLMediaElement["seeking"] }
  | { type: "metric"; key: "strategy"; data: string }
  | { type: "metric"; key: "subtitle-cdns-available"; data: string[] }
  | { type: "metric"; key: "subtitle-current-url"; data: string }
  | { type: "metric"; key: "version"; data: string }

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

  public pushMetric(_key: ChronicleEntry["key"], _value: ChronicleEntry["data"]) {
    // stubbed
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
