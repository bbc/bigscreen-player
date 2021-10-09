import DynamicWindowUtils from './dynamicwindowutils'

describe('autoResumeAtStartOfRange', () => {
  const currentTime = 20
  const seekableRange = {
    start: 0
  }

  let resume
  let addEventCallback
  let removeEventCallback
  let checkNotPauseEvent

  beforeEach(() => {
    jest.useFakeTimers()

    resume = jest.fn()
    addEventCallback = jest.fn()
    removeEventCallback = jest.fn()
    checkNotPauseEvent = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('resumes play when the current time is equal to the start of the seekable range', () => {
    DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(20000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('resumes play when the current time at the start of the seekable range within a threshold', () => {
    DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(15000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('resumes play when the current time at the start of the seekable range at the threshold', () => {
    DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(12000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('does not resume play when the current time is past the start of the seekable range plus the threshold', () => {
    DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume)

    jest.advanceTimersByTime(10000)

    expect(addEventCallback).toHaveBeenCalledTimes(1)
    expect(removeEventCallback).toHaveBeenCalledTimes(0)
    expect(resume).toHaveBeenCalledTimes(0)
  })

  it('non pause event stops autoresume', () => {
    checkNotPauseEvent.mockImplementation(() => true)

    addEventCallback.mockImplementation((_, callback) => callback())

    DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, checkNotPauseEvent, resume)

    jest.advanceTimersByTime(20000)

    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(0)
  })

  it('pause event does not stop autoresume', () => {
    checkNotPauseEvent.mockImplementation(() => false)

    addEventCallback.mockImplementation((_, callback) => callback())

    DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, checkNotPauseEvent, resume)

    jest.advanceTimersByTime(20000)

    expect(removeEventCallback).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(1)
  })
})
