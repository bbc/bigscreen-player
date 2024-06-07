/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { MediaState } from "../models/mediastate"
import { MediaKinds } from "../models/mediakinds"
import Chronicle, { MetricForKind, MetricKind, TimestampedEntry, isTrace } from "./chronicle"
import DebugViewController from "./debugviewcontroller"

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const

type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]

interface DebugTool {
  init(): void
  tearDown(): void
  getDebugLogs(): TimestampedEntry[]
  setLogLevel(level: LogLevel | undefined): void
  updateElementTime(seconds: number): void
  // chronicle
  apicall(functionName: string, functionArgs: any[]): void
  buffered(kind: MediaKinds, buffered: [start: number, end: number][]): void
  debug(...parts: any[]): void
  error(...parts: any[]): void
  event(eventType: string, eventTarget?: string): void
  gap(from: number, to: number): void
  quotaExceeded(bufferLevel: number, time: number): void
  info(...parts: any[]): void
  statechange(value: MediaState): void
  warn(...parts: any[]): void
  dynamicMetric<Kind extends MetricKind>(kind: Kind, data: MetricForKind<Kind>["data"]): void
  staticMetric<Kind extends MetricKind>(key: Kind, data: MetricForKind<Kind>["data"]): void
  // view
  hide(): void
  show(): void
  setRootElement(el: HTMLElement): void
  toggleVisibility(): void
}

function shouldDisplayEntry(entry: TimestampedEntry): boolean {
  return (
    !isTrace(entry) ||
    entry.kind !== "event" ||
    entry.data.eventTarget !== "MediaElement" ||
    ["paused", "playing", "seeking", "seeked", "waiting"].includes(entry.data.eventType)
  )
}

function createDebugTool() {
  let chronicle = new Chronicle()
  let currentLogLevel: LogLevel = LogLevel.INFO
  let viewController = new DebugViewController()

  function init() {
    chronicle = new Chronicle()
    viewController = new DebugViewController()

    setViewFilter(currentLogLevel)

    chronicle.trace("session-start", Date.now())
  }

  function tearDown() {
    if (viewController.isVisible) {
      hide()
    }

    chronicle.trace("session-end", Date.now())
  }

  function getDebugLogs() {
    return chronicle.retrieve()
  }

  function setViewFilter(logLevel: LogLevel): void {
    switch (logLevel) {
      case LogLevel.DEBUG:
        viewController.setFilters([])
        break
      case LogLevel.INFO:
      case LogLevel.WARN:
      case LogLevel.ERROR:
        viewController.setFilters([shouldDisplayEntry])
    }
  }

  function setLogLevel(newLogLevel: LogLevel | undefined) {
    if (typeof newLogLevel !== "number") {
      return
    }

    setViewFilter(newLogLevel)

    currentLogLevel = newLogLevel
  }

  function setRootElement(element: HTMLElement) {
    viewController.setRootElement(element)
  }

  function updateElementTime(seconds: number) {
    chronicle.setCurrentElementTime(seconds)
  }

  function apicall(functionName: string, functionArgs: any[] = []) {
    chronicle.trace("apicall", { functionName, functionArgs })
  }

  function buffered(kind: MediaKinds, buffered: [start: number, end: number][]) {
    chronicle.trace("buffered-ranges", { kind, buffered })
  }

  function debug(...parts: any[]) {
    if (currentLogLevel < LogLevel.DEBUG) {
      return
    }

    chronicle.debug(parts.join(" "))
  }

  function error(...parts: any[]) {
    if (currentLogLevel < LogLevel.ERROR) {
      return
    }

    const data = parts.length < 2 ? parts[0] : parts.join(" ")

    chronicle.trace(
      "error",
      typeof data === "object" && "message" in data ? { name: data.name, message: data.message } : { message: data }
    )
  }

  function event(eventType: string, eventTarget = "unknown") {
    chronicle.trace("event", { eventTarget, eventType })
  }

  function gap(from: number, to: number): void {
    chronicle.trace("gap", { from, to })
  }

  function quotaExceeded(bufferLevel: number, time: number): void {
    chronicle.trace("quota-exceeded", { bufferLevel, time })
  }

  function info(...parts: any[]) {
    if (currentLogLevel < LogLevel.INFO) {
      return
    }

    chronicle.info(parts.join(" "))
  }

  function statechange(value: MediaState) {
    chronicle.trace("state-change", value)
  }

  function warn(...parts: any[]) {
    if (currentLogLevel < LogLevel.WARN) {
      return
    }

    chronicle.warn(parts.join(" "))
  }

  function dynamicMetric<Kind extends MetricKind>(kind: Kind, data: MetricForKind<Kind>["data"]) {
    chronicle.appendMetric(kind, data)
  }

  function staticMetric<Kind extends MetricKind>(kind: Kind, data: MetricForKind<Kind>["data"]) {
    chronicle.setMetric(kind, data)
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
    logLevels: LogLevel,
    init,
    tearDown,
    getDebugLogs,
    setLogLevel,
    updateElementTime,
    apicall,
    buffered,
    debug,
    error,
    event,
    gap,
    quotaExceeded,
    info,
    statechange,
    warn,
    dynamicMetric,
    staticMetric,
    hide,
    show,
    setRootElement,
    toggleVisibility,
  }
}

const DebugTool = createDebugTool() satisfies DebugTool

export default DebugTool
