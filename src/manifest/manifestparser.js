import TimeUtils from "./../utils/timeutils"
import DebugTool from "../debugger/debugtool"
import WindowTypes from "../models/windowtypes"
import Plugins from "../plugins"
import PluginEnums from "../pluginenums"

function getSegmentTemplate(mpd) {
  // Can be either audio or video data.
  // It doesn't matter as we use the factor of x/timescale. This is the same for both.
  const segmentTemplate = mpd.querySelector("SegmentTemplate")

  return {
    duration: parseFloat(segmentTemplate.getAttribute("duration")),
    timescale: parseFloat(segmentTemplate.getAttribute("timescale")),
    presentationTimeOffset: parseFloat(segmentTemplate.getAttribute("presentationTimeOffset")),
  }
}

function parseStaticMPD(mpd) {
  const { presentationTimeOffset, timescale } = getSegmentTemplate(mpd)

  return {
    presentationTimeOffsetSeconds: presentationTimeOffset / timescale,
    windowStartTime: NaN,
    windowEndTime: NaN,
  }
}

function parseSlidingMPD(mpd, initialWallclockTime) {
  const { duration, timescale } = getSegmentTemplate(mpd)
  const availabilityStartTime = mpd.getAttribute("availabilityStartTime")
  const segmentLengthMillis = (1000 * duration) / timescale

  if (!availabilityStartTime || !segmentLengthMillis) {
    throw new Error("manifest-dash-attributes-parse-error")
  }

  const timeShiftBufferDepthMillis = 1000 * TimeUtils.durationToSeconds(mpd.getAttribute("timeShiftBufferDepth"))
  const windowEndTime = initialWallclockTime - Date.parse(availabilityStartTime) - segmentLengthMillis
  const windowStartTime = windowEndTime - timeShiftBufferDepthMillis

  return {
    windowStartTime,
    windowEndTime,
    presentationTimeOffsetSeconds: NaN,
  }
}

function parseGrowingMPD(mpd, initialWallclockTime) {
  const { duration, timescale } = getSegmentTemplate(mpd)
  const availabilityStartTime = mpd.getAttribute("availabilityStartTime")
  const segmentLengthMillis = (1000 * duration) / timescale

  if (!availabilityStartTime || !segmentLengthMillis) {
    throw new Error("manifest-dash-attributes-parse-error")
  }

  return {
    windowStartTime: Date.parse(availabilityStartTime),
    windowEndTime: initialWallclockTime - segmentLengthMillis,
    presentationTimeOffsetSeconds: NaN,
  }
}

const parsingStrategyByWindowType = {
  [WindowTypes.GROWING]: parseGrowingMPD,
  [WindowTypes.SLIDING]: parseSlidingMPD,
  [WindowTypes.STATIC]: parseStaticMPD,
}

function parseMPD(manifest, { windowType, initialWallclockTime } = {}) {
  try {
    const mpd = manifest.querySelectorAll("MPD")[0]

    const parse = parsingStrategyByWindowType[windowType]

    if (parse == null) {
      throw new Error(`Could not find a DASH parsing strategy for window type ${windowType}`)
    }

    return parse(mpd, initialWallclockTime)
  } catch (error) {
    const errorWithCode = new Error(error.message ?? "manifest-dash-parse-error")
    errorWithCode.code = PluginEnums.ERROR_CODES.MANIFEST_PARSE
    throw errorWithCode
  }
}

function parseM3U8(manifest) {
  try {
    const windowStartTime = getM3U8ProgramDateTime(manifest)
    const duration = getM3U8WindowSizeInSeconds(manifest)

    if (windowStartTime && duration) {
      const windowEndTime = windowStartTime + duration * 1000

      return {
        windowStartTime,
        windowEndTime,
        presentationTimeOffsetSeconds: NaN,
      }
    }

    throw new Error("manifest-hls-attributes-parse-error")
  } catch (error) {
    const errorWithCode = new Error(error.message || "manifest-hls-parse-error")
    errorWithCode.code = PluginEnums.ERROR_CODES.MANIFEST_PARSE
    throw errorWithCode
  }
}

function getM3U8ProgramDateTime(data) {
  const match = /^#EXT-X-PROGRAM-DATE-TIME:(.*)$/m.exec(data)

  if (match) {
    const parsedDate = Date.parse(match[1])

    if (!isNaN(parsedDate)) {
      return parsedDate
    }
  }
}

function getM3U8WindowSizeInSeconds(data) {
  const regex = /#EXTINF:(\d+(?:\.\d+)?)/g
  let matches = regex.exec(data)
  let result = 0

  while (matches) {
    result += +matches[1]
    matches = regex.exec(data)
  }

  return Math.floor(result)
}

function parse(manifest, { type, windowType, initialWallclockTime } = {}) {
  try {
    if (type === "mpd") {
      return parseMPD(manifest, { windowType, initialWallclockTime })
    } else if (type === "m3u8") {
      return parseM3U8(manifest)
    }
  } catch (error) {
    DebugTool.info(`Manifest Parse Error: ${error.code} ${error.message}`)
    Plugins.interface.onManifestParseError({ code: error.code, message: error.message })

    return {
      windowStartTime: NaN,
      windowEndTime: NaN,
      presentationTimeOffsetSeconds: NaN,
    }
  }
}

export default {
  parse,
}
