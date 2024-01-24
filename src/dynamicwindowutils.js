import LiveSupport from "./models/livesupport"
import DebugTool from "./debugger/debugtool"

const AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8
const FOUR_MINUTES = 4 * 60

function convertMilliSecondsToSeconds(timeInMilis) {
  return Math.floor(timeInMilis / 1000)
}

function hasFiniteSeekableRange(seekableRange) {
  let hasRange = true
  try {
    hasRange = seekableRange.end !== Infinity
  } catch (_error) {
    /* empty */
  }
  return hasRange
}

function canSeek(windowStart, windowEnd, liveSupport, seekableRange) {
  return (
    supportsSeeking(liveSupport) &&
    initialWindowIsBigEnoughForSeeking(windowStart, windowEnd) &&
    hasFiniteSeekableRange(seekableRange)
  )
}

function canPause(windowStart, windowEnd, liveSupport) {
  return supportsPause(liveSupport) && initialWindowIsBigEnoughForSeeking(windowStart, windowEnd)
}

function initialWindowIsBigEnoughForSeeking(windowStart, windowEnd) {
  const start = convertMilliSecondsToSeconds(windowStart)
  const end = convertMilliSecondsToSeconds(windowEnd)
  return end - start > FOUR_MINUTES
}

function supportsPause(liveSupport) {
  return liveSupport === LiveSupport.SEEKABLE || liveSupport === LiveSupport.RESTARTABLE
}

function supportsSeeking(liveSupport) {
  return (
    liveSupport === LiveSupport.SEEKABLE ||
    (liveSupport === LiveSupport.RESTARTABLE && window.bigscreenPlayer.playbackStrategy === "nativestrategy")
  )
}

function autoResumeAtStartOfRange(
  currentTime,
  seekableRange,
  addEventCallback,
  removeEventCallback,
  checkNotPauseEvent,
  resume
) {
  const resumeTimeOut = Math.max(0, currentTime - seekableRange.start - AUTO_RESUME_WINDOW_START_CUSHION_SECONDS)
  DebugTool.dynamicMetric("auto-resume", resumeTimeOut)
  const autoResumeTimer = setTimeout(() => {
    removeEventCallback(undefined, detectIfUnpaused)
    resume()
  }, resumeTimeOut * 1000)

  addEventCallback(undefined, detectIfUnpaused)

  function detectIfUnpaused(event) {
    if (checkNotPauseEvent(event)) {
      removeEventCallback(undefined, detectIfUnpaused)
      clearTimeout(autoResumeTimer)
    }
  }
}

export default {
  autoResumeAtStartOfRange,
  canPause,
  canSeek,
}
