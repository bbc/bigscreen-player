import WindowTypes from "../../models/windowtypes"

/** @enum */
const TimelineZeroPoints = {
  MPD: "mpdTime",
  VIDEO: "videoTime",
  WALLCLOCK: "wallclockTime",
}

/**
 * Calculat time anchor tag for playback within dashjs
 *
 * Anchor tags applied to the MPD source for playback:
 *
 * #t=<time> - Seeks MPD timeline. By itself it means time since the beginning of the first period defined in the DASH manifest.
 * #t=posix:<time> - Seeks availability timeline.
 *
 * @param {number} seconds
 * @param {string} [zeroPoint = TimelineZeroPoints.VIDEO]
 * @returns {string}
 */
export default function buildSourceAnchor(
  seconds,
  zeroPoint,
  { initialSeekableRangeStartSeconds = 0, windowType = WindowTypes.STATIC } = {}
) {
  if (typeof seconds !== "number" || !isFinite(seconds)) {
    return ""
  }

  const wholeSeconds = parseInt(seconds)

  if (zeroPoint === TimelineZeroPoints.MPD) {
    return `#t=${wholeSeconds}`
  }

  if (zeroPoint === TimelineZeroPoints.WALLCLOCK) {
    return `#t=posix:${wholeSeconds}`
  }

  // zeroPoint is video time
  if (windowType === WindowTypes.SLIDING) {
    return `#t=${initialSeekableRangeStartSeconds + (wholeSeconds === 0 ? 1 : wholeSeconds)}`
  }

  if (windowType === WindowTypes.GROWING) {
    return `#t=posix:${initialSeekableRangeStartSeconds + (wholeSeconds === 0 ? 1 : wholeSeconds)}`
  }

  // window type is static

  return wholeSeconds === 0 ? "" : `#t=${wholeSeconds}`
}

export { TimelineZeroPoints }
