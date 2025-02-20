import LiveSupport from "./models/livesupport"
import DebugTool from "./debugger/debugtool"
import PlaybackStrategy from "./models/playbackstrategy"

const AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8
const FOUR_MINUTES = 4 * 60

declare global {
  interface Window {
    bigscreenPlayer?: {
      playbackStrategy: PlaybackStrategy
      liveSupport?: LiveSupport
    }
  }
}

type SeekableRange = {
  start: number
  end: number
}

function isSeekableRange(obj: unknown): obj is SeekableRange {
  return (
    obj != null &&
    typeof obj === "object" &&
    "start" in obj &&
    "end" in obj &&
    typeof obj.start === "number" &&
    typeof obj.end === "number" &&
    isFinite(obj.start) &&
    isFinite(obj.end)
  )
}

function isSeekableRangeBigEnough({ start, end }: SeekableRange): boolean {
  return end - start > FOUR_MINUTES
}

export function canPauseAndSeek(liveSupport: LiveSupport, seekableRange: unknown): boolean {
  return (
    liveSupport === LiveSupport.SEEKABLE && isSeekableRange(seekableRange) && isSeekableRangeBigEnough(seekableRange)
  )
}

export function autoResumeAtStartOfRange(
  currentTime: number,
  seekableRange: SeekableRange,
  addEventCallback: (thisArg: undefined, callback: (event: unknown) => void) => void,
  removeEventCallback: (thisArg: undefined, callback: (event: unknown) => void) => void,
  checkNotPauseEvent: (event: unknown) => boolean,
  resume: () => void,
  timeShiftBufferDepthInSeconds?: number
): void {
  const { start, end } = seekableRange

  const duration = end - start

  const windowLengthInSeconds =
    timeShiftBufferDepthInSeconds && duration < timeShiftBufferDepthInSeconds ? timeShiftBufferDepthInSeconds : duration

  const resumeTimeOut = Math.max(
    0,
    windowLengthInSeconds - (end - currentTime) - AUTO_RESUME_WINDOW_START_CUSHION_SECONDS
  )

  DebugTool.dynamicMetric("auto-resume", resumeTimeOut)

  const autoResumeTimer = setTimeout(() => {
    removeEventCallback(undefined, detectIfUnpaused)
    resume()
  }, resumeTimeOut * 1000)

  addEventCallback(undefined, detectIfUnpaused)

  function detectIfUnpaused(event: unknown) {
    if (checkNotPauseEvent(event)) {
      removeEventCallback(undefined, detectIfUnpaused)
      clearTimeout(autoResumeTimer)
    }
  }
}
