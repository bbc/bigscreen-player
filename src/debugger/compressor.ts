import { TimestampedEntry } from "./chronicle"
import { ValidationError, validate } from "./validator"

// TODO: Implement
// function _isInteresting(_entry: TimestampedEntry): boolean {
//   return false
// }

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

/**
 * Produces a Chronicle Log Array from a string previously compressed
 * with {@link compress}.
 * @param compressed A string that represents a compressed Chronicle Log.
 * @returns The uncompressed Chronicle Log represented by the input string.
 */
export function decompress(compressed: string): TimestampedEntry[] | ValidationError {
  const parsed: unknown = JSON.parse(compressed)
  return validate(parsed)
}

export default { compress, decompress }
