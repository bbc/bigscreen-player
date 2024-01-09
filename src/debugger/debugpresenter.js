import MediaState from "../models/mediastate"
import Chronicle from "./chronicle.ts"

let view

function init(newView) {
  view = newView
}

function update(logs) {
  view.render({ static: parseStaticFields(logs), dynamic: parseDynamicFields(logs) })
}

function isStaticLog(log) {
  return log.type === Chronicle.TYPES.KEYVALUE
}

function parseStaticFields(logs) {
  const latestStaticFields = []
  const staticFields = logs.filter((log) => isStaticLog(log))

  const uniqueKeys = findUniqueKeys(staticFields)
  uniqueKeys.forEach((key) => {
    const matchingStaticLogs = staticFields.filter((log) => log.keyvalue.key === key)

    latestStaticFields.push(matchingStaticLogs.pop())
  })

  return latestStaticFields.map((field) => ({
    key: sanitiseKeyString(field.keyvalue.key),
    value: sanitiseValueString(field.keyvalue.value),
  }))
}

function parseByType(log) {
  const dateString = new Date(log.timestamp).toISOString()

  switch (log.type) {
    case Chronicle.TYPES.INFO: {
      return `${dateString} - Info: ${log.message}`
    }
    case Chronicle.TYPES.TIME: {
      return `${dateString} - Video time: ${parseFloat(log.currentTime).toFixed(2)}`
    }
    case Chronicle.TYPES.EVENT: {
      return `${dateString} - Event: ${convertToReadableEvent(log.event.state)}`
    }
    case Chronicle.TYPES.ERROR: {
      return `${dateString} - ${log.error.name ?? "Error"}: ${log.error.message}`
    }
    case Chronicle.TYPES.APICALL: {
      return `${dateString} - Api call: ${log.calltype}`
    }
    case Chronicle.TYPES.WARNING: {
      return `${dateString} - Warning: ${log.warning}`
    }
    default: {
      return `${dateString} - Unknown log format`
    }
  }
}

function parseDynamicFields(logs) {
  return logs.filter((log) => !isStaticLog(log)).map((log) => parseByType(log))
}

function findUniqueKeys(logs) {
  const uniqueKeys = []

  logs.forEach((log) => {
    if (uniqueKeys.indexOf(log.keyvalue.key) === -1) {
      uniqueKeys.push(log.keyvalue.key)
    }
  })

  return uniqueKeys
}

function sanitiseKeyString(key) {
  return key.replace(/([A-Z])/g, " $1").toLowerCase()
}

function sanitiseValueString(value) {
  if (value instanceof Date) {
    const hours = zeroPadTimeUnits(value.getHours()) + value.getHours()
    const mins = zeroPadTimeUnits(value.getMinutes()) + value.getMinutes()
    const secs = zeroPadTimeUnits(value.getSeconds()) + value.getSeconds()

    return `${hours}:${mins}:${secs}`
  }

  return value
}

function zeroPadTimeUnits(unit) {
  return unit < 10 ? "0" : ""
}

function convertToReadableEvent(type) {
  for (const key in MediaState) {
    if (MediaState[key] === type) {
      return key
    }
  }

  return type
}

export default {
  init,
  update,
}
