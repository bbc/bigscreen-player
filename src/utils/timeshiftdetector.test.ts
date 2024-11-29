import createTimeShiftDetector from "./timeshiftdetector"

beforeAll(() => {
  jest.useFakeTimers()
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
})

it("triggers the callback once time shift is detected on the observed player", () => {
  const mockGetSeekableRange = jest.fn().mockReturnValueOnce({ start: 0, end: 100 })

  const onceTimeShiftDetected = jest.fn()

  const timeShiftDetector = createTimeShiftDetector(onceTimeShiftDetected)

  timeShiftDetector.observe(mockGetSeekableRange)

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()

  mockGetSeekableRange.mockReturnValueOnce({ start: 100, end: 200 })

  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).toHaveBeenCalled()
})

it("does not trigger the callback when only seekable range end changes", () => {
  const mockGetSeekableRange = jest.fn().mockReturnValueOnce({ start: 0, end: 100 })

  const onceTimeShiftDetected = jest.fn()

  const timeShiftDetector = createTimeShiftDetector(onceTimeShiftDetected)

  timeShiftDetector.observe(mockGetSeekableRange)

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()

  mockGetSeekableRange.mockReturnValueOnce({ start: 0, end: 200 })

  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()
})

it("only triggers callback once", () => {
  const mockGetSeekableRange = jest.fn().mockReturnValueOnce({ start: 0, end: 100 })

  const onceTimeShiftDetected = jest.fn()

  const timeShiftDetector = createTimeShiftDetector(onceTimeShiftDetected)

  timeShiftDetector.observe(mockGetSeekableRange)

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()

  mockGetSeekableRange.mockReturnValueOnce({ start: 50, end: 200 })

  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).toHaveBeenCalledTimes(1)

  mockGetSeekableRange.mockReturnValueOnce({ start: 100, end: 200 })

  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).toHaveBeenCalledTimes(1)
})

it("reports seekable range as sliding once time shift is detected on the observed player", () => {
  const mockGetSeekableRange = jest.fn().mockReturnValueOnce({ start: 0, end: 100 })

  const timeShiftDetector = createTimeShiftDetector(jest.fn())

  timeShiftDetector.observe(mockGetSeekableRange)

  expect(timeShiftDetector.isSeekableRangeSliding()).toBe(false)

  mockGetSeekableRange.mockReturnValueOnce({ start: 50, end: 150 })

  jest.advanceTimersToNextTimer()

  expect(timeShiftDetector.isSeekableRangeSliding()).toBe(true)
})

it("does not trigger the callback when timeshift occurs on a disconnected player", () => {
  const mockGetSeekableRange = jest.fn().mockReturnValueOnce({ start: 0, end: 100 })

  const onceTimeShiftDetected = jest.fn()

  const timeShiftDetector = createTimeShiftDetector(onceTimeShiftDetected)

  timeShiftDetector.observe(mockGetSeekableRange)

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()

  timeShiftDetector.disconnect()

  mockGetSeekableRange.mockReturnValueOnce({ start: 50, end: 200 })

  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()
})

it("overwrite the currently observed seekable range with a new seekable range", () => {
  const someSeekableRange = jest.fn().mockReturnValueOnce({ start: 0, end: 100 })

  const onceTimeShiftDetected = jest.fn()

  const timeShiftDetector = createTimeShiftDetector(onceTimeShiftDetected)

  timeShiftDetector.observe(someSeekableRange)

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()

  const otherSeekableRange = jest.fn().mockReturnValueOnce({ start: 30, end: 90 })

  timeShiftDetector.observe(otherSeekableRange)

  someSeekableRange.mockReturnValueOnce({ start: 50, end: 150 }) // sliding
  otherSeekableRange.mockReturnValueOnce({ start: 30, end: 100 }) // not sliding

  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()
})

it("only set/trigger isSliding once device is reporting seekable range reliably", () => {
  const mockGetSeekableRange = jest.fn()

  const onceTimeShiftDetected = jest.fn()

  const timeShiftDetector = createTimeShiftDetector(onceTimeShiftDetected)

  timeShiftDetector.observe(mockGetSeekableRange)

  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()
  expect(timeShiftDetector.isSeekableRangeSliding()).toBe(false)

  mockGetSeekableRange.mockReturnValueOnce({ start: 50, end: 200 })
  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).not.toHaveBeenCalled()
  expect(timeShiftDetector.isSeekableRangeSliding()).toBe(false)

  mockGetSeekableRange.mockReturnValueOnce({ start: 55, end: 200 })
  jest.advanceTimersToNextTimer()

  expect(onceTimeShiftDetected).toHaveBeenCalled()
  expect(timeShiftDetector.isSeekableRangeSliding()).toBe(true)
})
