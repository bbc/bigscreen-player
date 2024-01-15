const TYPES = {
  APICALL: "apicall",
  ERROR: "error",
  EVENT: "event",
  INFO: "info",
  KEYVALUE: "keyvalue",
  TIME: "time",
  WARNING: "warning",
} as const

enum ChronicleEntryType {
  METRIC = "metric",
  MESSAGE = "message",
}

enum ChronicleMessageLevel {
  ERROR = "error",
  INFO = "info",
  WARNING = "warning",
  TRACE = "trace",
}

type ChronicleEntry = { type: ChronicleEntryType; sessionTime: number; currentTime: number; data: object } & (
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
)

type _ChronicleLogButElectric = ChronicleEntry[]

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

const updateCallbacks: ChronicleUpdateCallback[] = []
let chronicle: ChronicleLog[] = []
let firstTimeElement: boolean, compressTime: boolean

function init() {
  clear()
}

function clear() {
  firstTimeElement = true
  compressTime = false
  chronicle = []
}

function registerForUpdates(callback: ChronicleUpdateCallback) {
  updateCallbacks.push(callback)
}

function unregisterForUpdates(callback: ChronicleUpdateCallback) {
  const indexOf = updateCallbacks.indexOf(callback)

  if (indexOf !== -1) {
    updateCallbacks.splice(indexOf, 1)
  }
}

function info(message: object | string) {
  pushToChronicle({ type: TYPES.INFO, message })
}

function error(err: Error) {
  pushToChronicle({ type: TYPES.ERROR, error: err })
}

function warn(warning: object | string) {
  pushToChronicle({ type: TYPES.WARNING, warning })
}

function event(event: object | string) {
  pushToChronicle({ type: TYPES.EVENT, event })
}

function apicall(callType: string) {
  pushToChronicle({ type: TYPES.APICALL, calltype: callType })
}

function time(time: number) {
  if (firstTimeElement) {
    pushToChronicle({ type: TYPES.TIME, currentTime: time })
    firstTimeElement = false
  } else if (compressTime) {
    const lastElement = chronicle.pop()

    lastElement!.currentTime = time
    pushToChronicle(lastElement!)
  } else {
    pushToChronicle({ type: TYPES.TIME, currentTime: time })
    compressTime = true
  }
}

function keyValue(obj: object) {
  pushToChronicle({ type: TYPES.KEYVALUE, keyvalue: obj })
}

function retrieve() {
  return [...chronicle]
}

function timestamp(obj: ChronicleLog) {
  obj.timestamp = Date.now()
}

function pushToChronicle(obj: ChronicleLog) {
  if (obj.type !== "time") {
    firstTimeElement = true
    compressTime = false
  }

  timestamp(obj)
  chronicle.push(obj)
  updates()
}

function updates() {
  updateCallbacks.forEach((callback) => callback(retrieve()))
}

function tearDown() {
  clear()
}

export default {
  TYPES,
  init,
  clear,
  tearDown,
  apicall,
  error,
  event,
  info,
  keyValue,
  time,
  warn,
  verbose: info,
  retrieve,
  registerForUpdates,
  unregisterForUpdates,
}
