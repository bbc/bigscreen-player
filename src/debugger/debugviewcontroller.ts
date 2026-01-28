import { MediaKinds } from "../models/mediakinds"
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

type MediaElementStateKind = Extends<MetricKind, "ended" | "paused" | "playback-rate" | "ready-state" | "seeking">

type MediaElementState = {
  category: "union"
  kind: "media-element-state"
  data: { [State in MediaElementStateKind]?: MetricForKind<State>["data"] }
}

type VideoQualityKind = Extends<MetricKind, "video-download-quality" | "video-max-quality" | "video-playback-quality">
type AudioQualityKind = Extends<MetricKind, "audio-download-quality" | "audio-max-quality" | "audio-playback-quality">

type VideoQuality = {
  category: "union"
  kind: "video-quality"
  data: {
    max?: [qualityIndex: number, bitrate: number]
    download?: [qualityIndex: number, bitrate: number]
    playback?: [qualityIndex: number, bitrate: number]
  }
}

type AudioQuality = {
  category: "union"
  kind: "audio-quality"
  data: {
    max?: [qualityIndex: number, bitrate: number]
    download?: [qualityIndex: number, bitrate: number]
    playback?: [qualityIndex: number, bitrate: number]
  }
}

type MaxBitrate = {
  category: "union"
  kind: "max-bitrate"
  data: Record<MediaKinds, number>
}

type FrameKind = Extends<MetricKind, "frames-dropped" | "frames-total">

type Frames = {
  category: "union"
  kind: "frames"
  data: {
    total?: number
    dropped?: number
  }
}

type DynamicEntry = TimestampedMessage | TimestampedTrace | Timestamp

type StaticEntry =
  | Exclude<TimestampedMetric, MetricForKind<MediaElementStateKind | AudioQualityKind | VideoQualityKind>>
  | Timestamped<Frames>
  | Timestamped<MediaElementState>
  | Timestamped<AudioQuality>
  | Timestamped<VideoQuality>
  | Timestamped<MaxBitrate>

type StaticEntryKind = StaticEntry["kind"]

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

  private isFrameStat(metric: TimestampedMetric): metric is Timestamped<MetricForKind<FrameKind>> {
    const { kind } = metric
    return kind === "frames-dropped" || kind === "frames-total"
  }

  private mergeFrameStat(entry: Timestamped<MetricForKind<FrameKind>>): Timestamped<Frames> {
    const prevEntry: Frames =
      this.latestMetricByKey.frames == null
        ? { category: "union", kind: "frames", data: {} }
        : (this.latestMetricByKey.frames as Frames)

    const { sessionTime, currentElementTime, kind: metricKind, data: metricData } = entry

    const keyForKind: Record<FrameKind, string> = {
      "frames-dropped": "dropped",
      "frames-total": "total",
    }

    return {
      ...prevEntry,
      sessionTime,
      currentElementTime,
      data: { ...prevEntry.data, [keyForKind[metricKind]]: metricData },
    }
  }

  private isMediaState(metric: TimestampedMetric): metric is Timestamped<MetricForKind<MediaElementStateKind>> {
    const { kind } = metric
    const mediaStateMetrics = ["ended", "paused", "playback-rate", "ready-state", "seeking"]

    return mediaStateMetrics.includes(kind)
  }

  private mergeMediaState(entry: Timestamped<MetricForKind<MediaElementStateKind>>): Timestamped<MediaElementState> {
    const prevEntry: MediaElementState =
      this.latestMetricByKey["media-element-state"] == null
        ? { category: "union", kind: "media-element-state", data: {} }
        : (this.latestMetricByKey["media-element-state"] as MediaElementState)

    const { sessionTime, currentElementTime, kind: metricKind, data: metricData } = entry

    return {
      ...prevEntry,
      sessionTime,
      currentElementTime,
      data: { ...prevEntry.data, [metricKind]: metricData },
    }
  }

  private isAudioQuality(metric: TimestampedMetric): metric is Timestamped<MetricForKind<AudioQualityKind>> {
    const { kind } = metric

    return ["audio-max-quality", "audio-download-quality", "audio-playback-quality"].includes(kind)
  }

  private isVideoQuality(metric: TimestampedMetric): metric is Timestamped<MetricForKind<VideoQualityKind>> {
    const { kind } = metric

    return ["video-max-quality", "video-download-quality", "video-playback-quality"].includes(kind)
  }

  private mergeVideoQuality(entry: Timestamped<MetricForKind<VideoQualityKind>>): Timestamped<VideoQuality> {
    const { sessionTime, currentElementTime, kind: metricKind, data: metricData } = entry

    const prevEntry: VideoQuality =
      this.latestMetricByKey["video-quality"] == null
        ? { category: "union", kind: "video-quality", data: {} }
        : (this.latestMetricByKey["video-quality"] as VideoQuality)

    const keyForKind: Record<VideoQualityKind, string> = {
      "video-max-quality": "max",
      "video-download-quality": "download",
      "video-playback-quality": "playback",
    }

    return {
      ...prevEntry,
      sessionTime,
      currentElementTime,
      data: { ...prevEntry.data, [keyForKind[metricKind]]: metricData },
    }
  }

  private mergeAudioQuality(entry: Timestamped<MetricForKind<AudioQualityKind>>): Timestamped<AudioQuality> {
    const { sessionTime, currentElementTime, kind: metricKind, data: metricData } = entry

    const prevEntry: AudioQuality =
      this.latestMetricByKey["audio-quality"] == null
        ? { category: "union", kind: "audio-quality", data: {} }
        : (this.latestMetricByKey["audio-quality"] as AudioQuality)

    const keyForKind: Record<AudioQualityKind, string> = {
      "audio-max-quality": "max",
      "audio-download-quality": "download",
      "audio-playback-quality": "playback",
    }

    return {
      ...prevEntry,
      sessionTime,
      currentElementTime,
      data: { ...prevEntry.data, [keyForKind[metricKind]]: metricData },
    }
  }

  private mergeMaxBitrate(
    entry: Timestamped<MetricForKind<"audio-max-quality" | "video-max-quality">>
  ): Timestamped<MaxBitrate> {
    const {
      sessionTime,
      currentElementTime,
      kind: metricKind,
      data: [, bitrate],
    } = entry

    const prevEntry: MaxBitrate =
      this.latestMetricByKey["max-bitrate"] == null
        ? { category: "union", kind: "max-bitrate", data: { audio: 0, video: 0 } }
        : (this.latestMetricByKey["max-bitrate"] as MaxBitrate)

    const keyForKind = {
      "audio-max-quality": "audio",
      "video-max-quality": "video",
    } as const

    return {
      ...prevEntry,
      sessionTime,
      currentElementTime,
      data: { ...prevEntry.data, [keyForKind[metricKind]]: bitrate },
    }
  }

  private cacheEntry(entry: TimestampedEntry): void {
    const { category, kind } = entry

    switch (category) {
      case EntryCategory.METRIC:
        if (this.isFrameStat(entry)) {
          this.cacheStaticEntry(this.mergeFrameStat(entry))
          return
        }

        if (this.isMediaState(entry)) {
          this.cacheStaticEntry(this.mergeMediaState(entry))
          return
        }

        if (kind === "audio-max-quality" || kind === "video-max-quality") {
          this.cacheStaticEntry(this.mergeMaxBitrate(entry))
        }

        if (this.isVideoQuality(entry)) {
          this.cacheStaticEntry(this.mergeVideoQuality(entry))
          return
        }

        if (this.isAudioQuality(entry)) {
          this.cacheStaticEntry(this.mergeAudioQuality(entry))
          return
        }

        return this.cacheStaticEntry(entry)

      case EntryCategory.MESSAGE:
      case EntryCategory.TRACE:
        this.cacheDynamicEntry(entry)

        if (this.dynamicEntries.length >= DYNAMIC_ENTRY_LIMIT) {
          this.dynamicEntries = this.dynamicEntries.slice(-DYNAMIC_ENTRY_LIMIT)
        }

        break
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
    let formattedData: string | undefined

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
    }

    const sessionTime = new Date(entry.sessionTime)
    const formatedSessionTime = `${formatDate(sessionTime)}.${zeroPadMs(sessionTime.getUTCMilliseconds())}`

    return `${formatedSessionTime} - ${formattedData satisfies string}`
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
    }
  }

  private serialiseTime(time: Timestamp): string {
    const { currentElementTime } = time

    return `Video time: ${currentElementTime.toFixed(2)}`
  }

  private serialiseTrace(trace: TimestampedTrace): string {
    const { currentElementTime, kind, data } = trace

    switch (kind) {
      case "apicall": {
        const { functionName, functionArgs } = data
        const argsPart = functionArgs.length === 0 ? "" : ` with args [${functionArgs.join(", ")}]`
        return `Called '${functionName}${argsPart}'`
      }
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
      case "gap": {
        const { from, to } = data
        return `Gap from ${from} to ${to}`
      }
      case "session-start":
        return `Playback session started at ${new Date(data).toISOString().replace("T", " ")}`
      case "session-end":
        return `Playback session ended at ${new Date(data).toISOString().replace("T", " ")}`
      case "source-loaded": {
        const {
          transferFormat,
          manifestType,
          availabilityStartTimeInMilliseconds,
          presentationTimeOffsetInMilliseconds,
          timeShiftBufferDepthInMilliseconds,
        } = data

        let logMessage = `Loaded ${manifestType} ${transferFormat} source.`

        if (availabilityStartTimeInMilliseconds > 0) {
          logMessage += ` AST: ${new Date(availabilityStartTimeInMilliseconds).toString()}`
        }

        if (timeShiftBufferDepthInMilliseconds > 0) {
          logMessage += ` Time shift [s]: ${timeShiftBufferDepthInMilliseconds / 1000}`
        }

        if (presentationTimeOffsetInMilliseconds > 0) {
          logMessage += ` PTO [s]: ${presentationTimeOffsetInMilliseconds / 1000}.`
        }

        return logMessage
      }
      case "quota-exceeded": {
        const { bufferLevel, time } = data
        return `Quota exceeded with buffer level ${bufferLevel} at chunk start time ${time}`
      }
      case "state-change":
        return `Event: ${invertedMediaState[data]}`
    }
  }

  private serialiseStaticEntry(entry: StaticEntry): {
    id: string
    key: string
    value: boolean | number | string
  } | null {
    const { kind } = entry

    const parsedKey = kind.replace(/-/g, " ")
    const parsedValue = this.serialiseMetric(entry)

    return parsedValue == null ? null : { id: kind, key: parsedKey, value: parsedValue }
  }

  private serialiseMetric({ kind, data }: StaticEntry): boolean | number | string | null {
    if (typeof data !== "object") {
      return data
    }

    if (kind === "media-element-state") {
      const parts: string[] = []
      const isWaiting = typeof data["ready-state"] === "number" && data["ready-state"] <= 2

      if (!isWaiting && !data.paused && !data.seeking) {
        parts.push(
          data["playback-rate"] === 0 ? "halted at rate 0" : `playing at rate ${data["playback-rate"]?.toFixed(2)}`
        )
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
      const [start, end] = data

      return `${formatDate(new Date(start * 1000))} - ${formatDate(new Date(end * 1000))}`
    }

    if (kind === "initial-playback-time") {
      const [seconds, timeline] = data

      return `${seconds}s ${timeline}`
    }

    if (kind === "audio-quality" || kind === "video-quality") {
      const [maxQuality] = data.max ?? []
      const [downloadQuality, downloadBitrate] = data.download ?? []
      const [playbackQuality, playbackBitrate] = data.playback ?? []

      const playbackPart = `${((playbackBitrate ?? 0) / 1000).toFixed(0)} kbps (${playbackQuality ?? 0}/${
        maxQuality ?? 0
      })`

      if (playbackQuality === downloadQuality) {
        return playbackPart
      }

      return `${playbackPart} - downloading ${((downloadBitrate ?? 0) / 1000).toFixed(0)} kbps`
    }

    if (kind === "max-bitrate") {
      if (data.audio === 0) {
        return null
      }

      const bitratePart = (((data.audio ?? 0) + (data.video ?? 0)) / 1000).toFixed(0)

      return `${bitratePart} kbps`
    }

    if (kind === "frames") {
      if (data.total == null) {
        return null
      }

      return `${(data.dropped ?? (0 / data.total) * 100).toFixed(2)}% dropped (${data.dropped}/${data.total})`
    }

    return data.join(", ")
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
