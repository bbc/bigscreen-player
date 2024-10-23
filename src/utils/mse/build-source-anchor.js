/**
 * Calculate time anchor tag for playback within dashjs
 *
 * Anchor tags applied to the MPD source for playback:
 *
 * #t=<time> - Seeks MPD timeline. By itself it means time since the beginning of the first period defined in the DASH manifest
 *
 * @param {number} presentationTimeInSeconds
 * @returns {string}
 */
export default function buildSourceAnchor(presentationTimeInSeconds) {
  if (typeof presentationTimeInSeconds !== "number" || !isFinite(presentationTimeInSeconds)) {
    return ""
  }

  const wholeSeconds = parseInt(presentationTimeInSeconds)

  return wholeSeconds === 0 ? "" : `#t=${wholeSeconds}`
}
