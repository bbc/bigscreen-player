const TYPES = {
  APICALL: "apicall",
  ERROR: "error",
  EVENT: "event",
  INFO: "info",
  KEYVALUE: "keyvalue",
  TIME: "time",
  WARNING: "warning",
} as const

type Message = { level: string } & (
  | { level: "error"; error: Error }
  | { level: "info"; body: string }
  | { level: "warning"; body: string }
  | {
      level: "trace"
      kind: "api-call"
      functionName: string
      functionParameters: any[]
    }
  | { level: "trace"; kind: "event"; eventType: string }
)

type Metric = { key: string; value: object | string | number } & (
  | { key: "auto-resume"; value: number }
  | { key: "bitrate"; value: number }
  | { key: "buffer-length"; value: number }
  | { key: "cdns-available"; value: string[] }
  | { key: "current-time"; value: HTMLMediaElement["currentTime"] }
  | { key: "current-url"; value: string }
  | { key: "duration"; value: number }
  | { key: "frames-dropped"; value: number }
  | { key: "initial-playback-time"; value: number }
  | { key: "paused"; value: HTMLMediaElement["paused"] }
  | { key: "ready-state"; value: HTMLMediaElement["readyState"] }
  | { key: "representation-audio"; value: { qualityIndex: number; bitrate: number } }
  | { key: "representation-video"; value: { qualityIndex: number; bitrate: number } }
  | { key: "seekable-range"; value: { start: number; end: number } }
  | { key: "seeking"; value: HTMLMediaElement["seeking"] }
  | { key: "strategy"; value: string }
  | { key: "subtitle-cdns-available"; value: string[] }
  | { key: "subtitle-current-url"; value: string }
  | { key: "version"; value: string }
)

type ChronicleEntry = { data: object; sessionTime: number; currentTime: number; type: string } & (
  | { type: "metric"; data: Metric }
  | { type: "message"; data: Message }
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
