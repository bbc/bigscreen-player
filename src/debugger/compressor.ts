import {
  EntryType,
  // MetricForKey,
  // MetricKey,
  TimestampedEntry,
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
function _isInteresting(_entry: TimestampedEntry): boolean {
  return false
}

function validateCompressedLog(unvalidatedLog: unknown): TimestampedEntry[] | z.ZodError<TimestampedEntry[]> {
  const messageLevelSchema = z.union([z.literal("info"), z.literal("warning"), z.literal("debug")])
  const messageSchema = z.object({
    type: z.literal(EntryType.MESSAGE),
    level: messageLevelSchema,
    data: z.string(),
  })

  const metricSchema = z.object({ type: z.literal(EntryType.METRIC), data: z.undefined() })
  const traceSchema = z.object({ type: z.literal(EntryType.TRACE), data: z.undefined() })

  const entrySchema = z.discriminatedUnion("type", [messageSchema, metricSchema, traceSchema])

  const timestampedSchema = z.object({
    currentElementTime: z.number(),
    sessionTime: z.number(),
  })

  const timestampedEntrySchema = z.intersection(timestampedSchema, entrySchema)

  const uncompressedLogSchema = z.array(timestampedEntrySchema)
  const parsed = uncompressedLogSchema.safeParse(unvalidatedLog)

  if (parsed.success) return parsed.data as unknown as TimestampedEntry[]
  return parsed.error as unknown as TimestampedEntry[]
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

  return tail.map((entry) => JSON.stringify(entry)).join("\n")
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
