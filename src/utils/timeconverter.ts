import { TimeInfo } from "../manifest/manifestparser"
import { ManifestType } from "../models/manifesttypes"

export default function createTimeConverter(timeInfo: TimeInfo) {
  function presentationTimeToAvailabilityTimeInMilliseconds(presentationTimeInSeconds: number): number | null {
    if (timeInfo.manifestType === ManifestType.STATIC) {
      return null
    }

    return presentationTimeInSeconds * 1000 + timeInfo.availabilityStartTimeInMilliseconds
  }

  function availabilityTimeToPresentationTimeInSeconds(availabilityTimeInMilliseconds: number): number | null {
    if (timeInfo.manifestType === ManifestType.STATIC) {
      return null
    }

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
    presentationTimeToAvailabilityTimeInMilliseconds,
    availabilityTimeToPresentationTimeInSeconds,
    presentationTimeToMediaSampleTimeInSeconds,
    mediaSampleTimeToPresentationTimeInSeconds,
  }
}
