import Chronicle from "./chronicle.ts"
import DebugFormatter from "./debugformatter.js"
import DebugView from "./debugview"

function DebugTool() {
  const presenter = DebugFormatter
  let chronicle = new Chronicle()

  const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    VERBOSE: 3,
  }

  let visible = false
  let logLevel = LOG_LEVELS.INFO
  let staticFieldValues = {}

  let rootElement, view

  function toggleVisibility() {
    if (visible) {
      hide()
    } else {
      show()
    }
  }

  function setLogLevel(newLogLevel) {
    if (newLogLevel !== undefined) {
      logLevel = newLogLevel
    }
  }

  function show() {
    view = DebugView
    view.setRootElement(rootElement)
    view.init()
    presenter.init(view)
    presenter.update(chronicle.retrieve())
    chronicle.registerForUpdates(presenter.update)
    visible = true
  }

  function hide() {
    view.tearDown()
    chronicle.unregisterForUpdates(presenter.update)
    visible = false
  }

  function info(log) {
    if (logLevel >= LOG_LEVELS.INFO) {
      chronicle.info(log)
    }
  }

  function event(log) {
    if (logLevel >= LOG_LEVELS.INFO) {
      chronicle.event(log)
    }
  }

  function time(log) {
    if (logLevel >= LOG_LEVELS.INFO) {
      chronicle.time(log)
    }
  }

  function error(log) {
    if (logLevel < LOG_LEVELS.ERROR) {
      return
    }

    const error = typeof log === "object" && log.message ? log : new Error(log)

    chronicle.error(error)
  }

  function warn(log) {
    if (logLevel < LOG_LEVELS.WARN) {
      return
    }

    chronicle.warn(log)
  }

  function verbose(log) {
    if (logLevel >= LOG_LEVELS.VERBOSE) {
      chronicle.verbose(log)
    }
  }

  function updateKeyValue(message) {
    const staticFieldValue = staticFieldValues[message.key]

    if (staticFieldValue) {
      const entry = chronicle.retrieve()[staticFieldValue.index]

      if (entry) {
        entry.keyvalue = message
      }
    } else {
      staticFieldValues[message.key] = { value: message.value, index: chronicle.retrieve().length }
      chronicle.keyValue(message)
    }
  }

  function setRootElement(element) {
    rootElement = element
  }

  function tearDown() {
    staticFieldValues = {}
    chronicle = new Chronicle()
    if (visible) {
      hide()
    }
  }

  return {
    logLevels: LOG_LEVELS,
    error,
    event,
    info,
    setLogLevel,
    setRootElement,
    tearDown,
    time,
    toggleVisibility,
    verbose,
    warn,
    keyValue: updateKeyValue,
    apicall: (...args) => chronicle.apicall(...args),
    getDebugLogs: () => chronicle.retrieve(),
  }
}

const DebugToolInstance = DebugTool()

export default DebugToolInstance
