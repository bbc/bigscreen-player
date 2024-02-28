import { TimestampedEntry } from "./chronicle"

// TODO: This Module is a WIP

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
 * The Last 100 entries are taken for now.
 * @param entries The Chronicle Log to compress
 * @returns A string representing the compressed form of the given
 * Chronicle Log.
 */
export const compress = (chronicle: TimestampedEntry[]): TimestampedEntry[] => chronicle.slice(-100)

/**
 * Produces a Chronicle Log Array from a string previously compressed
 * with {@link compress}.
 * @param compressed A string that represents a compressed Chronicle Log.
 * @returns The uncompressed Chronicle Log represented by the input string.
 */
export function decompress(compressed: string): TimestampedEntry[] {
  return JSON.parse(compressed) as TimestampedEntry[]
}

export default { compress, decompress }
