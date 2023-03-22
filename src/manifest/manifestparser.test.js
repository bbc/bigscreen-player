import Plugins from "../plugins"
import WindowTypes from "../models/windowtypes"
import DashManifests from "./stubData/dashmanifests"
import HlsManifests from "./stubData/hlsmanifests"
import ManifestParser from "./manifestparser"

describe("ManifestParser", () => {
  beforeAll(() => {
    jest.spyOn(Plugins.interface, "onManifestParseError")
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("parsing a DASH manifests", () => {
    it("returns the time window for a manifest with a sliding window", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse(DashManifests.SLIDING_WINDOW, {
          type: "mpd",
          windowType: WindowTypes.SLIDING,
          initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
        })

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
    })

    it("returns the time window for a manifest with a growing window", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse(DashManifests.GROWING_WINDOW, {
          type: "mpd",
          windowType: WindowTypes.GROWING,
          initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
        })

      // End time of the window is:
      //  provided time [millis] - (segment.duration / segment.timescale) [millis]
      expect(windowEndTime).toBe(1544698796160)

      // Start time of the window is:
      //  availability start time [millis]
      expect(windowStartTime).toBe(1544695200000)

      expect(presentationTimeOffsetSeconds).toBeNaN()
      expect(timeCorrectionSeconds).toBeNaN()
    })

    it("returns the time window for a manifest with a static window", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse(DashManifests.STATIC_WINDOW, {
          type: "mpd",
          windowType: WindowTypes.STATIC,
          initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
        })

      // Presentation time offset is:
      //  segment.presentation_time_offset [seconds] / segment.timescale [sample/seconds] => [milliseconds]
      expect(presentationTimeOffsetSeconds).toBe(1678431601.92)

      expect(timeCorrectionSeconds).toBeNaN()
      expect(windowStartTime).toBeNaN()
      expect(windowEndTime).toBeNaN()
    })

    it("returns a fallback time window when the manifest has bad data in the attributes", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse(DashManifests.BAD_ATTRIBUTES, {
          type: "mpd",
          windowType: WindowTypes.GROWING,
          initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
        })

      expect(windowStartTime).toBeNaN()
      expect(windowEndTime).toBeNaN()
      expect(timeCorrectionSeconds).toBeNaN()
      expect(presentationTimeOffsetSeconds).toBeNaN()

      expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
    })

    it("returns a fallback time window when the manifest is malformed", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse("not an MPD", {
          type: "mpd",
          windowType: WindowTypes.STATIC,
          initialWallclockTime: new Date("2018-12-13T11:00:00.000000Z"),
        })

      expect(windowStartTime).toBeNaN()
      expect(windowEndTime).toBeNaN()
      expect(timeCorrectionSeconds).toBeNaN()
      expect(presentationTimeOffsetSeconds).toBeNaN()

      expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
    })
  })

  describe("HLS m3u8", () => {
    it("returns time window for sliding window hls manifest", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse(HlsManifests.VALID_PROGRAM_DATETIME, { type: "m3u8", windowType: WindowTypes.SLIDING })

      expect(windowStartTime).toBe(1436259310000)
      expect(windowEndTime).toBe(1436259342000)
      expect(presentationTimeOffsetSeconds).toBeNaN()
      expect(timeCorrectionSeconds).toBeNaN()
    })

    it("returns presentation time offset for static window hls manifest", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse(HlsManifests.VALID_PROGRAM_DATETIME, { type: "m3u8", windowType: WindowTypes.STATIC })

      expect(presentationTimeOffsetSeconds).toBe(1436259310)
      expect(timeCorrectionSeconds).toBeNaN()
      expect(windowStartTime).toBeNaN()
      expect(windowEndTime).toBeNaN()
    })

    it("returns fallback data if manifest has an invalid start date", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse(HlsManifests.INVALID_PROGRAM_DATETIME, { type: "m3u8" })

      expect(windowStartTime).toBeNaN()
      expect(windowEndTime).toBeNaN()
      expect(presentationTimeOffsetSeconds).toBeNaN()
      expect(timeCorrectionSeconds).toBeNaN()

      expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
    })

    it("returns fallback data if hls manifest data is malformed", () => {
      const { windowStartTime, windowEndTime, presentationTimeOffsetSeconds, timeCorrectionSeconds } =
        ManifestParser.parse("not an valid manifest", { type: "m3u8" })

      expect(windowStartTime).toBeNaN()
      expect(windowEndTime).toBeNaN()
      expect(presentationTimeOffsetSeconds).toBeNaN()
      expect(timeCorrectionSeconds).toBeNaN()

      expect(Plugins.interface.onManifestParseError).toHaveBeenCalled()
    })
  })
})
