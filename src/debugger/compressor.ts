import { MetricForKey, MetricKey, Timestamped, TimestampedEntry } from "./chronicle"

// const support = {
//   arrayBuffer: 'ArrayBuffer' in window,
//   textEncoder: 'TextEncoder' in window
// };

/**
 * Represents the result of {@link compressed}.
 */
export const CompressedState = {
  Compressed: 0,
  Uncompressed: 1,
  Corrupted: 2,
} as const

type CompressedState = (typeof CompressedState)[keyof typeof CompressedState]

/**
 * Determines if a String represents a Compressed, or Uncompressed, Entry Array based on the first Byte.
 * If `input` starts with `\u001F`, it is assumed to be the start of the GZip Magic Identifier.
 * if `input` starts with `\u005B`, it is assumed to be opening a JSON Array.
 * Otherwise, the string is assumed to have been corrupted in transit.
 * @param input the string to check for compression status.
 * @returns `CompressedState`, representing the outcome of the check.
 * @see CompressedState
 */
export function compressed(input: string): CompressedState {
  if (input[0] === "\u001F") return CompressedState.Compressed
  if (input[0] === "\u005B") return CompressedState.Uncompressed

  return CompressedState.Corrupted
}

export function normalize(input: string): string {
  return input.replace(
    /[%;[\]]/g,
    (match) =>
      ({
        "%": "%25",
        ";": "%3B",
        "[": "%5B",
        "]": "%5D",
      })[match] ?? match
  )
}

export function denormalize(input: string): string {
  return input.replace(
    /%(25|3B|5B|5D)/g,
    (match) =>
      ({
        "%25": "%",
        "%3B": ";",
        "%5B": "[",
        "%5D": "]",
      })[match] ?? match
  )
}

// function bufferArrayCompressor (data: [start: number, end: number][]): string {
//   return data.map(([start, end]) => `${start}:${end}`).join(",")
// }

function createMetricCompressor<Key extends MetricKey>(
  prefix: string
): (data: MetricForKey<Key>["data"], sessionTime: number) => string {
  return (data, sessionTime) => `${prefix}[${sessionTime}]${data}`
}

const compressMetricLookup: {
  [key in MetricKey]: (data: MetricForKey<MetricKey>["data"], sessionTime: number) => string
} = {
  "auto-resume": createMetricCompressor<"auto-resume">("AR"),
  bitrate: createMetricCompressor<"bitrate">("BR"),
  "buffered-audio": createMetricCompressor<"buffered-audio">("BA"),
  "buffered-video": createMetricCompressor<"buffered-video">("BV"),
  "buffer-length": createMetricCompressor<"buffer-length">("BL"),
  "ready-state": createMetricCompressor<"ready-state">("RS"),
  "cdns-available": createMetricCompressor<"cdns-available">("CDN"),
  "current-url": createMetricCompressor<"current-url">("CURL"),
  duration: createMetricCompressor<"duration">("D"),
  ended: createMetricCompressor<"ended">("E"),
  "frames-dropped": createMetricCompressor<"frames-dropped">("FD"),
  "initial-playback-time": createMetricCompressor<"initial-playback-time">("IPT"),
  paused: createMetricCompressor<"paused">("P"),
  "representation-audio": createMetricCompressor<"representation-audio">("RA"),
  "representation-video": createMetricCompressor<"representation-video">("RV"),
  "seekable-range": createMetricCompressor<"seekable-range">("SR"),
  seeking: createMetricCompressor<"seeking">("SE"),
  strategy: createMetricCompressor<"strategy">("S"),
  "subtitle-cdns-available": createMetricCompressor<"subtitle-cdns-available">("SCDN"),
  "subtitle-current-url": createMetricCompressor<"subtitle-current-url">("SCURR"),
  version: createMetricCompressor<"version">("V"),
}

export function compressMetric<
  Key extends MetricKey,
  Metric extends MetricForKey<Key>,
  Timestamp extends Timestamped<Metric>,
>({ key, data, sessionTime }: Timestamp): string {
  const compressor = compressMetricLookup[key]
  return compressor(data, sessionTime)
}

// const compressMessageLookup = {}

// function compressMessage(): string {}

// function _compressEntry (entry: EntryForType<EntryType>): string {
//   if (entry.type === "metric") {
//     return compressMetric(entry)
//   }

//   return ""
// }

export function compress(_entries: TimestampedEntry[]): string {
  // const hasSupport = support.arrayBuffer && support.textEncoder
  // const entriesText = JSON.stringify(entries, undefined, 0) // TODO

  // const compressor = new Promise((resolve, reject) => {
  //   hasSupport ? import("fflate")
  //     .then(({ default: FFlate }) => resolve(FFlate))
  //     .catch(() => {
  //       reject({ error: "fflateDynamicLoadError" })
  //     }) : { gzipSync: (array: TimestampedEntries) => array, }
  // })

  // const compressed = gzipSync(entries)

  return ""
}

export function decompress(_compressed: string): TimestampedEntry[] {
  return []
}

export default { compress, decompress }
