import WindowTypes from "../../models/windowtypes"
import TimeUtils from "../timeutils"
import buildSourceAnchor from "./build-source-anchor"

beforeEach(() => {
  jest.useFakeTimers({ now: 1000 })
})

it.each([undefined, null, NaN, Infinity])("returns an empty string for '%s'", (value) => {
  expect(buildSourceAnchor(value)).toBe("")
})

describe("when an MPD time is provided", () => {
  it.each([0, 12, 420])("returns `#t=%d` for a STATIC window with zero point in MPD time", (time) => {
    expect(buildSourceAnchor(time, "mpdTime", { windowType: WindowTypes.STATIC })).toBe(`#t=${time}`)
  })

  it.each([0, 12, 420])("returns `#t=%d` for a GROWING window with zero point in MPD time", (time) => {
    expect(buildSourceAnchor(time, "mpdTime", { windowType: WindowTypes.GROWING })).toBe(`#t=${time}`)
  })

  it.each([
    Date.now() / 1000,
    new Date("1970-01-01T00:00:00Z").getTime() / 1000,
    (Date.now() - new Date("1970-01-01T00:01:00Z").getTime()) / 1000,
  ])("returns `#t=%i` for a SLIDING window given MPD time", (time) => {
    expect(buildSourceAnchor(time, "mpdTime", { windowType: WindowTypes.SLIDING })).toBe(`#t=${Math.floor(time)}`)
  })
})

describe("when a video time is provided", () => {
  it("returns an empty string when video time is 0 for a STATIC window", () => {
    expect(buildSourceAnchor(0, undefined, { windowType: WindowTypes.STATIC })).toBe("")
  })

  // [tag:DeviceIssue]
  it("returns anchor #t as 'wall-clock time stream was available + 1' given video time 0 and GROWING window", () => {
    const initialSeekableRangeStartSeconds = Date.now() / 1000

    expect(buildSourceAnchor(0, undefined, { initialSeekableRangeStartSeconds, windowType: WindowTypes.GROWING })).toBe(
      `#t=posix:${1 + Math.floor(initialSeekableRangeStartSeconds)}`
    )
  })

  // [tag:DeviceIssue]
  it("returns anchor #t=1 in MPD time given video time 0 and SLIDING window", () => {
    const initialSeekableRangeStartSeconds = Date.now() / 1000

    expect(buildSourceAnchor(0, undefined, { initialSeekableRangeStartSeconds, windowType: WindowTypes.SLIDING })).toBe(
      `#t=${1 + Math.floor(initialSeekableRangeStartSeconds)}`
    )
  })
})

describe.each([12, 420])("when a video time is provided", (videoTimeSeconds) => {
  it(`returns anchor #t=${videoTimeSeconds} in MPD time given video time '${videoTimeSeconds}' and STATIC window`, () => {
    expect(buildSourceAnchor(videoTimeSeconds, undefined, { windowType: WindowTypes.STATIC })).toBe(
      `#t=${videoTimeSeconds}`
    )
  })

  it(`returns anchor #t in wall-clock (availability) time given video time '${videoTimeSeconds}' and GROWING window`, () => {
    const initialSeekableRangeStartSeconds = Date.now() / 1000

    expect(
      buildSourceAnchor(videoTimeSeconds, undefined, {
        initialSeekableRangeStartSeconds,
        windowType: WindowTypes.GROWING,
      })
    ).toBe(`#t=posix:${initialSeekableRangeStartSeconds + videoTimeSeconds}`)
  })

  it(`returns anchor #t in MPD time given video time '${videoTimeSeconds}' and SLIDING window`, () => {
    const initialSeekableRangeStartSeconds = Date.now() / 1000 - TimeUtils.durationToSeconds("PT2H1M")

    expect(
      buildSourceAnchor(videoTimeSeconds, undefined, {
        initialSeekableRangeStartSeconds,
        windowType: WindowTypes.SLIDING,
      })
    ).toBe(`#t=${initialSeekableRangeStartSeconds + videoTimeSeconds}`)
  })
})
