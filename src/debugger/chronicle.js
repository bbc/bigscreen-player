const updateCallbacks = []
let chronicle = []
let firstTimeElement, compressTime

const TYPES = {
  APICALL: "apicall",
  ERROR: "error",
  EVENT: "event",
  INFO: "info",
  KEYVALUE: "keyvalue",
  TIME: "time",
  WARNING: "warning",
}

function init() {
  clear()
}

function clear() {
  firstTimeElement = true
  compressTime = false
  chronicle = []
}

function registerForUpdates(callback) {
  updateCallbacks.push(callback)
}

function unregisterForUpdates(callback) {
  const indexOf = updateCallbacks.indexOf(callback)

  if (indexOf !== -1) {
    updateCallbacks.splice(indexOf, 1)
  }
}

function info(message) {
  pushToChronicle({ type: TYPES.INFO, message })
}

/** @param {Error} err */
function error(err) {
  pushToChronicle({ type: TYPES.ERROR, error: err })
}

function warn(warning) {
  pushToChronicle({ type: TYPES.WARNING, warning })
}

function event(event) {
  pushToChronicle({ type: TYPES.EVENT, event })
}

function apicall(callType) {
  pushToChronicle({ type: TYPES.APICALL, calltype: callType })
}

function time(time) {
  if (firstTimeElement) {
    pushToChronicle({ type: TYPES.TIME, currentTime: time })
    firstTimeElement = false
  } else if (!compressTime) {
    pushToChronicle({ type: TYPES.TIME, currentTime: time })
    compressTime = true
  } else {
    const lastElement = chronicle.pop()

    lastElement.currentTime = time
    pushToChronicle(lastElement)
  }
}

function keyValue(obj) {
  pushToChronicle({ type: TYPES.KEYVALUE, keyvalue: obj })
}

function retrieve() {
  return [...chronicle]
}

function timestamp(obj) {
  obj.timestamp = Date.now()
}

function pushToChronicle(obj) {
  if (obj.type !== TYPES.TIME) {
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
