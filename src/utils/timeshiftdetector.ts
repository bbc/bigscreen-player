export type TimeShiftDetector = ReturnType<typeof createTimeShiftDetector>

const MINUTE_IN_MILLISECONDS = 60000

// type SeekableRange = {
//   start: number
//   end: number
// }

// function isValidSeekableRange(obj: unknown): obj is SeekableRange {
//   return (
//     obj != null &&
//     typeof obj === "object" &&
//     "start" in obj &&
//     "end" in obj &&
//     typeof obj.start === "number" &&
//     typeof obj.end === "number" &&
//     isFinite(obj.start) &&
//     obj.end > obj.start
//   )
// }

export default function createTimeShiftDetector(onceDetected: () => void) {
  let currentIntervalId: ReturnType<typeof setInterval> | undefined
  let lastSeekableRangeStart: number = 0
  let isSliding: boolean = false

  function observe(getSeekableRange: () => { start: number; end: number }) {
    if (currentIntervalId != null) {
      disconnect()
    }

    lastSeekableRangeStart = getSeekableRange().start

    currentIntervalId = setInterval(() => {
      const currentSeekableRangeStart = getSeekableRange().start

      if (currentSeekableRangeStart > lastSeekableRangeStart) {
        isSliding = true

        onceDetected()

        disconnect()
      }
    }, MINUTE_IN_MILLISECONDS)
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
