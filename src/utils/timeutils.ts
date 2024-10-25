export function durationToSeconds(duration: string) {
  const matches = duration.match(/^PT(\d+(?:[,.]\d+)?H)?(\d+(?:[,.]\d+)?M)?(\d+(?:[,.]\d+)?S)?/) || []

  const hours = parseFloat(matches[1] || "0") * 60 * 60
  const mins = parseFloat(matches[2] || "0") * 60
  const secs = parseFloat(matches[3] || "0")

  return hours + mins + secs || undefined
}

export function convertToSeekableVideoTime(epochTime: number, windowStartEpochTime: number) {
  // Wont allow a 0 value for this due to device issue, this should be sorted in the TAL strategy.
  return Math.max(0.1, convertToVideoTime(epochTime, windowStartEpochTime))
}

export function convertToVideoTime(epochTime: number, windowStartEpochTime: number) {
  return Math.floor(convertMilliSecondsToSeconds(epochTime - windowStartEpochTime))
}

export function convertMilliSecondsToSeconds(timeInMilis: number) {
  return Math.floor(timeInMilis / 1000)
}

export function calculateSlidingWindowSeekOffset(
  time: number,
  dvrInfoRangeStart: number,
  timeCorrection: number,
  slidingWindowPausedTime: number
) {
  const dashRelativeTime = time + timeCorrection - dvrInfoRangeStart

  if (slidingWindowPausedTime === 0) {
    return dashRelativeTime
  }

  return dashRelativeTime - (Date.now() - slidingWindowPausedTime) / 1000
}

export default {
  durationToSeconds,
  convertToSeekableVideoTime,
  convertToVideoTime,
  calculateSlidingWindowSeekOffset,
} as const
