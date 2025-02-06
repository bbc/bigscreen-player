import { TimeInfo } from "../manifest/manifestparser"
import { ManifestType } from "../models/manifesttypes"
import createTimeConverter from "./timeconverter"

const someUtcTime = Date.now()

function createTimeInfo(partial: Partial<TimeInfo>): TimeInfo {
  return {
    manifestType: "static",
    availabilityStartTimeInMilliseconds: 0,
    presentationTimeOffsetInMilliseconds: 0,
    timeShiftBufferDepthInMilliseconds: 0,
    ...partial,
  }
}

describe("presentation time to availability time", () => {
  it("returns `null` for static manifest", () => {
    expect(
      createTimeConverter(createTimeInfo({ manifestType: "static" })).presentationTimeToAvailabilityTimeInMilliseconds(
        15
      )
    ).toBeNull()
  })

  it.each([
    [someUtcTime, 0, someUtcTime],
    [someUtcTime + 14000, 14, someUtcTime],
  ])(
    "returns %i for presentation time %i given availability start time %i",
    (expectedAvailabilityTimeInMilliseconds, presentationTimeInSeconds, availabilityStartTimeInMilliseconds) => {
      expect(
        createTimeConverter(
          createTimeInfo({ availabilityStartTimeInMilliseconds, manifestType: "dynamic" })
        ).presentationTimeToAvailabilityTimeInMilliseconds(presentationTimeInSeconds)
      ).toBe(expectedAvailabilityTimeInMilliseconds)
    }
  )
})

describe("availability time to presentation time", () => {
  it("returns `null` for a static manifest", () => {
    expect(
      createTimeConverter(createTimeInfo({ manifestType: "static" })).availabilityTimeToPresentationTimeInSeconds(
        someUtcTime
      )
    ).toBeNull()
  })

  it.each([
    [0, someUtcTime, someUtcTime],
    [14, someUtcTime + 14000, someUtcTime],
    [0, someUtcTime - 10000, someUtcTime], // clamp to zero if requested time is prior to the availabilityStartTime
  ])(
    "returns %i for availability time %i given availability start time %i",
    (expectedPresentationTimeInSeconds, availabilityTimeInMilliseconds, availabilityStartTimeInMilliseconds) => {
      expect(
        createTimeConverter(
          createTimeInfo({ availabilityStartTimeInMilliseconds, manifestType: "dynamic" })
        ).availabilityTimeToPresentationTimeInSeconds(availabilityTimeInMilliseconds)
      ).toBe(expectedPresentationTimeInSeconds)
    }
  )
})

describe("presentation time to media sample time", () => {
  it.each([
    [10, 10, 0, "static"],
    [26, 16, 10000, "static"],
    [1731326236, 10, 1731326226000, "dynamic"],
  ] satisfies [number, number, number, ManifestType][])(
    "returns %i for presentation time %i given presentation time offset %i",
    (
      expectedMediaSampleTimeInSeconds,
      presentationTimeInSeconds,
      presentationTimeOffsetInMilliseconds,
      manifestType
    ) => {
      expect(
        createTimeConverter(
          createTimeInfo({ presentationTimeOffsetInMilliseconds, manifestType })
        ).presentationTimeToMediaSampleTimeInSeconds(presentationTimeInSeconds)
      ).toBe(expectedMediaSampleTimeInSeconds)
    }
  )
})

describe("media sample time to presentation time", () => {
  it.each([
    [10, 10, 0, "static"],
    [16, 26, 10000, "static"],
    [10, 1731326236, 1731326226000, "dynamic"],
  ] satisfies [number, number, number, ManifestType][])(
    "returns %i for media sample time %i given presentation time offset %i",
    (
      expectedPresentationTimeInSeconds,
      mediaSampleTimeInSeconds,
      presentationTimeOffsetInMilliseconds,
      manifestType
    ) => {
      expect(
        createTimeConverter(
          createTimeInfo({ presentationTimeOffsetInMilliseconds, manifestType })
        ).mediaSampleTimeToPresentationTimeInSeconds(mediaSampleTimeInSeconds)
      ).toBe(expectedPresentationTimeInSeconds)
    }
  )
})
