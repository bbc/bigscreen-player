import { MediaKinds } from "../models/mediakinds"
import { MediaState } from "../models/mediastate"

import {
  EntryType,
  // MetricForKey,
  // MetricKey,
  TimestampedEntry,
  TraceKind,
  // TimestampedMessage,
  // TimestampedMetric,
  // TimestampedTrace,
  // isMessage,
  // isMetric,
  // isTrace,
} from "./chronicle"

import { z } from "zod"

// const base36 = {
//   from: (num: number) => num.toString(36),
//   to: (str: string) => parseInt(str, 36)
// }

// export function normalize(input: string): string {
//   return input.replace(
//     /[\n%;[\]]/g,
//     (match) =>
//       ({
//         "\n": "%0A",
//         "%": "%25",
//         ";": "%3B",
//         "[": "%5B",
//         "]": "%5D",
//       })[match] ?? match
//   )
// }

// export function denormalize(input: string): string {
//   return input.replace(
//     /%(0A|25|3B|5B|5D)/g,
//     (match) =>
//       ({
//         "%0A": "\n",
//         "%25": "%",
//         "%3B": ";",
//         "%5B": "[",
//         "%5D": "]",
//       })[match] ?? match
//   )
// }

// // const compressMessageLookup = {}

// export function compressMessage({
//   level: _level,
//   data: _data,
//   sessionTime: _sessionTime,
//   currentElementTime: _currentElementTime,
// }: TimestampedMessage): string {
//   return ""
// }

// // function bufferArrayCompressor (data: [start: number, end: number][]): string {
// //   return data.map(([start, end]) => `${start}:${end}`).join(",")
// // }

// function createMetricCompressor<Key extends MetricKey>(
//   prefix: string
// ): (data: MetricForKey<Key>["data"], sessionTime: number) => string {
//   return (data, sessionTime) => `${prefix}[${sessionTime}]${data}`
// }

// const compressMetricLookup: {
//   [key in MetricKey]: (data: MetricForKey<MetricKey>["data"], sessionTime: number) => string
// } = {
//   "auto-resume": createMetricCompressor<"auto-resume">("AR"),
//   bitrate: createMetricCompressor<"bitrate">("BR"),
//   "buffered-audio": createMetricCompressor<"buffered-audio">("BA"),
//   "buffered-video": createMetricCompressor<"buffered-video">("BV"),
//   "buffer-length": createMetricCompressor<"buffer-length">("BL"),
//   "ready-state": createMetricCompressor<"ready-state">("RS"),
//   "cdns-available": createMetricCompressor<"cdns-available">("CDN"),
//   "current-url": createMetricCompressor<"current-url">("CURL"),
//   duration: createMetricCompressor<"duration">("D"),
//   ended: createMetricCompressor<"ended">("E"),
//   "frames-dropped": createMetricCompressor<"frames-dropped">("FD"),
//   "initial-playback-time": createMetricCompressor<"initial-playback-time">("IPT"),
//   paused: createMetricCompressor<"paused">("P"),
//   "representation-audio": createMetricCompressor<"representation-audio">("RA"),
//   "representation-video": createMetricCompressor<"representation-video">("RV"),
//   "seekable-range": createMetricCompressor<"seekable-range">("SR"),
//   seeking: createMetricCompressor<"seeking">("SE"),
//   strategy: createMetricCompressor<"strategy">("S"),
//   "subtitle-cdns-available": createMetricCompressor<"subtitle-cdns-available">("SCDN"),
//   "subtitle-current-url": createMetricCompressor<"subtitle-current-url">("SCURR"),
//   version: createMetricCompressor<"version">("V"),
// }

// export function compressMetric({
//   key,
//   data,
//   sessionTime,
//   currentElementTime: _currentElementTime
// }: TimestampedMetric): string {
//   const compressor = compressMetricLookup[key]
//   return compressor(data, sessionTime)
// }

// export function compressTrace({
//   kind: _kind,
//   data: _data,
//   sessionTime: _sessionTime,
//   currentElementTime: _currentElementTime
// }: TimestampedTrace): string {
//   return ""
// }

// function compressEntry(entry: TimestampedEntry): string {
//   if (isMessage(entry)) return compressMessage(entry)
//   if (isMetric(entry)) return compressMetric(entry)
//   if (isTrace(entry)) return compressTrace(entry)
//   return ""
// }

// TODO: Implement
// function _isInteresting(_entry: TimestampedEntry): boolean {
//   return false
// }

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

const messageSchema = z.object({
  type: z.literal(EntryType.MESSAGE),
  level: messageLevelSchema,
  data: z.any(),
})
// .refine((_schema) => true)

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

const metricSchema = z.object({
  type: z.literal(EntryType.METRIC),
  key: metricKeySchema,
  data: z.any(),
})
// .refine((_schema) => true)

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
  error: z.instanceof(Error),
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
  type: z.literal(EntryType.TRACE),
  kind: traceKindSchema,
  data: z.unknown(),
})

const entrySchema = z.discriminatedUnion("type", [messageSchema, metricSchema, unrefinedTraceSchema])

type SchemaType<Key extends EntryType> = Key extends EntryType.MESSAGE
  ? z.infer<typeof messageSchema>
  : Key extends EntryType.METRIC
    ? z.infer<typeof metricSchema>
    : Key extends EntryType.TRACE
      ? z.infer<typeof unrefinedTraceSchema>
      : never

type RefinementLookup = () => {
  [Key in EntryType]: (unrefined: SchemaType<Key>) => boolean
}

const refinementLookup: RefinementLookup = () => ({
  [EntryType.METRIC](_unrefined): boolean {
    throw new Error("Function not implemented.")
  },
  [EntryType.MESSAGE](_unrefined): boolean {
    throw new Error("Function not implemented.")
  },
  [EntryType.TRACE]: (unrefined) => traceDataLookup[unrefined.kind].safeParse(unrefined.data).success,
})

const refinedEntrySchema = entrySchema.refine((schema) =>
  (refinementLookup()[schema.type] as (unrefined: SchemaType<typeof schema.type>) => boolean)(schema)
)

const timestampedSchema = z.object({
  currentElementTime: z.number(),
  sessionTime: z.number(),
})

const timestampedEntrySchema = refinedEntrySchema.and(timestampedSchema)
const uncompressedLogSchema = timestampedEntrySchema.array()

function validateCompressedLog(unvalidatedLog: unknown): TimestampedEntry[] | z.ZodError<TimestampedEntry[]> {
  const parsed = uncompressedLogSchema.safeParse(unvalidatedLog)

  if (parsed.success) return parsed.data as unknown as TimestampedEntry[]
  return parsed.error
}

/**
 * Determines if a string represents a compressed Chronicle Log.
 * This "heuristic" is currently very simple, and simply checks
 * if the first character is an open bracket, in which case, the
 * input is assumed to be an (Uncompressed) JSON array, otherwise
 * it is assumed to be compressed.
 * @param compressed The string to determine if compressed.
 * @returns Whether the string is compressed or not.
 */
export function isCompressed(compressed: string): boolean {
  return compressed[0] !== "["
}

/**
 * Compresses the Chronicle Log into a more compact form, suitible
 * for transfer over a network. This function is WIP and, although
 * callable, does not actually do much compression.
 *
 * The Last 500 entries are taken, along with select "interesting"
 * entries from the preceding part of the log, this is then combined
 * and JSON.stringified.
 * @param entries The Chronicle Log to compress
 * @returns A string representing the compressed form of the given
 * Chronicle Log.
 */
export function compress(chronicle: TimestampedEntry[]): string {
  // const head = chronicle.slice(0, -500)
  const tail = chronicle.slice(-500)

  // if (head.length !== 0) {}

  // return tail.map((entry) => compressEntry(entry)).join("\n")

  return JSON.stringify(tail, undefined, 0)
}

type ValidationError = { issues: { path: (string | number)[]; message: string }[] }

/**
 * Produces a Chronicle Log Array from a string previously compressed
 * with {@link compress}.
 * @param compressed A string that represents a compressed Chronicle Log.
 * @returns The uncompressed Chronicle Log represented by the input string.
 */
export function decompress(compressed: string): TimestampedEntry[] | ValidationError {
  const parsed: unknown = JSON.parse(compressed)
  const validated = validateCompressedLog(parsed)

  if (validated instanceof z.ZodError) {
    return {
      issues: validated.errors.map((error) => ({
        path: error.path,
        message: error.message,
      })),
    }
  }

  return validated
}

export default { compress, decompress }
