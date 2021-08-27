import TimeUtils from './../utils/timeutils'

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
      return { error: 'Error parsing DASH manifest attributes' }
    }
  } catch (e) {
    return { error: 'Error parsing DASH manifest' }
  }
}

function parseM3U8 (manifest) {
  const windowStartTime = getM3U8ProgramDateTime(manifest)
  const duration = getM3U8WindowSizeInSeconds(manifest)

  if (windowStartTime && duration) {
    const windowEndTime = windowStartTime + duration * 1000

    return {
      windowStartTime: windowStartTime,
      windowEndTime: windowEndTime
    }
  } else {
    return { error: 'Error parsing HLS manifest' }
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
  if (type === 'mpd') {
    return parseMPD(manifest, dateWithOffset)
  } else if (type === 'm3u8') {
    return parseM3U8(manifest)
  }
}

export default {
  parse: parse
}
