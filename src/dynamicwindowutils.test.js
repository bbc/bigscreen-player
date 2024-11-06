import { autoResumeAtStartOfRange, canPause, canSeek } from "./dynamicwindowutils"
import LiveSupport from "./models/livesupport"

describe("autoResumeAtStartOfRange", () => {
  const currentTime = 20

  const seekableRange = {
    start: 0,
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

  it("resumes play when the current time is equal to the start of the seekable range", () => {
    autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(20000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("resumes play when the current time at the start of the seekable range within a threshold", () => {
    autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(15000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("resumes play when the current time at the start of the seekable range at the threshold", () => {
    autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(12000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("does not resume play when the current time is past the start of the seekable range plus the threshold", () => {
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
    expect(canPause(LiveSupport.NONE, { start: 0, end: 30 * 60 })).toBe(false)
  })

  it("can't pause playable", () => {
    expect(canPause(LiveSupport.PLAYABLE, { start: 0, end: 30 * 60 })).toBe(false)
  })

  it("can pause restartable", () => {
    expect(canPause(LiveSupport.RESTARTABLE, { start: 0, end: 30 * 60 })).toBe(true)
  })

  it("can pause seekable", () => {
    expect(canPause(LiveSupport.SEEKABLE, { start: 0, end: 30 * 60 })).toBe(true)
  })

  it("can't pause a seekable range less than 4 minutes", () => {
    expect(canPause(LiveSupport.SEEKABLE, { start: 0, end: 3 * 60 })).toBe(false)
  })
})

describe("canSeek", () => {
  it("can't seek no live support", () => {
    expect(canSeek(LiveSupport.NONE, { start: 0, end: 30 * 60 })).toBe(false)
  })

  it("can't seek playable", () => {
    expect(canSeek(LiveSupport.PLAYABLE, { start: 0, end: 30 * 60 })).toBe(false)
  })

  it("can seek restartable", () => {
    expect(canSeek(LiveSupport.RESTARTABLE, { start: 0, end: 30 * 60 })).toBe(true)
  })

  it("can seek seekable", () => {
    expect(canSeek(LiveSupport.SEEKABLE, { start: 0, end: 30 * 60 })).toBe(true)
  })

  it("can't seek a seekable range less than 4 minutes", () => {
    expect(canSeek(LiveSupport.SEEKABLE, { start: 0, end: 3 * 60 })).toBe(false)
  })
})
