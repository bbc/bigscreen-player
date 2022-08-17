import TimeUtils from './../utils/timeutils'
import DebugTool from '../debugger/debugtool'
import Plugins from '../plugins'
import pluginenums from '../pluginenums'

function parseMPD (manifest, dateWithOffset) {
  try {
    const mpd = manifest.getElementsByTagName('MPD')[0]
    const availabilityStartTime = Date.parse(mpd.getAttribute('availabilityStartTime'))
    const tsbdAttr = mpd.getAttribute('timeShiftBufferDepth')
    const timeShiftBufferDepth = tsbdAttr && TimeUtils.durationToSeconds(tsbdAttr)

    // Getting zeroth SegmentTemplate may grab either audio or video
    // data. This shouldn't matter as we only use the factor of
    // duration/timescale, which is the same for both.
    const segmentTemplate = manifest.getElementsByTagName('SegmentTemplate')[0]
    const timescale = parseFloat(segmentTemplate.getAttribute('timescale'))
    const duration = parseFloat(segmentTemplate.getAttribute('duration'))
    const oneSegment = 1000 * duration / timescale

    if (availabilityStartTime && oneSegment) {
      const windowEndTime = dateWithOffset - (timeShiftBufferDepth ? availabilityStartTime : 0) - oneSegment
      const windowStartTime = timeShiftBufferDepth ? windowEndTime - (timeShiftBufferDepth * 1000) : availabilityStartTime
      const timeCorrection = timeShiftBufferDepth ? windowStartTime / 1000 : 0

      return {
        windowStartTime: windowStartTime,
        windowEndTime: windowEndTime,
        correction: timeCorrection
      }
    } else {
      throw new Error('manifest-dash-attributes-parse-error')
    }
  } catch (e) {
    const error = new Error(e.message || 'manifest-dash-parse-error')
    error.code = pluginenums.ERROR_CODES.MANIFEST_PARSE
    throw error
  }
}

function parseM3U8 (manifest) {
  try {
    const windowStartTime = getM3U8ProgramDateTime(manifest)
    const duration = getM3U8WindowSizeInSeconds(manifest)
  
    if (windowStartTime && duration) {
      const windowEndTime = windowStartTime + duration * 1000
  
      return {
        windowStartTime: windowStartTime,
        windowEndTime: windowEndTime
      }
    } else {
      throw new Error('manifest-hls-attributes-parse-error')
    }
  } catch (e) {
    const error = new Error(e.message || 'manifest-hls-parse-error')
    error.code = pluginenums.ERROR_CODES.MANIFEST_PARSE
    throw error
  }
}

function getM3U8ProgramDateTime (data) {
  const match = /^#EXT-X-PROGRAM-DATE-TIME:(.*)$/m.exec(data)

  if (match) {
    const parsedDate = Date.parse(match[1])

    if (!isNaN(parsedDate)) {
      return parsedDate
    }
  }
}

function getM3U8WindowSizeInSeconds (data) {
  const regex = /#EXTINF:(\d+(?:\.\d+)?)/g
  let matches = regex.exec(data)
  let result = 0

  while (matches) {
    result += (+matches[1])
    matches = regex.exec(data)
  }

  return Math.floor(result)
}

function parse (manifest, type, dateWithOffset) {
  const fallback = {
    windowStartTime: null,
    windowEndTime: null,
    correction: 0 
  }

  try {
    if (type === 'mpd') {
      return parseMPD(manifest, dateWithOffset)
    } else if (type === 'm3u8') {
      return parseM3U8(manifest)
    }
  } catch (e) {
    DebugTool.error('Manifest Parse Error: ' + e.code + ' ' + e.message)
    Plugins.interface.onManifestParseError({code: e.code, message: e.message})
    return fallback
  }
}

export default {
  parse: parse
}
