import { autoResumeAtStartOfRange, canPauseAndSeek } from "./dynamicwindowutils"
import LiveSupport from "./models/livesupport"

describe("autoResumeAtStartOfRange", () => {
  const currentTime = 20

  const seekableRange = {
    start: 0,
    end: 7200,
  }

  let resume
  let addEventCallback
  let removeEventCallback
  let checkNotPauseEvent

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeAll(() => {
    jest.useFakeTimers()
  })

  beforeEach(() => {
    jest.clearAllTimers()

    resume = jest.fn()
    addEventCallback = jest.fn()
    removeEventCallback = jest.fn()
    checkNotPauseEvent = jest.fn()
  })

  it.each([
    [0, 7200, 20],
    [3600, 10800, 3620],
  ])(
    "resumes play when the start of the seekable range (%d - %d) catches up to current time %d",
    (seekableRangeStart, seekableRangeEnd, currentTime) => {
      const seekableRange = {
        start: seekableRangeStart,
        end: seekableRangeEnd,
      }

      autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

      jest.advanceTimersByTime(20000)

      expect(addEventCallback).toHaveBeenCalledTimes(1)
      expect(removeEventCallback).toHaveBeenCalledTimes(1)
      expect(resume).toHaveBeenCalledTimes(1)
    }
  )

  it("resumes play when the start of the seekable range is within a threshold of current time", () => {
    autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(15000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("resumes play when the start of the seekable range is at the threshold of current time", () => {
    autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(12000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("resumes play when the start of the time shift buffer is at the threshold of current time", () => {
    const seekableRange = { start: 0, end: 7170 }

    autoResumeAtStartOfRange(30, seekableRange, addEventCallback, removeEventCallback, undefined, resume, 7200)

    expect(addEventCallback).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(40000)

    expect(resume).not.toHaveBeenCalled()
    expect(removeEventCallback).not.toHaveBeenCalled()

    jest.advanceTimersByTime(20000)

    expect(resume).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
  })

  it("does not resume play when the start of the seekable range has not caught up to current time", () => {
    autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(10000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(0)
    expect(resume).toHaveBeenCalledTimes(0)
  })

  it("non pause event stops autoresume", () => {
    checkNotPauseEvent.mockImplementation(() => true)

    addEventCallback.mockImplementation((_, callback) => callback())

    autoResumeAtStartOfRange(
      currentTime,
      seekableRange,
      addEventCallback,
      removeEventCallback,
      checkNotPauseEvent,
      resume
    )

    jest.advanceTimersByTime(20000)

    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(0)
  })

  it("pause event does not stop autoresume", () => {
    checkNotPauseEvent.mockImplementation(() => false)

    addEventCallback.mockImplementation((_, callback) => callback())

    autoResumeAtStartOfRange(
      currentTime,
      seekableRange,
      addEventCallback,
      removeEventCallback,
      checkNotPauseEvent,
      resume
    )

    jest.advanceTimersByTime(20000)

    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })
})

describe("canPause", () => {
  it("can't pause no live support", () => {
    expect(canPauseAndSeek(LiveSupport.NONE, { start: 0, end: 30 * 60 })).toBe(false)
  })

  it("can't pause playable", () => {
    expect(canPauseAndSeek(LiveSupport.PLAYABLE, { start: 0, end: 30 * 60 })).toBe(false)
  })

  it("can't pause restartable", () => {
    expect(canPauseAndSeek(LiveSupport.RESTARTABLE, { start: 0, end: 30 * 60 })).toBe(false)
  })

  it("can pause seekable", () => {
    expect(canPauseAndSeek(LiveSupport.SEEKABLE, { start: 0, end: 30 * 60 })).toBe(true)
  })

  it("can't pause a seekable range less than 4 minutes", () => {
    expect(canPauseAndSeek(LiveSupport.SEEKABLE, { start: 0, end: 3 * 60 })).toBe(false)
  })
})
