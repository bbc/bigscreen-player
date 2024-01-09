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
