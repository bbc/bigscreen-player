import { TimeInfo } from "../manifest/manifestparser"

export function durationToSeconds(duration: string) {
  const matches = duration.match(/^PT(\d+(?:[,.]\d+)?H)?(\d+(?:[,.]\d+)?M)?(\d+(?:[,.]\d+)?S)?/) || []

  const hours = parseFloat(matches[1] || "0") * 60 * 60
  const mins = parseFloat(matches[2] || "0") * 60
  const secs = parseFloat(matches[3] || "0")

  return hours + mins + secs || undefined
}

export function createTimeConverter(timeInfo: TimeInfo) {
  function presentationTimeToAvailabilityTimeInMilliseconds(presentationTimeInSeconds: number): number {
    return presentationTimeInSeconds * 1000 + timeInfo.availabilityStartTimeInMilliseconds
  }

  function availabilityTimeToPresentationTimeInSeconds(availabilityTimeInMilliseconds: number): number {
    return availabilityTimeInMilliseconds < timeInfo.availabilityStartTimeInMilliseconds
      ? 0
      : (availabilityTimeInMilliseconds - timeInfo.availabilityStartTimeInMilliseconds) / 1000
  }

  function presentationTimeToMediaSampleTimeInSeconds(presentationTimeInSeconds: number): number {
    return presentationTimeInSeconds + timeInfo.presentationTimeOffsetInMilliseconds / 1000
  }

  function mediaSampleTimeToPresentationTimeInSeconds(mediaSampleTimeInSeconds: number): number {
    return mediaSampleTimeInSeconds - timeInfo.presentationTimeOffsetInMilliseconds / 1000
  }

  return {
    mediaSampleTimeToPresentationTimeInSeconds,
    presentationTimeToMediaSampleTimeInSeconds,
    availabilityTimeToPresentationTimeInSeconds,
    presentationTimeToAvailabilityTimeInMilliseconds,
  }
}

export type TimeConverter = ReturnType<typeof createTimeConverter>

export function convertMilliSecondsToSeconds(timeInMilis: number) {
  return Math.floor(timeInMilis / 1000)
}
