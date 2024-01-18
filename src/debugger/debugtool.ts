import Chronicle, { History, MetricForKey, MetricKey, TimestampedEntry } from "./chronicle"
import DebugViewController from "./debugviewcontroller"

export const LogLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const

type LogLevel = (typeof LogLevels)[keyof typeof LogLevels]

interface DebugTool {
  getDebugLogs(): History
  setLogLevel(level: LogLevel | undefined): void
  setRootElement(el: HTMLElement): void
  tearDown(): void
  updateElementTime(seconds: number): void
  // chronicle
  apicall(functionName: string, functionArgs: any[]): void
  debug(...parts: any[]): void
  error(...parts: any[]): void
  event(eventType: string): void
  info(...parts: any[]): void
  metric<Key extends MetricKey>(key: Key, data: MetricForKey<Key>["data"]): void
  warn(...parts: any[]): void
  // view
  hide(): void
  show(): void
  toggleVisibility(): void
}

function DebugTool() {
  const viewController = new DebugViewController()
  let chronicle = new Chronicle()
  let currentLogLevel: LogLevel = LogLevels.INFO

  function getDebugLogs() {
    return chronicle.retrieve()
  }

  function setLogLevel(newLogLevel: LogLevel | undefined) {
    if (typeof newLogLevel !== "number") {
      return
    }

    currentLogLevel = newLogLevel
  }

  function setRootElement(element: HTMLElement) {
    viewController.setRootElement(element)
  }

  function tearDown() {
    if (viewController.isVisible) {
      hide()
    }

    chronicle = new Chronicle()
    currentLogLevel = LogLevels.INFO
  }

  function updateElementTime(seconds: number) {
    chronicle.setCurrentElementTime(seconds)
  }

  function apicall(functionName: string, functionArgs: any[]) {
    debug(`Called '${functionName}' with args [${functionArgs.join(", ")}]`)
  }

  function debug(...parts: any[]) {
    if (currentLogLevel < LogLevels.DEBUG) {
      return
    }

    chronicle.debug(parts.join(" "))
  }

  function error(...parts: any[]) {
    if (currentLogLevel < LogLevels.ERROR) {
      return
    }

    if (parts.length === 1) {
      const data = parts[0]

      chronicle.error(typeof data === "object" && "message" in data ? data : new Error(data))
      return
    }

    chronicle.error(new Error(parts.join(" ")))
  }

  function event(eventType: string, eventTarget?: string) {
    chronicle.event(eventType, eventTarget ?? "unknown")
  }

  function info(...parts: any[]) {
    if (currentLogLevel < LogLevels.INFO) {
      return
    }

    chronicle.info(parts.join(" "))
  }

  function warn(...parts: any[]) {
    if (currentLogLevel < LogLevels.WARN) {
      return
    }

    chronicle.warn(parts.join(" "))
  }

  function metric<Key extends MetricKey>(key: Key, data: MetricForKey<Key>["data"]) {
    chronicle.pushMetric(key, data)
  }

  function handleHistoryUpdate(change: TimestampedEntry) {
    viewController.addEntries([change])
  }

  function handleTimeUpdate(seconds: number) {
    viewController.addTime({ currentElementTime: seconds, sessionTime: chronicle.getSessionTime() })
  }

  function hide() {
    viewController.hideView()

    chronicle.off("update", handleHistoryUpdate)
    chronicle.off("timeupdate", handleTimeUpdate)
  }

  function show() {
    viewController.showView()

    viewController.addEntries(chronicle.retrieve())

    viewController.addTime({
      currentElementTime: chronicle.getCurrentElementTime(),
      sessionTime: chronicle.getSessionTime(),
    })

    chronicle.on("update", handleHistoryUpdate)
    chronicle.on("timeupdate", handleTimeUpdate)
  }

  function toggleVisibility() {
    const toggle = viewController.isVisible ? hide : show

    toggle()
  }

  return {
    logLevels: LogLevels,
    getDebugLogs,
    setLogLevel,
    setRootElement,
    tearDown,
    updateElementTime,
    apicall,
    debug,
    error,
    event,
    info,
    warn,
    metric,
    hide,
    show,
    toggleVisibility,
  }
}

const DebugToolInstance = DebugTool() satisfies DebugTool

export default DebugToolInstance
