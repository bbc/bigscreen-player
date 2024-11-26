import {
  availabilityTimeToPresentationTimeInSeconds,
  durationToSeconds,
  mediaSampleTimeToPresentationTimeInSeconds,
  presentationTimeToAvailabilityTimeInMilliseconds,
  presentationTimeToMediaSampleTimeInSeconds,
} from "./timeutils"

describe("Duration to seconds", () => {
  const testCases: [string, number | undefined][] = [
    ["PT2H", 7200],
    ["PT2H30S", 7230],
    ["PT2H30M30S", 9030],
    ["PT30M30S", 1830],
    ["PT30S", 30],
    ["PT58M59.640S", 3539.64],
    ["P1DT12H", undefined], // Technically valid, but code does not handle days
    ["PT1D", undefined],
    ["", undefined],
    ["foobar", undefined],
  ]

  it.each(testCases)("Converts duration of %s to %s seconds", (duration: string, expected?: number) => {
    expect(durationToSeconds(duration)).toBe(expected)
  })
})

describe("converting between timelines", () => {
  it.each([
    [0, 0, 0],
    [10, 10000, 0],
    [10, 1732633437000, 1732633427000],
  ])(
    "converts a presentation time %d to availability time %d given availability start time %d",
    (presentationTimeInSeconds, expectedAvailabilityTimeInMilliseconds, availabilityStartTimeInMilliseconds) => {
      const availabilityTimeInMilliseconds = presentationTimeToAvailabilityTimeInMilliseconds(
        presentationTimeInSeconds,
        availabilityStartTimeInMilliseconds
      )

      expect(availabilityTimeInMilliseconds).toBe(expectedAvailabilityTimeInMilliseconds)
    }
  )

  it.each([
    [0, 0, 0],
    [10000, 10, 0],
    [1732633437000, 10, 1732633427000],
  ])(
    "converts an availability time %d to presentation time %d given availability start time %d",
    (availabilityTimeInMilliseconds, expectedPresentationTimeInSeconds, availabilityStartTimeInMilliseconds) => {
      const presentationTimeInSeconds = availabilityTimeToPresentationTimeInSeconds(
        availabilityTimeInMilliseconds,
        availabilityStartTimeInMilliseconds
      )

      expect(presentationTimeInSeconds).toBe(expectedPresentationTimeInSeconds)
    }
  )

  it("converts availability time to presentation time 0 if it's less than the availability start time", () => {
    expect(availabilityTimeToPresentationTimeInSeconds(1732633427000, 1732633437000)).toBe(0)
  })

  it.each([
    [0, 0, 0],
    [10, 10, 0],
    [1732633437, 10, 1732633427000],
  ])(
    "converts a media sample time %d to presentation time %d given presentation time offset %d",
    (mediaSampleTimeInSeconds, expectedPresentationTimeInSeconds, presentationTimeOffsetInMilliseconds) => {
      const presentationTimeInSeconds = mediaSampleTimeToPresentationTimeInSeconds(
        mediaSampleTimeInSeconds,
        presentationTimeOffsetInMilliseconds
      )

      expect(presentationTimeInSeconds).toBe(expectedPresentationTimeInSeconds)
    }
  )

  it.each([
    [0, 0, 0],
    [10, 10, 0],
    [10, 1732633437, 1732633427000],
  ])(
    "converts a presentation time %d to media sample time %d given presentation time offset %d",
    (presentationTimeInSeconds, expectedMediaSampleTimeInSeconds, presentationTimeOffsetInMilliseconds) => {
      const mediaSampleTimeInSeconds = presentationTimeToMediaSampleTimeInSeconds(
        presentationTimeInSeconds,
        presentationTimeOffsetInMilliseconds
      )

      expect(mediaSampleTimeInSeconds).toBe(expectedMediaSampleTimeInSeconds)
    }
  )
})
