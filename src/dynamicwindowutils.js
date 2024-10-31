import LiveSupport from "./models/livesupport"
import DebugTool from "./debugger/debugtool"

const AUTO_RESUME_WINDOW_START_CUSHION_IN_SECONDS = 8
const FOUR_MINUTES_IN_MILLISECONDS = 4 * 60

function isTimeShiftBufferBigEnoughForSeeking(timeShiftBufferDepthInMilliseconds) {
  return (
    typeof timeShiftBufferDepthInMilliseconds === "number" &&
    isFinite(timeShiftBufferDepthInMilliseconds) &&
    (timeShiftBufferDepthInMilliseconds === 0 || timeShiftBufferDepthInMilliseconds > FOUR_MINUTES_IN_MILLISECONDS)
  )
}

function isSeekableRangeFinite(seekableRange) {
  return (
    seekableRange &&
    typeof seekableRange === "object" &&
    "start" in seekableRange &&
    typeof seekableRange.start === "number" &&
    isFinite(seekableRange.start) &&
    "end" in seekableRange &&
    typeof seekableRange.end === "number" &&
    isFinite(seekableRange.end)
  )
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

function canPause(liveSupport, timeShiftBufferDepthInMilliseconds) {
  return supportsPause(liveSupport) && isTimeShiftBufferBigEnoughForSeeking(timeShiftBufferDepthInMilliseconds)
}

function canSeek(liveSupport, timeShiftBufferDepthInMilliseconds, seekableRange) {
  return (
    supportsSeeking(liveSupport) &&
    isTimeShiftBufferBigEnoughForSeeking(timeShiftBufferDepthInMilliseconds) &&
    isSeekableRangeFinite(seekableRange)
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
  const resumeTimeOut = Math.max(0, currentTime - seekableRange.start - AUTO_RESUME_WINDOW_START_CUSHION_IN_SECONDS)
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
