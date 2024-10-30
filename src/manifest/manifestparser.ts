import { durationToSeconds } from "../utils/timeutils"
import DebugTool from "../debugger/debugtool"
import Plugins from "../plugins"
import PluginEnums from "../pluginenums"
import LoadUrl from "../utils/loadurl"
import ManifestType from "../models/manifesttypes"
import { DASH, HLS } from "../models/transferformats"
import isError from "../utils/is-error"
import { ErrorWithCode } from "../models/error-code"

export type TimeInfo = {
  type: ManifestType
  windowStartTime: number
  windowEndTime: number
  joinTimeInMilliseconds: number
  presentationTimeOffsetInSeconds: number
  timeShiftBufferDepthInMilliseconds: number
  availabilityStartTimeInMilliseconds: number
  transferFormat: string
}

function calcPresentationTimeFromWallClock(wallclockTimeInMillis: number, availabilityStartTimeInMillis: number) {
  return wallclockTimeInMillis < availabilityStartTimeInMillis
    ? 0
    : wallclockTimeInMillis - availabilityStartTimeInMillis
}
function calcMediaTimeFromPresentationTime(presentationTimeInMillis: number, offsetInMillis: number) {
  return presentationTimeInMillis + offsetInMillis
}

function getMpdType(mpd: Element): ManifestType {
  const type = mpd.getAttribute("type")

  if (type == null) {
    throw new TypeError("Oops")
  }

  return type as ManifestType
}

function getAvailabilityStartTimeInMilliseconds(mpd: Element): number {
  return Date.parse(mpd.getAttribute("availabilityStartTime") ?? "") || 0
}

function getTimeShiftBufferDepthInMilliseconds(mpd: Element): number {
  return (durationToSeconds(mpd.getAttribute("timeShiftBufferDepth") ?? "") || 0) * 1000
}

function getPresentationTimeOffsetInMilliseconds(mpd: Element): number {
  // Can be either audio or video data.
  // It doesn't matter as we use the factor of x/timescale. This is the same for both.
  const segmentTemplate = mpd.querySelector("SegmentTemplate")
  const presentationTimeOffsetInFrames = parseFloat(segmentTemplate?.getAttribute("presentationTimeOffset") ?? "")
  const timescale = parseFloat(segmentTemplate?.getAttribute("timescale") ?? "")

  return (presentationTimeOffsetInFrames / timescale) * 1000 || 0
}

function parseMPD(
  manifestEl: Document,
  { initialWallclockTime }: Partial<{ initialWallclockTime: number }> = {}
): Promise<TimeInfo> {
  const mpd = manifestEl.querySelector("MPD")

  if (mpd == null) {
    return Promise.reject(new TypeError("Oops bad manifest"))
  }

  return fetchWallclockTime(mpd, initialWallclockTime)
    .then((wallclockTime) => {
      const type = getMpdType(mpd)
      const presentationTimeOffsetInMilliseconds = getPresentationTimeOffsetInMilliseconds(mpd)
      const availabilityStartTimeInMilliseconds = getAvailabilityStartTimeInMilliseconds(mpd)
      const timeShiftBufferDepthInMilliseconds = getTimeShiftBufferDepthInMilliseconds(mpd)

      const windowStartTime = calcMediaTimeFromPresentationTime(
        calcPresentationTimeFromWallClock(
          wallclockTime - timeShiftBufferDepthInMilliseconds,
          availabilityStartTimeInMilliseconds
        ),
        presentationTimeOffsetInMilliseconds
      )
      const windowEndTime = calcMediaTimeFromPresentationTime(
        calcPresentationTimeFromWallClock(wallclockTime, availabilityStartTimeInMilliseconds),
        presentationTimeOffsetInMilliseconds
      )

      return {
        type,
        windowEndTime,
        windowStartTime,
        joinTimeInMilliseconds: wallclockTime,
        timeShiftBufferDepthInMilliseconds,
        availabilityStartTimeInMilliseconds,
        presentationTimeOffsetInSeconds: presentationTimeOffsetInMilliseconds / 1000,
        transferFormat: DASH,
      }
    })
    .catch((reason: unknown) => {
      const errorWithCode = (isError(reason) ? reason : new Error("manifest-dash-parse-error")) as ErrorWithCode
      errorWithCode.code = PluginEnums.ERROR_CODES.MANIFEST_PARSE
      throw errorWithCode
    })
}

function fetchWallclockTime(mpd: Element, initialWallclockTime?: number): Promise<number> {
  // TODO: `serverDate`/`initialWallClockTime` is deprecated. Remove this.
  // [tag:ServerDate]
  if (initialWallclockTime) {
    // console.warn("Deprecated")
    return Promise.resolve(initialWallclockTime)
  }

  return new Promise((resolveFetch, rejectFetch) => {
    const timingResource = mpd.querySelector("UTCTiming")?.getAttribute("value")

    if (!timingResource || typeof timingResource !== "string") {
      throw new TypeError("manifest-dash-timing-error")
    }

    LoadUrl(timingResource, {
      onLoad: (_, utcTimeString) => resolveFetch(Date.parse(utcTimeString)),
      onError: () => rejectFetch(new Error("manifest-dash-timing-error")),
    })
  })
}

function parseM3U8(manifest: string, { fakeTimeShift }: Partial<{ fakeTimeShift: boolean }> = {}): Promise<TimeInfo> {
  return new Promise<TimeInfo>((resolve) => {
    const programDateTimeInMilliseconds = getM3U8ProgramDateTimeInMilliseconds(manifest)
    const durationInMilliseconds = getM3U8WindowSizeInMilliseconds(manifest)

    if (programDateTimeInMilliseconds == null || durationInMilliseconds == null) {
      throw new Error("manifest-hls-attributes-parse-error")
    }

    return resolve({
      type: hasM3U8EndList(manifest) ? ManifestType.STATIC : ManifestType.DYNAMIC,
      windowStartTime: programDateTimeInMilliseconds,
      timeShiftBufferDepthInMilliseconds: fakeTimeShift ? durationInMilliseconds : 0,
      windowEndTime: programDateTimeInMilliseconds + durationInMilliseconds,
      joinTimeInMilliseconds: programDateTimeInMilliseconds + durationInMilliseconds,
      availabilityStartTimeInMilliseconds: programDateTimeInMilliseconds,
      presentationTimeOffsetInSeconds: programDateTimeInMilliseconds / 1000,
      transferFormat: HLS,
    })
  }).catch((reason: unknown) => {
    const errorWithCode = (isError(reason) ? reason : new Error("manifest-dash-parse-error")) as ErrorWithCode
    errorWithCode.code = PluginEnums.ERROR_CODES.MANIFEST_PARSE
    throw errorWithCode
  })
}

function getM3U8ProgramDateTimeInMilliseconds(data: string) {
  const match = /^#EXT-X-PROGRAM-DATE-TIME:(.*)$/m.exec(data)

  if (match == null) {
    return 0
  }

  const parsedDate = Date.parse(match[1])

  return isNaN(parsedDate) ? 0 : parsedDate
}

function getM3U8WindowSizeInMilliseconds(data: string): number {
  const regex = /#EXTINF:(\d+(?:\.\d+)?)/g
  let matches = regex.exec(data)
  let result = 0

  while (matches) {
    result += +matches[1]
    matches = regex.exec(data)
  }

  return Math.floor(result * 1000)
}

function hasM3U8EndList(data: string): boolean {
  const match = /^#EXT-X-ENDLIST$/m.exec(data)

  return match != null
}

function parse(
  { body, type }: { body: Document; type: DASH } | { body: string; type: HLS },
  { initialWallclockTime, hlsFakeTimeShift }: { initialWallclockTime?: number; hlsFakeTimeShift?: boolean } = {}
): Promise<TimeInfo> {
  return Promise.resolve()
    .then(() => {
      switch (type) {
        case DASH:
          return parseMPD(body, { initialWallclockTime })
        case HLS:
          return parseM3U8(body, { fakeTimeShift: hlsFakeTimeShift })
      }
    })
    .catch((error: ErrorWithCode) => {
      DebugTool.error(error)
      Plugins.interface.onManifestParseError({ code: error.code, message: error.message })

      return {
        type: ManifestType.STATIC,
        windowStartTime: 0,
        windowEndTime: 0,
        joinTimeInMilliseconds: 0,
        presentationTimeOffsetInSeconds: 0,
        timeShiftBufferDepthInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        transferFormat: DASH,
      }
    })
}

export default {
  parse,
}
