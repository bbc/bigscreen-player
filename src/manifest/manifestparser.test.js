import Plugins from "../plugins"
import WindowTypes from "../models/windowtypes"
import DashManifests, { appendTimingResource, setAvailabilityStartTime } from "./stubData/dashmanifests"
import HlsManifests from "./stubData/hlsmanifests"
import ManifestParser from "./manifestparser"
import LoadUrl from "../utils/loadurl"

jest.mock("../utils/loadurl")

describe("ManifestParser", () => {
  beforeAll(() => {
    // Mock the Date object
    jest.useFakeTimers()

    jest.spyOn(Plugins.interface, "onManifestParseError")

    LoadUrl.mockImplementation((_, { onLoad }) => onLoad(null, new Date().toISOString()))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  describe("parsing a DASH manifests", () => {
    it("returns the time window for a manifest with a sliding window", () =>
      ManifestParser.parse(DashManifests.SLIDING_WINDOW(), {
        type: "mpd",
        windowType: WindowTypes.SLIDING,
        initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        // End time of the window is:
        //  provided time [millis] - availability start time [millis] - (segment.duration / segment.timescale) [millis]
        //  1,544,698,800,000 - 60,000 - (1000 * 768 / 200)
        expect(windowEndTime).toBe(1544698736160)

        // Start time of the window is:
        //  window.endtime [millis] - time shift buffer depth [millis]
        expect(windowStartTime).toBe(1544691536160)

        // Time correction is:
        //  window.start_time [seconds]
        expect(timeCorrectionSeconds).toBe(1544691536.16)

        expect(presentationTimeOffsetSeconds).toBeNaN()
      }))

    it("returns the time window for a manifest with a growing window", () => {
      const manifest = DashManifests.GROWING_WINDOW()

      setAvailabilityStartTime(manifest, "2018-12-13T10:00:00.000Z")

      return ManifestParser.parse(manifest, {
        type: "mpd",
        windowType: WindowTypes.GROWING,
        initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        // End time of the window is:
        //  provided time [millis] - (segment.duration / segment.timescale) [millis]
        expect(windowEndTime).toBe(1544698796160)

        // Start time of the window is:
        //  availability start time [millis]
        expect(windowStartTime).toBe(1544695200000)

        expect(presentationTimeOffsetSeconds).toBeNaN()
        expect(timeCorrectionSeconds).toBeNaN()
      })
    })

    it("returns the time window for a manifest with a static window", () =>
      ManifestParser.parse(DashManifests.STATIC_WINDOW(), {
        type: "mpd",
        windowType: WindowTypes.STATIC,
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        // Presentation time offset is:
        //  segment.presentation_time_offset [seconds] / segment.timescale [sample/seconds] => [milliseconds]
        expect(presentationTimeOffsetSeconds).toBe(1678431601.92)

        expect(timeCorrectionSeconds).toBeNaN()
        expect(windowStartTime).toBeNaN()
        expect(windowEndTime).toBeNaN()
      }))

    it("returns a fallback time window when the manifest has bad data in the attributes", () =>
      ManifestParser.parse(DashManifests.BAD_ATTRIBUTES(), {
        type: "mpd",
        windowType: WindowTypes.GROWING,
        initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        expect(windowStartTime).toBeNaN()
        expect(windowEndTime).toBeNaN()
        expect(timeCorrectionSeconds).toBeNaN()
        expect(presentationTimeOffsetSeconds).toBeNaN()

        expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
      }))

    it("returns a fallback time window when the manifest is malformed", () =>
      ManifestParser.parse("not an MPD", {
        type: "mpd",
        windowType: WindowTypes.STATIC,
        initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        expect(windowStartTime).toBeNaN()
        expect(windowEndTime).toBeNaN()
        expect(timeCorrectionSeconds).toBeNaN()
        expect(presentationTimeOffsetSeconds).toBeNaN()

        expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
      }))

    it("fetches wallclock time from a timing resource for a manifest with a sliding window when a wallclock time is not provided", () => {
      jest.setSystemTime(new Date("1970-01-01T02:01:03.840Z"))

      const manifest = DashManifests.SLIDING_WINDOW()

      appendTimingResource(manifest, "https://time.some-cdn.com/?iso")

      return ManifestParser.parse(manifest, {
        type: "mpd",
        windowType: WindowTypes.SLIDING,
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        expect(windowStartTime).toBe(new Date("1970-01-01T00:00:00Z").getTime())
        expect(windowEndTime).toBe(new Date("1970-01-01T02:00:00Z").getTime())
        expect(timeCorrectionSeconds).toBe(0)

        expect(presentationTimeOffsetSeconds).toBeNaN()
      })
    })

    it("fetches wallclock time from a timing resource for a manifest with a growing window when a wallclock time is not provided", () => {
      const manifest = DashManifests.GROWING_WINDOW()

      appendTimingResource(manifest, "https://time.some-cdn.com/?iso")
      setAvailabilityStartTime(manifest, "2018-12-13T11:00:00Z")
      jest.setSystemTime(new Date("2018-12-13T12:45:03.840Z"))

      return ManifestParser.parse(manifest, { type: "mpd", windowType: WindowTypes.GROWING }).then(
        ({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
          expect(windowStartTime).toBe(new Date("2018-12-13T11:00:00").getTime())
          expect(windowEndTime).toBe(new Date("2018-12-13T12:45:00Z").getTime())

          expect(presentationTimeOffsetSeconds).toBeNaN()
          expect(timeCorrectionSeconds).toBeNaN()
        }
      )
    })

    it.each([
      [WindowTypes.GROWING, DashManifests.GROWING_WINDOW()],
      [WindowTypes.SLIDING, DashManifests.SLIDING_WINDOW()],
    ])("emits error when a %s manifest does not include a timing resource", (windowType, manifestEl) =>
      ManifestParser.parse(manifestEl, { windowType, type: "mpd" }).then(
        ({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
          expect(windowStartTime).toBeNaN()
          expect(windowEndTime).toBeNaN()
          expect(presentationTimeOffsetSeconds).toBeNaN()
          expect(timeCorrectionSeconds).toBeNaN()

          expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
        }
      )
    )
  })

  describe("HLS m3u8", () => {
    it("returns time window for sliding window hls manifest", () =>
      ManifestParser.parse(HlsManifests.VALID_PROGRAM_DATETIME, {
        type: "m3u8",
        windowType: WindowTypes.SLIDING,
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        expect(windowStartTime).toBe(1436259310000)
        expect(windowEndTime).toBe(1436259342000)
        expect(presentationTimeOffsetSeconds).toBeNaN()
        expect(timeCorrectionSeconds).toBeNaN()
      }))

    it("returns presentation time offset for static window hls manifest", () =>
      ManifestParser.parse(HlsManifests.VALID_PROGRAM_DATETIME, {
        type: "m3u8",
        windowType: WindowTypes.STATIC,
      }).then(({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
        expect(presentationTimeOffsetSeconds).toBe(1436259310)
        expect(timeCorrectionSeconds).toBeNaN()
        expect(windowStartTime).toBeNaN()
        expect(windowEndTime).toBeNaN()
      }))

    it("returns fallback data if manifest has an invalid start date", () =>
      ManifestParser.parse(HlsManifests.INVALID_PROGRAM_DATETIME, { type: "m3u8" }).then(
        ({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
          expect(windowStartTime).toBeNaN()
          expect(windowEndTime).toBeNaN()
          expect(presentationTimeOffsetSeconds).toBeNaN()
          expect(timeCorrectionSeconds).toBeNaN()

          expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
        }
      ))

    it("returns fallback data if hls manifest data is malformed", () =>
      ManifestParser.parse("not an valid manifest", { type: "m3u8" }).then(
        ({ windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds }) => {
          expect(windowStartTime).toBeNaN()
          expect(windowEndTime).toBeNaN()
          expect(presentationTimeOffsetSeconds).toBeNaN()
          expect(timeCorrectionSeconds).toBeNaN()

          expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
        }
      ))
  })
})
