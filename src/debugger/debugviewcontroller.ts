import { MediaState } from "../models/mediastate"
import getValues from "../utils/get-values"
import { Extends } from "../utils/types"
import {
  EntryCategory,
  Message,
  MetricForKind,
  MetricKind,
  Timestamped,
  TimestampedEntry,
  TimestampedMessage,
  TimestampedMetric,
  TimestampedTrace,
} from "./chronicle"
import DebugView from "./debugview"

type InvertedMediaState = { [Key in keyof typeof MediaState as (typeof MediaState)[Key]]: Key }

const invertedMediaState: InvertedMediaState = {
  0: "STOPPED",
  1: "PAUSED",
  2: "PLAYING",
  4: "WAITING",
  5: "ENDED",
  6: "FATAL_ERROR",
} as const

const DYNAMIC_ENTRY_LIMIT = 29 as const

type Timestamp = Timestamped<{ category: "time" }>

type MetricUnion<UnionKind extends string, MergedKind extends MetricKind> = {
  category: "union"
  kind: UnionKind
  data: { [Kind in MergedKind]?: MetricForKind<Kind>["data"] }
}

type MediaStateMetrics = Extends<MetricKind, "ended" | "paused" | "ready-state" | "seeking">
type MediaStateUnion = MetricUnion<"media-element-state", MediaStateMetrics>

type DynamicEntry = TimestampedMessage | TimestampedTrace | Timestamp

type StaticEntry = TimestampedMetric | Timestamped<MediaStateUnion>
type StaticEntryKind = StaticEntry["kind"]
type StaticEntryForKind<Kind extends StaticEntryKind> = Extract<StaticEntry, { kind: Kind }>

type FilterPredicate = (entry: TimestampedEntry) => boolean

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

class DebugViewController {
  public isVisible: boolean = false

  private rootElement: HTMLElement
  private shouldRender: boolean = false
  private renderInterval: ReturnType<typeof setInterval>
  private filters: FilterPredicate[] = []

  private dynamicEntries: DynamicEntry[] = []
  private latestMetricByKey: Partial<Record<StaticEntryKind, StaticEntry>> = {}

  private isMerged(metric: TimestampedMetric): metric is Timestamped<MetricForKind<MediaStateMetrics>> {
    const { kind } = metric
    const mediaStateMetrics = ["ended", "paused", "ready-state", "seeking"]

    return mediaStateMetrics.includes(kind)
  }

  private mergeMediaState<Kind extends MediaStateMetrics>(
    entry: Timestamped<MetricForKind<Kind>>
  ): Timestamped<MediaStateUnion> {
    const prevData =
      this.latestMetricByKey["media-element-state"] == null
        ? {}
        : (this.latestMetricByKey["media-element-state"] as StaticEntryForKind<"media-element-state">).data

    const { kind, data } = entry as TimestampedMetric

    return {
      ...entry,
      category: "union",
      kind: "media-element-state",
      data: { ...prevData, [kind]: data },
    }
  }

  private cacheEntry(entry: TimestampedEntry): void {
    switch (entry.category) {
      case EntryCategory.METRIC:
        return this.cacheStaticEntry(this.isMerged(entry) ? this.mergeMediaState(entry) : entry)

      case EntryCategory.MESSAGE:
      case EntryCategory.TRACE:
        this.cacheDynamicEntry(entry)

        if (this.dynamicEntries.length >= DYNAMIC_ENTRY_LIMIT) {
          this.dynamicEntries = this.dynamicEntries.slice(-DYNAMIC_ENTRY_LIMIT)
        }

        return

      default:
        throw new TypeError("Unrecognised entry type")
    }
  }

  private cacheStaticEntry(entry: StaticEntry): void {
    const latestSessionTimeSoFar = this.latestMetricByKey[entry.kind]?.sessionTime

    if (typeof latestSessionTimeSoFar === "number" && latestSessionTimeSoFar > entry.sessionTime) {
      return
    }

    this.latestMetricByKey[entry.kind] = entry
  }

  private cacheDynamicEntry(entry: DynamicEntry): void {
    if (entry.category === "time") {
      this.cacheTimestamp(entry)

      return
    }

    this.dynamicEntries.push(entry)
  }

  private cacheTimestamp(entry: Timestamp): void {
    const lastDynamicEntry = this.dynamicEntries[this.dynamicEntries.length - 1]

    if (lastDynamicEntry == null || lastDynamicEntry.category !== "time") {
      this.dynamicEntries.push(entry)

      return
    }

    this.dynamicEntries[this.dynamicEntries.length - 1] = entry
  }

  private serialiseDynamicEntry(entry: DynamicEntry): string {
    let formattedData: string

    const { category } = entry

    switch (category) {
      case EntryCategory.MESSAGE:
        formattedData = this.serialiseMessage(entry)
        break

      case "time":
        formattedData = this.serialiseTime(entry)
        break

      case EntryCategory.TRACE:
        formattedData = this.serialiseTrace(entry)
        break

      default:
        throw new TypeError(`Unrecognised Entry Category: ${category}`)
    }

    const sessionTime = new Date(entry.sessionTime)
    const formatedSessionTime = `${formatDate(sessionTime)}.${zeroPadMs(sessionTime.getUTCMilliseconds())}`

    return `${formatedSessionTime} - ${formattedData}`
  }

  private serialiseMessage(message: Message): string {
    const { kind, data } = message

    switch (kind) {
      case "debug":
        return `Debug: ${data}`

      case "info":
        return `Info: ${data}`

      case "warning":
        return `Warning: ${data}`

      default:
        throw new TypeError(`Unrecognised message level '${kind}'`)
    }
  }

  private serialiseTime(time: Timestamp): string {
    const { currentElementTime } = time

    return `Video time: ${currentElementTime.toFixed(2)}`
  }

  private serialiseTrace(trace: TimestampedTrace): string {
    const { currentElementTime, kind, data } = trace
    switch (kind) {
      case "buffered-ranges": {
        const buffered = data.buffered.map(([start, end]) => `${start.toFixed(2)} - ${end.toFixed(2)}`).join(", ")

        return `Buffered ${data.kind}: [${buffered}] at current time ${currentElementTime.toFixed(2)}`
      }
      case "error":
        return `${data.name ?? "Error"}: ${data.message}`
      case "event": {
        const { eventType, eventTarget } = data
        return `Event: '${eventType}' from ${eventTarget}`
      }
      case "session-start":
        return `Playback session started at ${new Date(data).toISOString().replace("T", " ")}`
      case "session-end":
        return `Playback session ended at ${new Date(data).toISOString().replace("T", " ")}`
      case "state-change":
        return `Event: ${invertedMediaState[data]}`
      default:
        throw new TypeError(`Unrecognised trace kind: ${kind}`)
    }
  }

  private serialiseStaticEntry(entry: StaticEntry): {
    id: string
    key: string
    value: boolean | number | string
  } {
    const { kind } = entry

    const parsedKey = kind.replace(/-/g, " ")
    const parsedValue = this.serialiseMetric(entry)

    return { id: kind, key: parsedKey, value: parsedValue }
  }

  private serialiseMetric({ kind, data }: StaticEntry): boolean | number | string {
    if (typeof data !== "object") {
      return data
    }

    if (kind === "media-element-state") {
      const parts: string[] = []
      const isWaiting = typeof data["ready-state"] === "number" && data["ready-state"] <= 2

      if (!isWaiting && !data.paused && !data.seeking) {
        parts.push("playing")
      }

      if (isWaiting) {
        parts.push("waiting")
      }

      if (data.paused) {
        parts.push("paused")
      }

      if (data.seeking) {
        parts.push("seeking")
      }

      if (data.ended) {
        parts.push("ended")
      }

      return parts.join(", ")
    }

    if (kind === "seekable-range") {
      const [start, end] = data as MetricForKind<"seekable-range">["data"]

      return `${formatDate(new Date(start))} - ${formatDate(new Date(end))}`
    }

    if (kind === "representation-audio" || kind === "representation-video") {
      const [qualityIndex, bitrate] = data

      return `${qualityIndex} (${bitrate} kbps)`
    }

    return data.join(",&nbsp;")
  }

  private render(): void {
    DebugView.render({
      static: getValues(this.latestMetricByKey).map((entry) => this.serialiseStaticEntry(entry)),
      dynamic: this.dynamicEntries.map((entry) => this.serialiseDynamicEntry(entry)),
    })
  }

  public setFilters(filters: FilterPredicate[]): void {
    this.filters = filters
  }

  public addTime({ currentElementTime, sessionTime }: { currentElementTime: number; sessionTime: number }): void {
    this.cacheTimestamp({ currentElementTime, sessionTime, category: "time" })

    this.shouldRender = true
  }

  public addEntries(entries: TimestampedEntry[]) {
    for (const entry of entries) {
      if (!this.filters.every((filter) => filter(entry))) {
        continue
      }

      this.cacheEntry(entry)
    }

    this.shouldRender = true
  }

  public hideView(): void {
    clearInterval(this.renderInterval)
    DebugView.tearDown()
    this.isVisible = false
  }

  public showView(): void {
    DebugView.setRootElement(this.rootElement)
    DebugView.init()
    this.renderInterval = setInterval(() => {
      if (this.shouldRender) {
        this.render()
        this.shouldRender = false
      }
    }, 250)
    this.isVisible = true
  }

  setRootElement(el: HTMLElement): void {
    DebugView.setRootElement(el)
  }
}

export default DebugViewController
