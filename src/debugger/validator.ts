import { MediaKinds } from "../models/mediakinds"
import { MediaState } from "../models/mediastate"

import { EntryCategory, MessageLevel, MetricKey, TimestampedEntry, TraceKind } from "./chronicle"

import { z } from "zod"

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
  [key in MessageLevel]: z.ZodTypeAny
} = {
  debug: z.string(),
  info: z.string(),
  warning: z.string(),
} as const

const unrefinedMessageSchema = z.object({
  category: z.literal(EntryCategory.MESSAGE),
  level: messageLevelSchema,
  data: z.any(),
})

const metricKeys = [
  z.literal("auto-resume"),
  z.literal("bitrate"),
  z.literal("buffer-length"),
  z.literal("ended"),
  z.literal("ready-state"),
  z.literal("cdns-available"),
  z.literal("current-url"),
  z.literal("duration"),
  z.literal("frames-dropped"),
  z.literal("initial-playback-time"),
  z.literal("paused"),
  z.literal("representation-audio"),
  z.literal("representation-video"),
  z.literal("seekable-range"),
  z.literal("seeking"),
  z.literal("strategy"),
  z.literal("subtitle-cdns-available"),
  z.literal("subtitle-current-url"),
  z.literal("version"),
] as const
const metricKeySchema = z.union(metricKeys)

const metricDataLookup: {
  [key in MetricKey]: z.ZodTypeAny
} = {
  "auto-resume": z.number(),
  bitrate: z.number(),
  "buffer-length": z.number(),
  ended: z.boolean(),
  "ready-state": z.number(),
  "cdns-available": z.string().array(),
  "current-url": z.string(),
  duration: z.number(),
  "frames-dropped": z.number(),
  "initial-playback-time": z.number(),
  paused: z.boolean(),
  "representation-audio": z.tuple([z.number(), z.number()]),
  "representation-video": z.tuple([z.number(), z.number()]),
  "seekable-range": z.tuple([z.number(), z.number()]),
  seeking: z.boolean(),
  strategy: z.string(),
  "subtitle-cdns-available": z.string().array(),
  "subtitle-current-url": z.string(),
  version: z.string(),
} as const

const unrefinedMetricSchema = z.object({
  category: z.literal(EntryCategory.METRIC),
  key: metricKeySchema,
  data: z.any(),
})

const traceKinds = [
  z.literal("buffered-ranges"),
  z.literal("error"),
  z.literal("event"),
  z.literal("gap"),
  z.literal("session-start"),
  z.literal("session-end"),
  z.literal("state-change"),
] as const
const traceKindSchema = z.union(traceKinds)

const traceDataLookup: {
  [key in TraceKind]: z.ZodTypeAny
} = {
  "buffered-ranges": z.object({
    kind: z.union(mediaKindSchema),
    buffered: z.tuple([z.number(), z.number()]).array(),
  }),
  error: z.object({
    name: z.string().optional(),
    message: z.string(),
  }),
  event: z.object({
    eventType: z.string(),
    target: z.string(),
  }),
  gap: z.object({
    from: z.number(),
    to: z.number(),
  }),
  "session-start": z.number(),
  "session-end": z.number(),
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

type SchemaType<Key extends EntryCategory> = Key extends EntryCategory.MESSAGE
  ? z.infer<typeof unrefinedMessageSchema>
  : Key extends EntryCategory.METRIC
    ? z.infer<typeof unrefinedMetricSchema>
    : Key extends EntryCategory.TRACE
      ? z.infer<typeof unrefinedTraceSchema>
      : never

type RefinementLookup = () => {
  [Key in EntryCategory]: (unrefined: SchemaType<Key>) => boolean
}

const refinementLookup: RefinementLookup = () => ({
  [EntryCategory.MESSAGE]: (unrefined) => messageDataLookup[unrefined.level].safeParse(unrefined.data).success,
  [EntryCategory.METRIC]: (unrefined) => metricDataLookup[unrefined.key].safeParse(unrefined.data).success,
  [EntryCategory.TRACE]: (unrefined) => traceDataLookup[unrefined.kind].safeParse(unrefined.data).success,
})

const refinedEntrySchema = entrySchema.refine((schema) =>
  (refinementLookup()[schema.category] as (unrefined: SchemaType<typeof schema.category>) => boolean)(schema)
)

const timestampedSchema = z.object({
  currentElementTime: z.number(),
  sessionTime: z.number(),
})

const timestampedEntrySchema = refinedEntrySchema.and(timestampedSchema)
const chronicleLogSchema = timestampedEntrySchema.array()

export type ValidationError = { issues: { path: (string | number)[]; message: string }[] }

export function validate(unvalidatedLog: unknown): TimestampedEntry[] | ValidationError {
  const parsed = chronicleLogSchema.safeParse(unvalidatedLog)

  if (parsed.success) return parsed.data as unknown as TimestampedEntry[]

  const error = parsed.error

  return {
    issues: error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    })),
  }
}
