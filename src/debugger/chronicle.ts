import { MediaState } from "../models/mediastate"
import getValues from "../utils/get-values"
import { MediaKinds } from "../models/mediakinds"
import { Timeline } from "../models/timeline"
import { TransferFormat } from "../models/transferformats"
import { TimeInfo } from "../manifest/manifestparser"

export enum EntryCategory {
  METRIC = "metric",
  MESSAGE = "message",
  TRACE = "trace",
}

type CreateMessage<Kind extends string> = {
  category: EntryCategory.MESSAGE
  kind: Kind
  data: string
}

type InfoMessage = CreateMessage<"info">
type WarningMessage = CreateMessage<"warning">
type DebugMessage = CreateMessage<"debug">

export type Message = InfoMessage | WarningMessage | DebugMessage

export type MessageKind = Message["kind"]
export type MessageForKind<Kind extends MessageKind> = Extract<Message, { kind: Kind }>
export type MessageLike = CreateMessage<string>

type Primitive = string | number | bigint | boolean
type Primitives = Primitive | Primitive[] | Primitives[]

type CreateMetric<Kind extends string, Data extends Primitives> = {
  category: EntryCategory.METRIC
  kind: Kind
  data: Data
}

type AutoResume = CreateMetric<"auto-resume", number>
type BitRate = CreateMetric<"bitrate", number>
type BufferLength = CreateMetric<"buffer-length", number>
type CDNsAvailable = CreateMetric<"cdns-available", string[]>
type CurrentUrl = CreateMetric<"current-url", string>
type Duration = CreateMetric<"duration", number>
type FramesDropped = CreateMetric<"frames-dropped", number>
type InitialPlaybackTime = CreateMetric<"initial-playback-time", [time: number, timeline: Timeline]>
type MediaElementEnded = CreateMetric<"ended", HTMLMediaElement["ended"]>
type MediaElementPaused = CreateMetric<"paused", HTMLMediaElement["paused"]>
type MediaElementPlaybackRate = CreateMetric<"playback-rate", HTMLMediaElement["playbackRate"]>
type MediaElementReadyState = CreateMetric<"ready-state", HTMLMediaElement["readyState"]>
type MediaElementSeeking = CreateMetric<"seeking", HTMLMediaElement["seeking"]>
type PlaybackStrategy = CreateMetric<"strategy", string>
type RepresentationAudio = CreateMetric<"representation-audio", [qualityIndex: number, bitrate: number]>
type RepresentationVideo = CreateMetric<"representation-video", [qualityIndex: number, bitrate: number]>
type SeekableRange = CreateMetric<"seekable-range", [start: number, end: number]>
type SubtitleCDNsAvailable = CreateMetric<"subtitle-cdns-available", string[]>
type SubtitleCurrentUrl = CreateMetric<"subtitle-current-url", string>
type AudioDescribedCDNsAvailable = CreateMetric<"audio-described-cdns-available", string[]>
type Version = CreateMetric<"version", string>

export type Metric =
  | AutoResume
  | BitRate
  | BufferLength
  | CDNsAvailable
  | CurrentUrl
  | Duration
  | FramesDropped
  | InitialPlaybackTime
  | MediaElementEnded
  | MediaElementPaused
  | MediaElementPlaybackRate
  | MediaElementReadyState
  | MediaElementSeeking
  | PlaybackStrategy
  | RepresentationAudio
  | RepresentationVideo
  | SeekableRange
  | SubtitleCDNsAvailable
  | SubtitleCurrentUrl
  | AudioDescribedCDNsAvailable
  | Version

export type MetricKind = Metric["kind"]
export type MetricForKind<Kind extends MetricKind> = Extract<Metric, { kind: Kind }>
export type MetricLike = CreateMetric<string, Primitives>

type CreateTrace<Kind extends string, Data extends Primitives | Record<string, Primitives>> = {
  category: EntryCategory.TRACE
  kind: Kind
  data: Data
}

type ApiCall = CreateTrace<"apicall", { functionName: string; functionArgs: any[] }>
type BufferedRanges = CreateTrace<"buffered-ranges", { kind: MediaKinds; buffered: [start: number, end: number][] }>
type Error = CreateTrace<"error", { name: string; message: string }>
type Event = CreateTrace<"event", { eventType: string; eventTarget: string }>
type Gap = CreateTrace<"gap", { from: number; to: number }>
type QuotaExceeded = CreateTrace<"quota-exceeded", { bufferLevel: number; time: number }>
type SessionStart = CreateTrace<"session-start", number>
type SessionEnd = CreateTrace<"session-end", number>
type SourceLoaded = CreateTrace<"source-loaded", TimeInfo & { transferFormat: TransferFormat }>
type StateChange = CreateTrace<"state-change", MediaState>

export type Trace =
  | ApiCall
  | BufferedRanges
  | Error
  | Event
  | Gap
  | QuotaExceeded
  | SessionStart
  | SessionEnd
  | SourceLoaded
  | StateChange

export type TraceKind = Trace["kind"]
export type TraceForKind<Kind extends TraceKind> = Extract<Trace, { kind: Kind }>
export type TraceLike = CreateTrace<string, Primitives | Record<string, Primitives>>

export type Entry = Message | Metric | Trace
export type EntryKind = Entry["kind"]

export type Timestamped<Category> = { currentElementTime: number; sessionTime: number } & Category
export type TimestampedEntry = Timestamped<Entry>
export type TimestampedMetric = Timestamped<Metric>
export type TimestampedMessage = Timestamped<Message>
export type TimestampedTrace = Timestamped<Trace>

export type EntryForKind<Kind extends EntryKind> = Extract<Entry, { kind: Kind }>

export const isMessage = <E extends Entry | TimestampedEntry, T extends E extends Entry ? Message : TimestampedMessage>(
  entry: E
): entry is E & T => entry.category === EntryCategory.MESSAGE

export const isMetric = <E extends Entry | TimestampedEntry, T extends E extends Entry ? Metric : TimestampedMetric>(
  entry: E
): entry is E & T => entry.category === EntryCategory.METRIC

export const isTrace = <E extends Entry | TimestampedEntry, T extends E extends Entry ? Trace : TimestampedTrace>(
  entry: E
): entry is E & T => entry.category === EntryCategory.TRACE

type EventListeners =
  | { type: "update"; listener: (change: Readonly<TimestampedEntry>) => void }
  | { type: "timeupdate"; listener: (seconds: number) => void }
type EventTypes = EventListeners["type"]
type EventListenerForType<Type extends EventTypes> = Extract<EventListeners, { type: Type }>["listener"]

function isValid<T>(data: T): boolean {
  const type = typeof data

  return (
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    (type === "object" && Array.isArray(data) && data.every((element) => isValid(element)))
  )
}

function isEqual<T>(left: T, right: T): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((element, index) => isEqual(element, right[index]))
  }

  return left === right
}

function sortEntries(someEntry: Timestamped<Entry>, otherEntry: Timestamped<Entry>): number {
  return someEntry.sessionTime === otherEntry.sessionTime
    ? someEntry.currentElementTime - otherEntry.currentElementTime
    : someEntry.sessionTime - otherEntry.sessionTime
}

function concatArrays<T>(someArray: T[], otherArray: T[]): T[] {
  return [...someArray, ...otherArray]
}

const METRIC_ENTRY_THRESHOLD = 100

class Chronicle {
  private sessionStartTime: number = Date.now()
  private currentElementTime: number = 0

  private messages: Timestamped<Message>[] = []
  private metrics: { [Kind in MetricKind]?: Timestamped<MetricForKind<Kind>>[] } = {}
  private traces: Timestamped<Trace>[] = []
  private listeners: { [Type in EventTypes]: EventListenerForType<Type>[] } = { update: [], timeupdate: [] }

  private triggerUpdate(entry: TimestampedEntry) {
    this.listeners.update.forEach((callback) => callback(entry))
  }

  private triggerTimeUpdate(seconds: number) {
    this.listeners.timeupdate.forEach((callback) => callback(seconds))
  }

  private timestamp<E extends Entry>(entry: E): Timestamped<E> {
    return { ...entry, currentElementTime: this.currentElementTime, sessionTime: this.getSessionTime() }
  }

  private pushMessage(message: Message): void {
    const entry = this.timestamp(message)

    this.messages.push(entry)
    this.triggerUpdate(entry)
  }

  public getCurrentElementTime(): number {
    return this.currentElementTime
  }

  public setCurrentElementTime(seconds: number) {
    this.currentElementTime = seconds

    this.triggerTimeUpdate(seconds)
  }

  public getSessionTime() {
    return Date.now() - this.sessionStartTime
  }

  public on<Type extends EventTypes>(type: Type, listener: EventListenerForType<Type>) {
    this.listeners[type].push(listener)
  }

  public off<Type extends EventTypes>(type: Type, listener: EventListenerForType<Type>) {
    const index = this.listeners[type].indexOf(listener)

    if (index === -1) {
      return
    }

    this.listeners[type].splice(index, 1)
  }

  public retrieve(): Timestamped<Entry>[] {
    const metrics = getValues(this.metrics).reduce(concatArrays, [])

    return [...this.traces, ...metrics, ...this.messages].sort(sortEntries) as Timestamped<Entry>[]
  }

  public size(): number {
    return (
      this.messages.length +
      this.traces.length +
      getValues(this.metrics).reduce((sumSoFar, metricsForKey) => sumSoFar + metricsForKey.length, 0)
    )
  }

  public appendMetric<Kind extends MetricKind>(kind: Kind, data: MetricForKind<Kind>["data"]) {
    if (!isValid(data)) {
      throw new TypeError(
        `A metric value can only be a primitive type, or an array of any depth containing primitive types. Got ${typeof data}`
      )
    }

    const latest = this.getLatestMetric(kind)

    if (latest && isEqual(latest.data, data)) {
      return
    }

    if (this.metrics[kind] == null) {
      this.metrics[kind] = []
    }

    const metricsForKey = this.metrics[kind] as Timestamped<MetricForKind<Kind>>[]

    if (metricsForKey.length + 1 === METRIC_ENTRY_THRESHOLD) {
      this.trace(
        "error",
        new Error(
          `Metric ${kind} exceeded ${METRIC_ENTRY_THRESHOLD}. Consider a more selective sample, or not storing history.`
        )
      )
    }

    const metric = this.timestamp({ kind, data, category: EntryCategory.METRIC } as MetricForKind<Kind>)

    metricsForKey.push(metric)

    this.triggerUpdate(metric)
  }

  public setMetric<Kind extends MetricKind>(kind: Kind, data: MetricForKind<Kind>["data"]) {
    this.metrics[kind] = []

    this.appendMetric(kind, data)
  }

  public getLatestMetric<Kind extends MetricKind>(kind: Kind): MetricForKind<Kind> | null {
    if (!this.metrics[kind]?.length) {
      return null
    }

    const metricsForKey = this.metrics[kind] as Timestamped<MetricForKind<Kind>>[]

    return metricsForKey[metricsForKey.length - 1] as MetricForKind<Kind>
  }

  public debug(message: MessageForKind<"debug">["data"]) {
    this.pushMessage({ category: EntryCategory.MESSAGE, kind: "debug", data: message })
  }

  public info(message: MessageForKind<"info">["data"]) {
    this.pushMessage({ category: EntryCategory.MESSAGE, kind: "info", data: message })
  }

  public trace<Kind extends TraceKind>(kind: Kind, data: TraceForKind<Kind>["data"]) {
    const entry = this.timestamp({ kind, data, category: EntryCategory.TRACE } as Trace)

    this.traces.push(entry)
    this.triggerUpdate(entry)
  }

  public warn(message: MessageForKind<"warning">["data"]) {
    this.pushMessage({ category: EntryCategory.MESSAGE, kind: "warning", data: message })
  }
}

export default Chronicle
