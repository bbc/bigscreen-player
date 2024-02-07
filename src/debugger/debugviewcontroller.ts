import { MediaState } from "../models/mediastate"
import getValues from "../utils/get-values"
import { Extends } from "../utils/types"
import {
  EntryType,
  History,
  Message,
  MetricForKey,
  MetricKey,
  Timestamped,
  TimestampedEntry,
  TimestampedMessage,
  TimestampedMetric,
  TimestampedTrace,
  Trace,
} from "./chronicle"
import DebugView from "./debugview"

type WrungMediaState = { [Key in keyof typeof MediaState as (typeof MediaState)[Key]]: Key }

const wrungMediaState: WrungMediaState = {
  0: "STOPPED",
  1: "PAUSED",
  2: "PLAYING",
  4: "WAITING",
  5: "ENDED",
  6: "FATAL_ERROR",
} as const

const DYNAMIC_ENTRY_LIMIT = 29 as const

type Timestamp = Timestamped<{ type: "time" }>

type MetricUnion<UnionKey extends string, MergedKeys extends MetricKey> = {
  type: "union"
  key: UnionKey
  data: { [Key in MergedKeys]?: MetricForKey<Key>["data"] }
}

type MediaStateMetrics = Extends<MetricKey, "ended" | "paused" | "ready-state" | "seeking">
type MediaStateUnion = MetricUnion<"media-element-state", MediaStateMetrics>

type DynamicEntry = TimestampedMessage | TimestampedTrace | Timestamp

type StaticEntry = TimestampedMetric | Timestamped<MediaStateUnion>
type StaticEntryKey = StaticEntry["key"]
type StaticEntryForKey<Key extends StaticEntryKey> = Extract<StaticEntry, { key: Key }>

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

  private dynamicEntries: DynamicEntry[] = []
  private latestMetricByKey: Partial<Record<StaticEntryKey, StaticEntry>> = {}

  private shouldRender: boolean = false
  private renderInterval = setInterval(() => {
    if (this.shouldRender) {
      this.render()
      this.shouldRender = false
    }
  }, 250)

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

  private isMerged(metric: TimestampedMetric): metric is Timestamped<MetricForKey<MediaStateMetrics>> {
    const { key } = metric
    const mediaStateMetrics = ["ended", "paused", "ready-state", "seeking"]

    return mediaStateMetrics.includes(key)
  }

  private mergeMediaState<Key extends MediaStateMetrics>(
    entry: Timestamped<MetricForKey<Key>>
  ): Timestamped<MediaStateUnion> {
    const prevData =
      this.latestMetricByKey["media-element-state"] == null
        ? {}
        : (this.latestMetricByKey["media-element-state"] as StaticEntryForKey<"media-element-state">).data

    const { key, data } = entry

    return {
      ...entry,
      type: "union",
      key: "media-element-state",
      data: { ...prevData, [key]: data },
    }
  }

  private cacheEntry(entry: TimestampedEntry): void {
    switch (entry.type) {
      case EntryType.METRIC: {
        return this.cacheStaticEntry(this.isMerged(entry) ? this.mergeMediaState(entry) : entry)
      }
      case EntryType.MESSAGE:
      case EntryType.TRACE: {
        this.cacheDynamicEntry(entry)

        if (this.dynamicEntries.length >= DYNAMIC_ENTRY_LIMIT) {
          this.dynamicEntries = this.dynamicEntries.slice(-DYNAMIC_ENTRY_LIMIT)
        }

        return
      }
      default: {
        throw new TypeError("Unrecognised entry type")
      }
    }
  }

  private cacheStaticEntry(entry: StaticEntry): void {
    const latestSessionTimeSoFar = this.latestMetricByKey[entry.key]?.sessionTime

    if (typeof latestSessionTimeSoFar === "number" && latestSessionTimeSoFar > entry.sessionTime) {
      return
    }

    this.latestMetricByKey[entry.key] = entry
  }

  private cacheDynamicEntry(entry: DynamicEntry): void {
    if (entry.type === "time") {
      this.cacheTimestamp(entry)

      return
    }

    this.dynamicEntries.push(entry)
  }

  private cacheTimestamp(entry: Timestamp): void {
    const lastDynamicEntry = this.dynamicEntries[this.dynamicEntries.length - 1]

    if (lastDynamicEntry == null || lastDynamicEntry.type !== "time") {
      this.dynamicEntries.push(entry)

      return
    }

    this.dynamicEntries[this.dynamicEntries.length - 1] = entry
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

  private serialiseTime(time: Timestamp): string {
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
      case "session-start": {
        return `Playback session started at ${data.toISOString().replace("T", " ")}`
      }
      case "session-end": {
        return `Playback session ended at ${data.toISOString().replace("T", " ")}`
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

  private serialiseMetric<Key extends StaticEntryKey>(
    key: Key,
    data: StaticEntryForKey<Key>["data"]
  ): boolean | number | string {
    if (typeof data !== "object") {
      return data
    }

    if (!("length" in data)) {
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

    if (key === "seekable-range") {
      const [start, end] = data as MetricForKey<"seekable-range">["data"]

      return `${formatDate(new Date(start))} - ${formatDate(new Date(end))}`
    }

    if (key === "representation-audio" || key === "representation-video") {
      const [qualityIndex, bitrate] = data

      return `${qualityIndex} (${bitrate} kbps)`
    }

    return data.join(", ")
  }

  private render(): void {
    DebugView.render({
      static: getValues(this.latestMetricByKey).map((entry) => this.serialiseStaticEntry(entry)),
      dynamic: this.dynamicEntries.map((entry) => this.serialiseDynamicEntry(entry)),
    })
  }

  public addTime({ currentElementTime, sessionTime }: { currentElementTime: number; sessionTime: number }): void {
    this.cacheTimestamp({ currentElementTime, sessionTime, type: "time" })

    this.shouldRender = true
  }

  public addEntries(entries: History) {
    for (const entry of entries) {
      if (!this.keepEntry(entry)) {
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
