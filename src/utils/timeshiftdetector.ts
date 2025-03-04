export type TimeShiftDetector = ReturnType<typeof createTimeShiftDetector>

const TEN_SECONDS_IN_MILLISECONDS = 10000

type SeekableRange = {
  start: number
  end: number
}

function isValidSeekableRange(obj: unknown): obj is SeekableRange {
  return (
    obj != null &&
    typeof obj === "object" &&
    "start" in obj &&
    "end" in obj &&
    typeof obj.start === "number" &&
    typeof obj.end === "number" &&
    isFinite(obj.start) &&
    obj.end > obj.start
  )
}

export default function createTimeShiftDetector(onceDetected: () => void) {
  let currentIntervalId: ReturnType<typeof setInterval> | undefined
  let lastSeekableRangeStart: number | undefined
  let isSliding: boolean = false

  function observe(getSeekableRange: () => unknown) {
    if (currentIntervalId != null) {
      disconnect()
    }

    const initialRange = getSeekableRange()

    lastSeekableRangeStart = isValidSeekableRange(initialRange) ? initialRange.start : undefined

    currentIntervalId = setInterval(() => {
      const currentRange = getSeekableRange()

      const currentSeekableRangeStart = isValidSeekableRange(currentRange) ? currentRange.start : undefined

      if (
        typeof lastSeekableRangeStart === "number" &&
        typeof currentSeekableRangeStart === "number" &&
        currentSeekableRangeStart > lastSeekableRangeStart
      ) {
        isSliding = true

        onceDetected()

        disconnect()
      }

      lastSeekableRangeStart = currentSeekableRangeStart
    }, TEN_SECONDS_IN_MILLISECONDS)
  }

  function disconnect() {
    clearInterval(currentIntervalId)

    currentIntervalId = undefined
  }

  function isSeekableRangeSliding() {
    return isSliding
  }

  return { disconnect, isSeekableRangeSliding, observe }
}
