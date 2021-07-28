import Chronicle from './chronicle'
import DebugPresenter from './debugpresenter'
import DebugView from './debugview'

function DebugTool () {
  var rootElement
  var presenter = DebugPresenter
  var view
  var visible = false

  var LOG_LEVELS = {
    ERROR: 0,
    INFO: 2,
    VERBOSE: 3
  }

  var logLevel = LOG_LEVELS.INFO

  var staticFieldValues = {}

  function toggleVisibility () {
    if (visible) {
      hide()
    } else {
      show()
    }
  }

  function setLogLevel (newLogLevel) {
    if (newLogLevel !== undefined) {
      logLevel = newLogLevel
    }
  }

  function show () {
    view = DebugView
    view.setRootElement(rootElement)
    view.init()
    presenter.init(view)
    presenter.update(Chronicle.retrieve())
    Chronicle.registerForUpdates(presenter.update)
    visible = true
  }

  function hide () {
    view.tearDown()
    Chronicle.unregisterForUpdates(presenter.update)
    visible = false
  }

  function info (log) {
    if (logLevel >= LOG_LEVELS.INFO) {
      Chronicle.info(log)
    }
  }

  function event (log) {
    if (logLevel >= LOG_LEVELS.INFO) {
      Chronicle.event(log)
    }
  }

  function time (log) {
    if (logLevel >= LOG_LEVELS.INFO) {
      Chronicle.time(log)
    }
  }

  function error (log) {
    if (logLevel >= LOG_LEVELS.ERROR) {
      Chronicle.error(log)
    }
  }

  function verbose (log) {
    if (logLevel >= LOG_LEVELS.VERBOSE) {
      Chronicle.verbose(log)
    }
  }

  function updateKeyValue (message) {
    var staticFieldValue = staticFieldValues[message.key]

    if (staticFieldValue) {
      var entry = Chronicle.retrieve()[staticFieldValue.index]
      if (entry) {
        entry.keyvalue = message
      }
    } else {
      staticFieldValues[message.key] = {value: message.value, index: Chronicle.retrieve().length}
      Chronicle.keyValue(message)
    }
  }

  function setRootElement (element) {
    rootElement = element
  }

  function tearDown () {
    staticFieldValues = {}
    if (visible) {
      hide()
    }
  }

  return {
    toggleVisibility: toggleVisibility,
    setRootElement: setRootElement,
    setLogLevel: setLogLevel,
    logLevels: LOG_LEVELS,
    verbose: verbose,
    info: info,
    error: error,
    event: event,
    time: time,
    apicall: Chronicle.apicall,
    keyValue: updateKeyValue,
    tearDown: tearDown
  }
}

var instance

if (instance === undefined) {
  instance = new DebugTool()
}

export default instance
