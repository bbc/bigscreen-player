import { TimeInfo } from "../manifest/manifestparser"
import { TransferFormat } from "../models/transferformats"
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

function clampAvailabilityForDash(presentationTimeInSeconds: number, streamInfo: TimeInfo): number {
  const { timeShiftBufferDepthInMilliseconds, availabilityStartTimeInMilliseconds } = streamInfo

  const currentUtc = ServerDate.now()

  const earliestUtc =
    currentUtc - timeShiftBufferDepthInMilliseconds > availabilityStartTimeInMilliseconds
      ? currentUtc - timeShiftBufferDepthInMilliseconds
      : availabilityStartTimeInMilliseconds

  const availabilityTimeInMillis = presentationTimeToAvailabilityTimeInMilliseconds(
    presentationTimeInSeconds,
    availabilityStartTimeInMilliseconds
  )

  const safeTimeInMillis = Math.min(Math.max(availabilityTimeInMillis, earliestUtc), currentUtc)

  return availabilityTimeToPresentationTimeInSeconds(safeTimeInMillis, availabilityStartTimeInMilliseconds)
}

function clampAvailabilityForHls(presentationTimeInSeconds: number, streamInfo: TimeInfo): number {
  const { presentationTimeOffsetInMilliseconds } = streamInfo

  const mediaSampleTimeInSeconds = presentationTimeToMediaSampleTimeInSeconds(
    presentationTimeInSeconds,
    presentationTimeOffsetInMilliseconds
  )

  return mediaSampleTimeToPresentationTimeInSeconds(mediaSampleTimeInSeconds, presentationTimeOffsetInMilliseconds)
}

export function clampAvailability(
  presentationTimeInSeconds: number,
  transferFormat: TransferFormat,
  streamInfo: TimeInfo
): number {
  switch (transferFormat) {
    case TransferFormat.DASH:
      return clampAvailabilityForDash(presentationTimeInSeconds, streamInfo)
    case TransferFormat.HLS:
      return clampAvailabilityForHls(presentationTimeInSeconds, streamInfo)
    default:
      throw new Error(`Cannot clamp to safe range for transfer format. (got ${transferFormat})`)
  }
}
