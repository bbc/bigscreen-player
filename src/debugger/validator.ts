import { MediaKinds } from "../models/mediakinds"
import { MediaState } from "../models/mediastate"
import { Timeline } from "../models/timeline"
import { TransferFormat } from "../models/transferformats"
import { ManifestType } from "../models/manifesttypes"

import { EntryCategory, MessageKind, MetricKind, TimestampedEntry, TraceKind } from "./chronicle"

import { z } from "zod/v4-mini"

const mediaKindSchema = [z.literal(MediaKinds.AUDIO), z.literal(MediaKinds.VIDEO)] as const

const mediaStateSchema = [
  z.literal(MediaState.ENDED),
  z.literal(MediaState.FATAL_ERROR),
  z.literal(MediaState.PAUSED),
  z.literal(MediaState.PLAYING),
  z.literal(MediaState.STOPPED),
  z.literal(MediaState.WAITING),
] as const

const messageLevels = [z.literal("info"), z.literal("warning"), z.literal("debug")] as const
const messageLevelSchema = z.union(messageLevels)

const messageDataLookup: {
  [key in MessageKind]: z.ZodMiniString
} = {
  debug: z.string(),
  info: z.string(),
  warning: z.string(),
} as const

const unrefinedMessageSchema = z.object({
  category: z.literal(EntryCategory.MESSAGE),
  kind: messageLevelSchema,
  data: z.unknown(),
})

const metricKeys = [
  z.literal("audio-download-quality"),
  z.literal("audio-playback-quality"),
  z.literal("audio-max-quality"),
  z.literal("auto-resume"),
  z.literal("buffer-length"),
  z.literal("ended"),
  z.literal("playback-rate"),
  z.literal("ready-state"),
  z.literal("cdns-available"),
  z.literal("current-url"),
  z.literal("duration"),
  z.literal("frames-dropped"),
  z.literal("initial-playback-time"),
  z.literal("paused"),
  z.literal("seekable-range"),
  z.literal("seeking"),
  z.literal("strategy"),
  z.literal("subtitle-cdns-available"),
  z.literal("subtitle-current-url"),
  z.literal("version"),
  z.literal("video-download-quality"),
  z.literal("video-playback-quality"),
  z.literal("video-max-quality"),
  z.literal("target-latency"),
  z.literal("current-latency"),
] as const

const metricKeySchema = z.union(metricKeys)

const metricDataLookup: {
  [key in MetricKind]: z.ZodMiniType
} = {
  "audio-download-quality": z.tuple([z.number(), z.number()]),
  "audio-playback-quality": z.tuple([z.number(), z.number()]),
  "audio-max-quality": z.tuple([z.number(), z.number()]),
  "auto-resume": z.number(),
  "buffer-length": z.number(),
  "ended": z.boolean(),
  "playback-rate": z.number(),
  "ready-state": z.number(),
  "cdns-available": z.array(z.string()),
  "current-url": z.string(),
  "duration": z.union([z.number(), z.null()]),
  "frames-dropped": z.number(),
  "initial-playback-time": z.tuple([
    z.number(),
    z.union([
      z.literal(Timeline.AVAILABILITY_TIME),
      z.literal(Timeline.MEDIA_SAMPLE_TIME),
      z.literal(Timeline.PRESENTATION_TIME),
    ]),
  ]),
  "paused": z.boolean(),
  "seekable-range": z.tuple([z.number(), z.number()]),
  "seeking": z.boolean(),
  "strategy": z.string(),
  "subtitle-cdns-available": z.array(z.string()),
  "subtitle-current-url": z.string(),
  "version": z.string(),
  "video-download-quality": z.tuple([z.number(), z.number()]),
  "video-playback-quality": z.tuple([z.number(), z.number()]),
  "video-max-quality": z.tuple([z.number(), z.number()]),
  "target-latency": z.number(),
  "current-latency": z.number(),
} as const

const unrefinedMetricSchema = z.object({
  category: z.literal(EntryCategory.METRIC),
  kind: metricKeySchema,
  data: z.unknown(),
})

const traceKinds = [
  z.literal("apicall"),
  z.literal("buffered-ranges"),
  z.literal("error"),
  z.literal("event"),
  z.literal("gap"),
  z.literal("quota-exceeded"),
  z.literal("session-start"),
  z.literal("session-end"),
  z.literal("source-loaded"),
  z.literal("state-change"),
] as const
const traceKindSchema = z.union(traceKinds)

const traceDataLookup: Record<TraceKind, z.ZodMiniType> = {
  "apicall": z.object({
    functionName: z.string(),
    functionArgs: z.array(z.any()),
  }),
  "buffered-ranges": z.object({
    kind: z.union(mediaKindSchema),
    buffered: z.array(z.tuple([z.number(), z.number()])),
  }),
  "error": z.object({
    name: z.optional(z.string()),
    message: z.string(),
  }),
  "event": z.object({
    eventType: z.string(),
    eventTarget: z.string(),
  }),
  "gap": z.object({
    from: z.number(),
    to: z.number(),
  }),
  "quota-exceeded": z.object({
    bufferLevel: z.number(),
    time: z.number(),
  }),
  "session-start": z.number(),
  "session-end": z.number(),
  "source-loaded": z.object({
    transferFormat: z.union([
      z.literal(TransferFormat.DASH),
      z.literal(TransferFormat.HLS),
      z.literal(TransferFormat.PLAIN),
    ]),
    manifestType: z.union([z.literal(ManifestType.DYNAMIC), z.literal(ManifestType.STATIC)]),
    availabilityStartTimeInMilliseconds: z.number(),
    presentationTimeOffsetInMilliseconds: z.number(),
    timeShiftBufferDepthInMilliseconds: z.number(),
  }),
  "state-change": z.union(mediaStateSchema),
} as const

const unrefinedTraceSchema = z.object({
  category: z.literal(EntryCategory.TRACE),
  kind: traceKindSchema,
  data: z.unknown(),
})

const entrySchema = z.discriminatedUnion("category", [
  unrefinedMessageSchema,
  unrefinedMetricSchema,
  unrefinedTraceSchema,
])

const refinedEntrySchema = entrySchema.check(
  z.refine((schema) => {
    switch (schema.category) {
      case EntryCategory.MESSAGE:
        return messageDataLookup[schema.kind].safeParse(schema.data).success
      case EntryCategory.METRIC:
        return metricDataLookup[schema.kind].safeParse(schema.data).success
      case EntryCategory.TRACE:
        return traceDataLookup[schema.kind].safeParse(schema.data).success
    }
  })
)

const timestampedSchema = z.object({
  currentElementTime: z.number(),
  sessionTime: z.number(),
})

const timestampedEntrySchema = z.intersection(refinedEntrySchema, timestampedSchema)
export const chronicleLogSchema = z.array(timestampedEntrySchema)

export type ChronicleValidationObject = {
  data: TimestampedEntry[]
  error: false
}

export type ChronicleValidationError = {
  name: "ChronicleValidationError"
  message: string | object
  error: true
}

export function validate(unvalidatedLog: unknown): ChronicleValidationObject | ChronicleValidationError {
  const parsed = chronicleLogSchema.safeParse(unvalidatedLog)

  if (parsed.success) {
    const chronicle = parsed.data as TimestampedEntry[]

    return {
      error: false,
      data: chronicle,
    }
  }

  return {
    error: true,
    name: "ChronicleValidationError",
    message: z.prettifyError(parsed.error),
  }
}
