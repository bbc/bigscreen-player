import TimeUtils from "./../utils/timeutils"
import DebugTool from "../debugger/debugtool"
import WindowTypes from "../models/windowtypes"
import Plugins from "../plugins"
import PluginEnums from "../pluginenums"
import LoadUrl from "../utils/loadurl"

const parsingStrategyByManifestType = {
  mpd: parseMPD,
  m3u8: parseM3U8,
}

const placeholders = {
  windowStartTime: NaN,
  windowEndTime: NaN,
  presentationTimeOffsetSeconds: NaN,
  timeCorrectionSeconds: NaN,
}

function calcPresentationTimeFromWallClock(wallclockTimeInMillis, availabilityStartTimeInMillis) {
  return wallclockTimeInMillis < availabilityStartTimeInMillis
    ? 0
    : wallclockTimeInMillis - availabilityStartTimeInMillis
}
function calcMediaTimeFromPresentationTime(presentationTimeInMillis, offsetInMillis) {
  return presentationTimeInMillis + offsetInMillis
}

function parseMPD(manifestEl, { initialWallclockTime } = {}) {
  const mpd = manifestEl.querySelector("MPD")

  return fetchWallclockTime(mpd, initialWallclockTime)
    .then((wallclockTime) => {
      const { presentationTimeOffset, timescale } = getSegmentTemplate(mpd)
      const type = mpd.getAttribute("type")
      const availabilityStartTimeInMillis = Date.parse(mpd.getAttribute("availabilityStartTime"))
      const timeShiftBufferDepthInMillis = 1000 * TimeUtils.durationToSeconds(mpd.getAttribute("timeShiftBufferDepth"))
      const presentationTimeOffsetInMillis = (1000 * (presentationTimeOffset || 0)) / timescale

      const windowStartTime = calcMediaTimeFromPresentationTime(
        calcPresentationTimeFromWallClock(wallclockTime - timeShiftBufferDepthInMillis, availabilityStartTimeInMillis),
        presentationTimeOffsetInMillis
      )
      const windowEndTime = calcMediaTimeFromPresentationTime(
        calcPresentationTimeFromWallClock(wallclockTime, availabilityStartTimeInMillis),
        presentationTimeOffsetInMillis
      )

      return {
        type,
        availabilityStartTimeInMillis,
        windowStartTime,
        windowEndTime,
        presentationTimeOffsetSeconds: presentationTimeOffset / timescale,
        hasTimeShift: !!timeShiftBufferDepthInMillis,
        // HMW apply timeCorrectionSeconds correctly to webcasts?
        // - Set 0 if PTO is defined
        // - Remove time correction
        timeCorrectionSeconds: windowStartTime / 1000,
      }
    })
    .catch((error) => {
      const errorWithCode = new Error(error.message ?? "manifest-dash-parse-error")
      errorWithCode.code = PluginEnums.ERROR_CODES.MANIFEST_PARSE
      throw errorWithCode
    })
}

function fetchWallclockTime(mpd, initialWallclockTime) {
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

function getSegmentTemplate(mpd) {
  // Can be either audio or video data.
  // It doesn't matter as we use the factor of x/timescale. This is the same for both.
  const segmentTemplate = mpd.querySelector("SegmentTemplate")

  return {
    duration: parseFloat(segmentTemplate.getAttribute("duration")),
    timescale: parseFloat(segmentTemplate.getAttribute("timescale")),
    presentationTimeOffset: parseFloat(segmentTemplate.getAttribute("presentationTimeOffset")) || 0,
  }
}

function parseM3U8(manifest, { windowType } = {}) {
  return new Promise((resolve) => {
    const programDateTime = getM3U8ProgramDateTime(manifest)
    const duration = getM3U8WindowSizeInSeconds(manifest)

    if (!(programDateTime && duration)) {
      throw new Error("manifest-hls-attributes-parse-error")
    }

    if (windowType === WindowTypes.STATIC) {
      return resolve({
        presentationTimeOffsetSeconds: programDateTime / 1000,
      })
    }

    return resolve({
      availabilityStartTimeInMillis: programDateTime,
      windowStartTime: programDateTime,
      windowEndTime: programDateTime + duration * 1000,
    })
  }).catch((error) => {
    const errorWithCode = new Error(error.message || "manifest-hls-parse-error")
    errorWithCode.code = PluginEnums.ERROR_CODES.MANIFEST_PARSE
    throw errorWithCode
  })
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
  const parseManifest = parsingStrategyByManifestType[type]

  return parseManifest(manifest, { windowType, initialWallclockTime })
    .then((values) => ({ ...placeholders, ...values }))
    .catch((error) => {
      DebugTool.error(error)
      Plugins.interface.onManifestParseError({ code: error.code, message: error.message })

      return { ...placeholders }
    })
}

export default {
  parse,
}
