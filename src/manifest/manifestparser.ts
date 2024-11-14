import { durationToSeconds } from "../utils/timeutils"
import DebugTool from "../debugger/debugtool"
import Plugins from "../plugins"
import PluginEnums from "../pluginenums"
import { ManifestType } from "../models/manifesttypes"
import { TransferFormat, DASH, HLS } from "../models/transferformats"
import isError from "../utils/iserror"
import { ErrorWithCode } from "../models/errorcode"

export type TimeInfo = {
  manifestType: ManifestType
  // joinTimeInMilliseconds: number
  presentationTimeOffsetInMilliseconds: number
  timeShiftBufferDepthInMilliseconds: number
  availabilityStartTimeInMilliseconds: number
  // transferFormat: string
}

function getMpdType(mpd: Element): ManifestType {
  const type = mpd.getAttribute("type")

  if (type !== ManifestType.STATIC && type !== ManifestType.DYNAMIC) {
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
  // Can be either audio or video data. It doesn't matter as we use the factor of x/timescale. This is the same for both.
  const segmentTemplate = mpd.querySelector("SegmentTemplate")
  const presentationTimeOffsetInFrames = parseFloat(segmentTemplate?.getAttribute("presentationTimeOffset") ?? "")
  const timescale = parseFloat(segmentTemplate?.getAttribute("timescale") ?? "")

  return (presentationTimeOffsetInFrames / timescale) * 1000 || 0
}

function parseMPD(manifestEl: Document): Promise<TimeInfo> {
  const mpd = manifestEl.querySelector("MPD")

  if (mpd == null) {
    return Promise.reject(new TypeError("Bad manifest"))
  }

  const manifestType = getMpdType(mpd)
  const presentationTimeOffsetInMilliseconds = getPresentationTimeOffsetInMilliseconds(mpd)
  const availabilityStartTimeInMilliseconds = getAvailabilityStartTimeInMilliseconds(mpd)
  const timeShiftBufferDepthInMilliseconds = getTimeShiftBufferDepthInMilliseconds(mpd)

  return Promise.resolve({
    manifestType,
    timeShiftBufferDepthInMilliseconds,
    availabilityStartTimeInMilliseconds,
    presentationTimeOffsetInMilliseconds,
    // transferFormat: DASH,
  })
}

function parseM3U8(manifest: string): Promise<TimeInfo> {
  return new Promise<TimeInfo>((resolve) => {
    const programDateTimeInMilliseconds = getM3U8ProgramDateTimeInMilliseconds(manifest)
    const durationInMilliseconds = getM3U8WindowSizeInMilliseconds(manifest)

    if (
      programDateTimeInMilliseconds == null ||
      durationInMilliseconds == null ||
      (programDateTimeInMilliseconds === 0 && durationInMilliseconds === 0)
    ) {
      throw new Error("manifest-hls-attributes-parse-error")
    }

    return resolve({
      manifestType: hasM3U8EndList(manifest) ? ManifestType.STATIC : ManifestType.DYNAMIC,
      timeShiftBufferDepthInMilliseconds: 0,
      // joinTimeInMilliseconds: programDateTimeInMilliseconds + durationInMilliseconds,
      availabilityStartTimeInMilliseconds: programDateTimeInMilliseconds,
      presentationTimeOffsetInMilliseconds: programDateTimeInMilliseconds,
      // transferFormat: HLS,
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

  return isNaN(parsedDate) ? null : parsedDate
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

function parse({ body, type }: { body: Document; type: DASH } | { body: string; type: HLS }): Promise<TimeInfo> {
  return Promise.resolve()
    .then(() => {
      switch (type) {
        case TransferFormat.DASH:
          return parseMPD(body)
        case TransferFormat.HLS:
          return parseM3U8(body)
      }
    })
    .catch((error: ErrorWithCode) => {
      DebugTool.error(error)
      Plugins.interface.onManifestParseError({ code: error.code, message: error.message })

      return {
        manifestType: ManifestType.STATIC,
        timeShiftBufferDepthInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        presentationTimeOffsetInMilliseconds: 0,
        // transferFormat: DASH,
      }
    })
}

export default {
  parse,
}
