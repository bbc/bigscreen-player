import Plugins from "../plugins"
import DashManifests from "./stubData/dashmanifests"
import HlsManifests from "./stubData/hlsmanifests"
import ManifestParser, { TimeInfo } from "./manifestparser"
import LoadUrl from "../utils/loadurl"
import { DASH, HLS } from "../models/transferformats"
import { ManifestType } from "../models/manifesttypes"

jest.mock("../utils/loadurl")
const mockLoadUrl = LoadUrl as jest.MockedFunction<typeof LoadUrl>

describe("ManifestParser", () => {
  beforeAll(() => {
    // Mock the Date object
    jest.useFakeTimers()

    jest.spyOn(Plugins.interface, "onManifestParseError")

    mockLoadUrl.mockImplementation((_, { onLoad }) => onLoad(null, new Date().toISOString(), 200))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  describe("parsing a DASH manifest", () => {
    it("returns a TimeInfo for a dynamic manifest with timeshift but no presentation time offset", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: DashManifests.TIMESHIFT_NO_PTO(), type: DASH })

      expect(timeInfo.manifestType).toEqual(ManifestType.DYNAMIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(0)
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(7200000) // 2 hours
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(60000) // Thursday, 1 January 1970 00:01:00
    })

    it("returns a TimeInfo for a dynamic manifest with timeshift and a presentation time offset", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: DashManifests.TIMESHIFT_PTO(), type: DASH })

      expect(timeInfo.manifestType).toEqual(ManifestType.DYNAMIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(1730936674560) // Wednesday, 6 November 2024 23:44:34.560
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(21600000) // 6 hours
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(1730936714560) // Wednesday, 6 November 2024 23:45:14.560
    })

    it("returns a TimeInfo for a dynamic manifest with a presentation time offset but no timeshift", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: DashManifests.PTO_NO_TIMESHIFT(), type: DASH })

      expect(timeInfo.manifestType).toEqual(ManifestType.DYNAMIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(1730936674560) // Wednesday, 6 November 2024 23:44:34.560
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(1730936714560) // Wednesday, 6 November 2024 23:45:14.560
    })

    it("returns a TimeInfo for a static manifest with no presentation time offset", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: DashManifests.STATIC_NO_PTO(), type: DASH })

      expect(timeInfo.manifestType).toEqual(ManifestType.STATIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(0)
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(0)
    })

    it("returns a TimeInfo for a static manifest with a presentation time offset", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: DashManifests.STATIC_PTO(), type: DASH })

      expect(timeInfo.manifestType).toEqual(ManifestType.STATIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(1730936674560) // Wednesday, 6 November 2024 23:44:34.560
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(0)
    })

    it("returns a TimeInfo with default values for a manifest with bad attributes", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: DashManifests.BAD_ATTRIBUTES(), type: DASH })

      expect(timeInfo.manifestType).toEqual(ManifestType.STATIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(0)
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(0)

      expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
    })
  })

  describe("parsing a HLS manifest", () => {
    it("returns a TimeInfo for a manifest with a valid program date time and no end list", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({
        body: HlsManifests.VALID_PROGRAM_DATETIME_NO_ENDLIST,
        type: HLS,
      })

      expect(timeInfo.manifestType).toEqual(ManifestType.DYNAMIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(1731052800000) // Friday, 8 November 2024 08:00:00
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(1731052800000) // Friday, 8 November 2024 08:00:00
    })

    it("returns a TimeInfo for an on demand manifest with and end list and no program date time", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({
        body: HlsManifests.NO_PROGRAM_DATETIME_ENDLIST,
        type: HLS,
      })

      expect(timeInfo.manifestType).toEqual(ManifestType.STATIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(0)
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(0)
    })

    it("returns a TimeInfo for an on demand manifest with and end list and a valid program date time", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({
        body: HlsManifests.VALID_PROGRAM_DATETIME_AND_ENDLIST,
        type: HLS,
      })

      expect(timeInfo.manifestType).toEqual(ManifestType.STATIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(1731045600000) // Friday, 8 November 2024 06:00:00
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(1731045600000) // Friday, 8 November 2024 06:00:00
    })

    it("returns a default TimeInfo if a program date time cannot be parsed", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: HlsManifests.INVALID_PROGRAM_DATETIME, type: HLS })

      expect(timeInfo.manifestType).toEqual(ManifestType.STATIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(0)
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(0)

      expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
    })

    it("returns a default TimeInfo if manifest body is malformed", async () => {
      const timeInfo: TimeInfo = await ManifestParser.parse({ body: "malformed manifest body", type: HLS })

      expect(timeInfo.manifestType).toEqual(ManifestType.STATIC)
      expect(timeInfo.presentationTimeOffsetInMilliseconds).toBe(0)
      expect(timeInfo.timeShiftBufferDepthInMilliseconds).toBe(0)
      expect(timeInfo.availabilityStartTimeInMilliseconds).toBe(0)

      expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
    })
  })
})
