import MediaState from "../models/mediastate"
import { EntryForType, EntryType, History, Message, MetricKey, MetricValue, TimestampedEntry, Trace } from "./chronicle"
import DebugView from "./debugview"

type WrungMediaState = { [Key in keyof typeof MediaState as (typeof MediaState)[Key]]: Key }

const wrungMediaState: WrungMediaState = {
  0: "STOPPED",
  1: "PAUSED",
  2: "PLAYING",
  4: "WAITING",
  5: "ENDED",
  6: "FATAL_ERROR",
}

export interface DebugViewController {
  isVisible: boolean
  addTime({ currentElementTime, sessionTime }: { currentElementTime: number; sessionTime: number }): void
  addEntries(entries: History): void
  showView(): void
  hideView(): void
  setRootElement(el: HTMLElement): void
}

const DYNAMIC_ENTRY_LIMIT = 29 as const

type TimeEntry = { type: "time"; currentElementTime: number; sessionTime: number }

type StaticEntry = EntryForType<EntryType.METRIC>
type DynamicEntry = EntryForType<EntryType.MESSAGE | EntryType.TRACE> | TimeEntry

function zeroPadHMS(time: number): string {
  return `${time < 10 ? "0" : ""}${time}`
}

function zeroPadMs(milliseconds: number): string {
  return `${milliseconds < 100 ? "0" : ""}${milliseconds < 10 ? "0" : ""}${milliseconds}`
}

function formatDate(value: Date) {
  const hours = value.getUTCHours()
  const mins = value.getUTCMinutes()
  const secs = value.getUTCSeconds()

  return `${zeroPadHMS(hours)}:${zeroPadHMS(mins)}:${zeroPadHMS(secs)}`
}

export default class ViewController implements DebugViewController {
  public isVisible: boolean = false

  private dynamicEntriesSoFar: DynamicEntry[] = []
  private latestMetricsSoFar: Partial<Record<MetricKey, StaticEntry>> = {}
  private rootElement: HTMLElement

  private keepEntry(entry: TimestampedEntry): boolean {
    const { type } = entry

    if (type !== EntryType.TRACE) {
      return true
    }

    const { kind, data } = entry

    if (kind !== "event") {
      return true
    }

    const { eventType, eventTarget } = data

    // HACK: Filter events presented in the view
    // Not very robust, should we add typing checks to the event trace's type and target fields?
    return eventTarget === "MediaElement" && ["paused", "playing", "seeking", "seeked", "waiting"].includes(eventType)
  }

  private cacheEntry(entry: TimestampedEntry): void {
    switch (entry.type) {
      case EntryType.METRIC: {
        return this.cacheStaticEntry(entry)
      }
      case EntryType.MESSAGE:
      case EntryType.TRACE: {
        this.cacheDynamicEntry(entry)

        if (this.dynamicEntriesSoFar.length >= DYNAMIC_ENTRY_LIMIT) {
          this.dynamicEntriesSoFar = this.dynamicEntriesSoFar.slice(-DYNAMIC_ENTRY_LIMIT)
        }

        return
      }
      default: {
        throw new TypeError("Unrecognised entry type")
      }
    }
  }

  private cacheStaticEntry(entry: StaticEntry): void {
    const latestSessionTimeSoFar = this.latestMetricsSoFar[entry.key]?.sessionTime

    if (typeof latestSessionTimeSoFar === "number" && latestSessionTimeSoFar > entry.sessionTime) {
      return
    }

    this.latestMetricsSoFar[entry.key] = entry
  }

  private cacheDynamicEntry(entry: DynamicEntry): void {
    if (entry.type === "time") {
      this.cacheTimeEntry(entry)

      return
    }

    this.dynamicEntriesSoFar.push(entry)
  }

  private cacheTimeEntry(entry: TimeEntry): void {
    const lastDynamicEntry = this.dynamicEntriesSoFar[this.dynamicEntriesSoFar.length - 1]

    if (lastDynamicEntry == null || lastDynamicEntry.type !== "time") {
      this.dynamicEntriesSoFar.push(entry)

      return
    }

    this.dynamicEntriesSoFar[this.dynamicEntriesSoFar.length - 1] = entry
  }

  private serialiseDynamicEntry(entry: DynamicEntry): string {
    let formattedData: string

    const { type } = entry

    switch (type) {
      case EntryType.MESSAGE: {
        formattedData = this.serialiseMessage(entry)
        break
      }
      case "time": {
        formattedData = this.serialiseTime(entry)
        break
      }
      case EntryType.TRACE: {
        formattedData = this.serialiseTrace(entry)
        break
      }
      default: {
        throw new TypeError(`Unrecognised entry type: ${type}`)
      }
    }

    const sessionTime = new Date(entry.sessionTime)
    const formatedSessionTime = `${formatDate(sessionTime)}.${zeroPadMs(sessionTime.getUTCMilliseconds())}`

    return `${formatedSessionTime} - ${formattedData}`
  }

  private serialiseMessage(message: Message): string {
    const { level, data } = message

    switch (level) {
      case "debug": {
        return `Debug: ${data}`
      }
      case "info": {
        return `Info: ${data}`
      }
      case "warning": {
        return `Warning: ${data}`
      }
      default: {
        throw new TypeError(`Unrecognised message level '${level}'`)
      }
    }
  }

  private serialiseTime(time: TimeEntry): string {
    const { currentElementTime } = time

    return `Video time: ${currentElementTime.toFixed(2)}`
  }

  private serialiseTrace(trace: Trace): string {
    const { kind, data } = trace
    switch (kind) {
      case "error": {
        return `${data.name ?? "Error"}: ${data.message}`
      }
      case "event": {
        const { eventType, eventTarget } = data
        return `Event: '${eventType}' from ${eventTarget}`
      }
      case "state-change": {
        return `Event: ${wrungMediaState[data]}`
      }
      default: {
        throw new TypeError(`Unrecognised trace kind: ${kind}`)
      }
    }
  }

  private serialiseStaticEntry({ key, data }: StaticEntry): {
    id: string
    key: string
    value: boolean | number | string
  } {
    const parsedKey = key.replace("-", " ")
    const parsedValue = this.serialiseMetric(key, data)

    return { id: key, key: parsedKey, value: parsedValue }
  }

  private serialiseMetric(key: MetricKey, data: MetricValue): boolean | number | string {
    if (typeof data !== "object") {
      return data
    }

    if ("start" in data && "end" in data) {
      const { start, end } = data

      return `${formatDate(start)} - ${formatDate(end)}`
    }

    if ("bitrate" in data) {
      const { bitrate, qualityIndex } = data

      return `${qualityIndex} (${bitrate} kbps)`
    }

    return data.join(", ")
  }

  private render(): void {
    DebugView.render({
      static: Object.values(this.latestMetricsSoFar).map((entry) => this.serialiseStaticEntry(entry)),
      dynamic: this.dynamicEntriesSoFar.map((entry) => this.serialiseDynamicEntry(entry)),
    })
  }

  public addTime({ currentElementTime, sessionTime }: { currentElementTime: number; sessionTime: number }): void {
    this.cacheTimeEntry({ currentElementTime, sessionTime, type: "time" })

    this.render()
  }

  public addEntries(entries: History) {
    for (const entry of entries) {
      if (!this.keepEntry(entry)) {
        continue
      }

      this.cacheEntry(entry)
    }

    this.render()
  }

  public hideView(): void {
    DebugView.tearDown()
    this.isVisible = false
  }

  public showView(): void {
    DebugView.setRootElement(this.rootElement)
    DebugView.init()
    this.isVisible = true
  }

  setRootElement(el: HTMLElement): void {
    DebugView.setRootElement(el)
  }
}
