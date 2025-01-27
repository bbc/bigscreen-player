import MediaSources from "./mediasources"
import Plugins from "./plugins"
import PluginEnums from "./pluginenums"
import { MediaDescriptor, Connection } from "./types"
import ManifestLoader from "./manifest/sourceloader"
import { ManifestType } from "./models/manifesttypes"
import { TransferFormat } from "./models/transferformats"
import getError from "./testutils/geterror"

jest.mock("./manifest/sourceloader", () => ({
  default: {
    load: jest.fn(() =>
      Promise.resolve({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: TransferFormat.DASH,
      })
    ),
  },
}))

jest.mock("./plugins", () => ({
  default: {
    interface: {
      onErrorCleared: jest.fn(),
      onBuffering: jest.fn(),
      onBufferingCleared: jest.fn(),
      onError: jest.fn(),
      onFatalError: jest.fn(),
      onErrorHandled: jest.fn(),
      onSubtitlesLoadError: jest.fn(),
    },
  },
}))

const FAILOVER_RESET_TIMEOUT_MS = 20000
const SEGMENT_LENGTH = 3.84

function createMediaDescriptor(): MediaDescriptor {
  return {
    kind: "video",
    mimeType: "video/mp4",
    type: "application/dash+xml",
    urls: [{ url: "http://source1.com/", cdn: "http://supplier1.com/" }],
    captions: [{ url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH }],
    playerSettings: {},
  }
}

describe("Media Sources", () => {
  let testMedia: MediaDescriptor

  beforeAll(() => {
    jest.useFakeTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()

    testMedia = createMediaDescriptor()
  })

  describe("init", () => {
    it("throws an error when initialised with no sources", async () => {
      testMedia.urls = []

      const mediaSources = MediaSources()

      const error = await getError(() => mediaSources.init(testMedia))

      expect(error).toEqual(new Error("Media Sources urls are undefined"))
    })

    it("clones the urls", async () => {
      testMedia.urls = [{ url: "mock://url.test/", cdn: "mock://cdn.test/" }]

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      testMedia.urls[0].url = "mock://url.clone/"

      expect(mediaSources.currentSource()).toBe("mock://url.test/")
    })

    it("resolves when manifest has been loaded", async () => {
      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.DYNAMIC,
          presentationTimeOffsetInMilliseconds: 1000,
          availabilityStartTimeInMilliseconds: 10000,
          timeShiftBufferDepthInMilliseconds: 1000,
        },
        transferFormat: TransferFormat.HLS,
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      expect(mediaSources.time()).toEqual({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1000,
        availabilityStartTimeInMilliseconds: 10000,
        timeShiftBufferDepthInMilliseconds: 1000,
      })

      expect(mediaSources.transferFormat()).toEqual(TransferFormat.HLS)
      expect(mediaSources.currentSource()).toBe("http://source1.com/")
    })

    it("resolves when first manifest fails to load but second load succeeds", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      jest.mocked(ManifestLoader.load).mockRejectedValueOnce(new Error("A network error occured"))

      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: TransferFormat.DASH,
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      expect(mediaSources.time()).toEqual({
        manifestType: ManifestType.STATIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      expect(mediaSources.transferFormat()).toEqual(TransferFormat.DASH)
      expect(mediaSources.currentSource()).toBe("http://source2.com/")
    })

    it("rejects when all available manifest sources fail to load", async () => {
      jest.mocked(ManifestLoader.load).mockRejectedValueOnce(new Error("A network error occured"))

      const mediaSources = MediaSources()

      const error = await getError(async () => mediaSources.init(testMedia))

      expect(mediaSources.currentSource()).toBe("http://source1.com/")
      expect(error.name).toBe("ManifestLoadError")
    })

    it("overrides the subtitlesRequestTimeout when set in media object", async () => {
      testMedia.subtitlesRequestTimeout = 60000

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      expect(mediaSources.subtitlesRequestTimeout()).toBe(60000)
    })

    it("overrides the failoverResetTime when set on the player settings", async () => {
      testMedia.playerSettings = {
        failoverResetTime: 60000,
      }

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      expect(mediaSources.failoverResetTime()).toBe(60000)
    })

    it("overrides the failoverSort function when set on the player settings", async () => {
      const mockFailoverFunction = (sources: Connection[]) => [...sources].reverse()

      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
        { url: "http://source3.com/", cdn: "http://supplier3.com/" },
      ]

      testMedia.playerSettings = {
        failoverSort: mockFailoverFunction,
      }

      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: TransferFormat.DASH,
      })

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: 0,
        message: "mock failover",
      })

      expect(mediaSources.availableSources()).toEqual(["http://source3.com/", "http://source2.com/"])
    })

    it("should fire onErrorHandled plugin with correct error code and message when failing to load manifest", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      jest.mocked(ManifestLoader.load).mockRejectedValueOnce(new Error("A network error occured"))

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      expect(jest.mocked(Plugins.interface).onErrorHandled).toHaveBeenCalledWith({
        status: PluginEnums.STATUS.FAILOVER,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
        cdn: "http://supplier1.com/",
        newCdn: "http://supplier2.com/",
        isInitialPlay: undefined,
        timeStamp: expect.any(Date),
        code: PluginEnums.ERROR_CODES.MANIFEST_LOAD,
        message: PluginEnums.ERROR_MESSAGES.MANIFEST,
      })
    })
  })

  describe("failover", () => {
    it.each([
      [TransferFormat.DASH, ManifestType.STATIC],
      [TransferFormat.DASH, ManifestType.DYNAMIC],
      [TransferFormat.HLS, ManifestType.STATIC],
    ])("does not load the manifest from the next url for a %s %s stream", async (transferFormat, manifestType) => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        transferFormat,
        time: {
          manifestType,
          presentationTimeOffsetInMilliseconds: 1731406718000,
          availabilityStartTimeInMilliseconds: 1731406758000,
          timeShiftBufferDepthInMilliseconds: 72000000,
        },
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      await mediaSources.failover({ isBufferingTimeoutError: true, code: 0, message: "A mocked failover reason" })

      expect(ManifestLoader.load).toHaveBeenCalledTimes(1)
      expect(ManifestLoader.load).toHaveBeenNthCalledWith(1, "http://source1.com/")
    })

    it("loads the manifest from the next url for a dynamic HLS stream", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      // HLS manifests must be reloaded on failover to fetch accurate start time
      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.DYNAMIC,
          presentationTimeOffsetInMilliseconds: 1731406718000,
          availabilityStartTimeInMilliseconds: 1731406718000,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: TransferFormat.HLS,
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      await mediaSources.failover({ isBufferingTimeoutError: true, code: 0, message: "A mocked failover reason" })

      expect(ManifestLoader.load).toHaveBeenCalledTimes(2)
      expect(ManifestLoader.load).toHaveBeenNthCalledWith(2, "http://source2.com/")
    })

    it("should fire onErrorHandled plugin with correct error code and message when there are sources to failover to", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: TransferFormat.DASH,
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
      })

      expect(jest.mocked(Plugins.interface).onErrorHandled).toHaveBeenCalledWith({
        status: PluginEnums.STATUS.FAILOVER,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: true,
        cdn: "http://supplier1.com/",
        newCdn: "http://supplier2.com/",
        isInitialPlay: undefined,
        timeStamp: expect.any(Date),
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
      })

      expect(jest.mocked(Plugins.interface).onErrorHandled).toHaveBeenCalledTimes(1)
    })

    it("should not fire a plugin event when there are no sources to failover to", async () => {
      testMedia.urls = [{ url: "http://source1.com/", cdn: "http://supplier1.com/" }]

      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: TransferFormat.DASH,
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      await getError(async () =>
        mediaSources.failover({
          isBufferingTimeoutError: true,
          code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
          message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        })
      )

      expect(Plugins.interface.onErrorHandled).not.toHaveBeenCalled()
      expect(mediaSources.currentSource()).toBe("http://source1.com/")
    })

    it("Rejects when the failover parameters are invalid", async () => {
      testMedia.urls = [
        { url: "http://source1.com", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      const error = await getError(async () =>
        mediaSources.failover({
          isBufferingTimeoutError: "yes" as unknown as boolean,
          code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
          message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        })
      )

      expect(error).toEqual(new TypeError("Invalid failover params"))
    })

    it("Rejects when there are no more sources to failover to", async () => {
      testMedia.urls = [{ url: "http://source1.com/", cdn: "http://supplier1.com/" }]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      const error = await getError(async () =>
        mediaSources.failover({
          isBufferingTimeoutError: true,
          code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
          message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        })
      )

      expect(error).toEqual(new Error("Exhaused all sources"))
    })

    it("fails over by moving the specified service location to the top of the list", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
        { url: "http://source3.com/", cdn: "http://supplier3.com/" },
        { url: "http://source4.com/", cdn: "http://supplier4.com/" },
      ]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        serviceLocation: "http://source3.com/?key=value#hash",
      })

      expect(mediaSources.currentSource()).toBe("http://source3.com/")
    })

    it("fails over to the next CDN when the service location is not in the CDN list", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
        { url: "http://source3.com/", cdn: "http://supplier3.com/" },
        { url: "http://source4.com/", cdn: "http://supplier4.com/" },
      ]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        serviceLocation: "http://sourceInfinity.com/?key=value#hash",
      })

      expect(mediaSources.currentSource()).toBe("http://source2.com/")
    })

    it("does not failover if service location is identical to current source cdn besides path", async () => {
      testMedia.urls = [
        { url: "http://source1.com/path/to/thing.extension", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      expect(mediaSources.currentSource()).toBe("http://source1.com/path/to/thing.extension")

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        serviceLocation: "http://source1.com/path/to/different/thing.extension",
      })

      expect(mediaSources.currentSource()).toBe("http://source1.com/path/to/thing.extension")
    })

    it("does not failover if service location is identical to current source cdn besides hash and query", async () => {
      testMedia.urls = [
        { url: "http://source1.com", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      expect(mediaSources.currentSource()).toBe("http://source1.com")

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        serviceLocation: "http://source1.com?key=value#hash",
      })

      expect(mediaSources.currentSource()).toBe("http://source1.com")
    })

    it("fails over if current time is greater than 5 seconds from duration", async () => {
      testMedia.urls = [
        { url: "http://source1.com", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        duration: 100,
        currentTime: 94,
      })

      expect(mediaSources.currentSource()).toBe("http://source2.com")
    })

    it("Rejects if current time is within 5 seconds of duration", async () => {
      testMedia.urls = [
        { url: "http://source1.com", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      const error = await getError(async () =>
        mediaSources.failover({
          isBufferingTimeoutError: true,
          code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
          message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
          duration: 100,
          currentTime: 96,
        })
      )

      expect(error).toEqual(new Error("Current time too close to end"))
    })

    it("fails over if playback has not yet started", async () => {
      testMedia.urls = [
        { url: "http://source1.com", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failover({
        isBufferingTimeoutError: true,
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        duration: 0,
        currentTime: undefined,
      })

      expect(mediaSources.currentSource()).toBe("http://source2.com")
    })
  })

  describe("Subtitle Sources", () => {
    beforeEach(() => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
        { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
      ]
    })

    it("returns the first subtitles source url", async () => {
      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      expect(mediaSources.currentSubtitlesSource()).toBe("http://subtitlessource1.com/")
    })

    it("returns the first subtitles segment length", async () => {
      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      expect(mediaSources.currentSubtitlesSegmentLength()).toBe(SEGMENT_LENGTH)
    })

    it("returns the first subtitles cdn", async () => {
      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      expect(mediaSources.currentSubtitlesCdn()).toBe("http://supplier1.com/")
    })

    it("returns the second subtitle source following a failover", async () => {
      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failoverSubtitles()

      expect(mediaSources.currentSubtitlesSource()).toBe("http://subtitlessource2.com/")
    })

    it("Rejects when there are no more subtitles sources to failover to", async () => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
      ]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      const error = await getError(async () => mediaSources.failoverSubtitles())

      expect(error).toEqual(new Error("Exhaused all subtitle sources"))
    })

    it("fires onSubtitlesLoadError plugin with correct parameters when there are sources available to failover to", async () => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
        { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
      ]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failoverSubtitles({ statusCode: 404 })

      expect(Plugins.interface.onSubtitlesLoadError).toHaveBeenCalledWith({
        status: 404,
        severity: PluginEnums.STATUS.FAILOVER,
        cdn: "http://supplier1.com/",
        subtitlesSources: 2,
      })
    })

    it("fires onSubtitlesLoadError plugin with correct parameters when there are no sources available to failover to", async () => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
      ]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await getError(async () => mediaSources.failoverSubtitles({ statusCode: 404 }))

      expect(Plugins.interface.onSubtitlesLoadError).toHaveBeenCalledWith({
        status: 404,
        severity: PluginEnums.STATUS.FATAL,
        cdn: "http://supplier1.com/",
        subtitlesSources: 1,
      })
    })
  })

  describe("availableSources", () => {
    it("returns an array of media source urls", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://cdn1.com" },
        { url: "http://source2.com/", cdn: "http://cdn2.com" },
      ]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      expect(mediaSources.availableSources()).toEqual(["http://source1.com/", "http://source2.com/"])
    })
  })

  describe("refresh", () => {
    it("updates the mediasources time data", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://cdn1.com" },
        { url: "http://source2.com/", cdn: "http://cdn2.com" },
      ]

      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: TransferFormat.DASH,
      })

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      expect(mediaSources.time()).toEqual({
        manifestType: ManifestType.STATIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      expect(mediaSources.transferFormat()).toEqual(TransferFormat.DASH)
      expect(mediaSources.currentSource()).toBe("http://source1.com/")

      jest.mocked(ManifestLoader.load).mockResolvedValueOnce({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 100000,
          availabilityStartTimeInMilliseconds: 100000,
          timeShiftBufferDepthInMilliseconds: 72000000,
        },
        transferFormat: TransferFormat.DASH,
      })

      await mediaSources.refresh()

      expect(mediaSources.time()).toEqual({
        manifestType: ManifestType.STATIC,
        presentationTimeOffsetInMilliseconds: 100000,
        availabilityStartTimeInMilliseconds: 100000,
        timeShiftBufferDepthInMilliseconds: 72000000,
      })

      expect(mediaSources.transferFormat()).toEqual(TransferFormat.DASH)
      expect(mediaSources.currentSource()).toBe("http://source1.com/")
    })

    it("rejects if manifest fails to load", async () => {
      testMedia.urls = [{ url: "http://source1.com/", cdn: "http://cdn1.com" }]

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      jest.mocked(ManifestLoader.load).mockRejectedValueOnce(new Error("A network error occured"))

      const error = await getError(async () => mediaSources.refresh())

      expect(error.name).toBe("ManifestLoadError")
    })
  })

  describe("Reinstating failed over sources", () => {
    beforeEach(() => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://cdn1.com" },
        { url: "http://source2.com/", cdn: "http://cdn2.com" },
      ]
    })

    it("should add the cdn that failed back in to available cdns after a timeout", async () => {
      testMedia.playerSettings = {
        failoverResetTime: FAILOVER_RESET_TIMEOUT_MS,
      }

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      const expectedSources = [...mediaSources.availableSources()].reverse()

      await mediaSources.failover({ isBufferingTimeoutError: true, code: 0, message: "A mocked failover reason" })

      jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT_MS)

      expect(mediaSources.availableSources()).toEqual(expectedSources)
    })

    it("should not contain the cdn that failed before the timeout has occured", async () => {
      testMedia.playerSettings = {
        failoverResetTime: FAILOVER_RESET_TIMEOUT_MS,
      }

      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failover({ isBufferingTimeoutError: true, code: 0, message: "A mocked failover reason" })

      jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT_MS - 1000)

      expect(mediaSources.availableSources()).not.toContain("http://source1.com/")
    })

    it("should not preserve timers over teardown boundaries", async () => {
      const mediaSources = MediaSources()
      await mediaSources.init(testMedia)

      await mediaSources.failover({ isBufferingTimeoutError: true, code: 0, message: "A mocked failover reason" })

      mediaSources.tearDown()

      jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT_MS)

      expect(mediaSources.availableSources()).toEqual([])
    })
  })
})
