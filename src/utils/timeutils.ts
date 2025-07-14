import ServerDate from "./serverdate"

export function durationToSeconds(duration: string) {
  const matches = duration.match(/^PT(\d+(?:[,.]\d+)?H)?(\d+(?:[,.]\d+)?M)?(\d+(?:[,.]\d+)?S)?/) || []

  const hours = parseFloat(matches[1] || "0") * 60 * 60
  const mins = parseFloat(matches[2] || "0") * 60
  const secs = parseFloat(matches[3] || "0")

  return hours + mins + secs || undefined
}

export function presentationTimeToAvailabilityTimeInMilliseconds(
  presentationTimeInSeconds: number,
  availabilityStartTimeInMilliseconds: number
): number {
  return presentationTimeInSeconds * 1000 + availabilityStartTimeInMilliseconds
}

export function availabilityTimeToPresentationTimeInSeconds(
  availabilityTimeInMilliseconds: number,
  availabilityStartTimeInMilliseconds: number
): number {
  return availabilityTimeInMilliseconds < availabilityStartTimeInMilliseconds
    ? 0
    : (availabilityTimeInMilliseconds - availabilityStartTimeInMilliseconds) / 1000
}

export function presentationTimeToMediaSampleTimeInSeconds(
  presentationTimeInSeconds: number,
  presentationTimeOffsetInMilliseconds: number
): number {
  return presentationTimeInSeconds + presentationTimeOffsetInMilliseconds / 1000
}

export function mediaSampleTimeToPresentationTimeInSeconds(
  mediaSampleTimeInSeconds: number,
  presentationTimeOffsetInMilliseconds: number
): number {
  const presentationTimeOffsetInSeconds = presentationTimeOffsetInMilliseconds / 1000

  return mediaSampleTimeInSeconds < presentationTimeOffsetInSeconds
    ? 0
    : mediaSampleTimeInSeconds - presentationTimeOffsetInSeconds
}

export function clampAvailability(
  availabilityTimeInMilliseconds: number,
  availabilityStartTimeInMilliseconds: number,
  timeShiftBufferDepthInMilliseconds: number
): number {
  const currentUtc = ServerDate.now()

  const earliestUtc =
    currentUtc - timeShiftBufferDepthInMilliseconds > availabilityStartTimeInMilliseconds
      ? currentUtc - timeShiftBufferDepthInMilliseconds
      : availabilityStartTimeInMilliseconds

  return Math.min(Math.max(availabilityTimeInMilliseconds, earliestUtc), currentUtc)
}
