import MediaSources from "./mediasources"
import Plugins from "./plugins"
import PluginEnums from "./pluginenums"
import { MediaDescriptor, Connection } from "./types"
import ManifestLoader from "./manifest/manifestloader"
import { ManifestType } from "./models/manifesttypes"
import { DASH, HLS } from "./models/transferformats"
import getError from "./testutils/geterror"

jest.mock("./manifest/manifestloader", () => ({
  default: {
    load: jest.fn(() =>
      Promise.resolve({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
        },
        transferFormat: DASH
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
        transferFormat: HLS,
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      expect(mediaSources.time()).toEqual({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1000,
        availabilityStartTimeInMilliseconds: 10000,
        timeShiftBufferDepthInMilliseconds: 1000,
      })

      expect(mediaSources.transferFormat()).toEqual(HLS)
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
        transferFormat: DASH,
      })

      const mediaSources = MediaSources()

      await mediaSources.init(testMedia)

      expect(mediaSources.time()).toEqual({
        manifestType: ManifestType.STATIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      expect(mediaSources.transferFormat()).toEqual(DASH)
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
        transferFormat: DASH,
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
      [DASH, ManifestType.STATIC],
      [DASH, ManifestType.DYNAMIC],
      [HLS, ManifestType.STATIC],
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
        transferFormat: HLS,
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
        transferFormat: DASH,
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
        transferFormat: DASH,
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

    it("moves the specified service location to the top of the list", async () => {
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

    it("selects the next CDN when the service location is not in the CDN list", async () => {
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
  })

  // describe("isFirstManifest", () => {
  //   it("does not failover if service location is identical to current source cdn besides path", async () => {
  //     testMedia.urls = [
  //       { url: "http://source1.com/path/to/thing.extension", cdn: "http://cdn1.com" },
  //       { url: "http://source2.com", cdn: "http://cdn2.com" },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     expect(mediaSources.currentSource()).toBe("http://source1.com/path/to/thing.extension")

  //     mediaSources.failover(jest.fn(), jest.fn(), {
  //       isBufferingTimeoutError: false,
  //       serviceLocation: "http://source1.com/path/to/different/thing.extension",
  //     })

  //     expect(mediaSources.currentSource()).toBe("http://source1.com/path/to/thing.extension")
  //   })

  //   it("does not failover if service location is identical to current source cdn besides hash and query", async () => {
  //     testMedia.urls = [
  //       { url: "http://source1.com", cdn: "http://cdn1.com" },
  //       { url: "http://source2.com", cdn: "http://cdn2.com" },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     expect(mediaSources.currentSource()).toBe("http://source1.com")

  //     mediaSources.failover(jest.fn(), jest.fn(), {
  //       isBufferingTimeoutError: false,
  //       serviceLocation: "http://source1.com?key=value#hash",
  //     })

  //     expect(mediaSources.currentSource()).toBe("http://source1.com")
  //   })
  // })

  // describe("currentSource", () => {
  //   beforeEach(() => {
  //     testMedia.urls = [
  //       { url: "http://source1.com", cdn: "http://cdn1.com" },
  //       { url: "http://source2.com", cdn: "http://cdn2.com" },
  //     ]
  //   })

  //   it("returns the first media source url", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     expect(mediaSources.currentSource()).toBe("http://source1.com")
  //   })

  //   it("returns the second media source following a failover", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: true })

  //     expect(mediaSources.currentSource()).toBe("http://source2.com")
  //   })
  // })

  // describe("currentSubtitlesSource", () => {
  //   beforeEach(() => {
  //     testMedia.captions = [
  //       { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
  //       { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
  //     ]
  //   })

  //   it("returns the first subtitles source url", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     expect(mediaSources.currentSubtitlesSource()).toBe("http://subtitlessource1.com/")
  //   })

  //   it("returns the second subtitle source following a failover", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     mediaSources.failoverSubtitles()

  //     expect(mediaSources.currentSubtitlesSource()).toBe("http://subtitlessource2.com/")
  //   })
  // })

  // describe("currentSubtitlesSegmentLength", () => {
  //   it("returns the first subtitles segment length", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     expect(mediaSources.currentSubtitlesSegmentLength()).toBe(SEGMENT_LENGTH)
  //   })
  // })

  // describe("currentSubtitlesCdn", () => {
  //   it("returns the first subtitles cdn", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     expect(mediaSources.currentSubtitlesCdn()).toBe("http://supplier1.com/")
  //   })
  // })

  // describe("failoverSubtitles", () => {
  //   it("When there are subtitles sources to failover to, it calls the post failover callback", async () => {
  //     testMedia.captions = [
  //       { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
  //       { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     const handleSubtitleFailoverSuccess = jest.fn()
  //     const handleSubtitleFailoverError = jest.fn()

  //     mediaSources.failoverSubtitles(handleSubtitleFailoverSuccess, handleSubtitleFailoverError)

  //     expect(handleSubtitleFailoverSuccess).toHaveBeenCalledTimes(1)
  //     expect(handleSubtitleFailoverError).not.toHaveBeenCalled()
  //   })

  //   it("When there are no more subtitles sources to failover to, it calls failure action callback", async () => {
  //     testMedia.captions = [
  //       { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     const handleSubtitleFailoverSuccess = jest.fn()
  //     const handleSubtitleFailoverError = jest.fn()

  //     mediaSources.failoverSubtitles(handleSubtitleFailoverSuccess, handleSubtitleFailoverError)

  //     expect(handleSubtitleFailoverSuccess).not.toHaveBeenCalled()
  //     expect(handleSubtitleFailoverError).toHaveBeenCalledTimes(1)
  //   })

  //   it("fires onSubtitlesLoadError plugin with correct parameters when there are sources available to failover to", async () => {
  //     testMedia.captions = [
  //       { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
  //       { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     mediaSources.failoverSubtitles(jest.fn(), jest.fn(), { statusCode: 404 })

  //     expect(Plugins.interface.onSubtitlesLoadError).toHaveBeenCalledWith({
  //       status: 404,
  //       severity: PluginEnums.STATUS.FAILOVER,
  //       cdn: "http://supplier1.com/",
  //       subtitlesSources: 2,
  //     })
  //   })

  //   it("fires onSubtitlesLoadError plugin with correct parameters when there are no sources available to failover to", async () => {
  //     testMedia.captions = [
  //       { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     mediaSources.failoverSubtitles(jest.fn(), jest.fn(), { statusCode: 404 })

  //     expect(Plugins.interface.onSubtitlesLoadError).toHaveBeenCalledWith({
  //       status: 404,
  //       severity: PluginEnums.STATUS.FATAL,
  //       cdn: "http://supplier1.com/",
  //       subtitlesSources: 1,
  //     })
  //   })
  // })

  // describe("availableSources", () => {
  //   it("returns an array of media source urls", async () => {
  //     testMedia.urls = [
  //       { url: "http://source1.com/", cdn: "http://cdn1.com" },
  //       { url: "http://source2.com/", cdn: "http://cdn2.com" },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       windowType: WindowTypes.STATIC,
  //       liveSupport: LiveSupport.SEEKABLE,
  //     })

  //     expect(mediaSources.availableSources()).toEqual(["http://source1.com/", "http://source2.com/"])
  //   })
  // })

  // describe("should Failover", () => {
  //   let mediaSources

  //   describe("when window type is STATIC", () => {
  //     beforeEach(async () => {
  //       testMedia.urls = [
  //         { url: "http://source1.com/", cdn: "http://cdn1.com" },
  //         { url: "http://source2.com/", cdn: "http://cdn2.com" },
  //       ]

  //       mediaSources = await initMediaSources(testMedia, {
  //         initialWallclockTime: Date.now(),
  //         windowType: WindowTypes.STATIC,
  //         liveSupport: LiveSupport.SEEKABLE,
  //       })
  //     })

  //     it("should failover if current time is greater than 5 seconds from duration", () => {
  //       const onSuccessStub = jest.fn()
  //       const onErrorStub = jest.fn()

  //       const failoverParams = {
  //         duration: 100,
  //         currentTime: 94,
  //         isBufferingTimeoutError: false,
  //       }

  //       mediaSources.failover(onSuccessStub, onErrorStub, failoverParams)

  //       expect(onSuccessStub).toHaveBeenCalledTimes(1)
  //     })

  //     it("should not failover if current time is within 5 seconds of duration", () => {
  //       const onSuccessStub = jest.fn()
  //       const onErrorStub = jest.fn()

  //       const failoverParams = {
  //         duration: 100,
  //         currentTime: 96,
  //         isBufferingTimeoutError: false,
  //       }

  //       mediaSources.failover(onSuccessStub, onErrorStub, failoverParams)

  //       expect(onErrorStub).toHaveBeenCalledTimes(1)
  //     })

  //     it("should failover if playback has not yet started", () => {
  //       const onSuccessStub = jest.fn()
  //       const onErrorStub = jest.fn()

  //       const failoverParams = {
  //         duration: 0,
  //         currentTime: undefined,
  //         isBufferingTimeoutError: false,
  //       }

  //       mediaSources.failover(onSuccessStub, onErrorStub, failoverParams)

  //       expect(onSuccessStub).toHaveBeenCalledTimes(1)
  //     })
  //   })

  //   describe("when window type is not STATIC", () => {
  //     beforeEach(() => {
  //       testMedia.urls = [
  //         { url: "http://source1.com/", cdn: "http://cdn1.com" },
  //         { url: "http://source2.com/", cdn: "http://cdn2.com" },
  //       ]
  //     })

  //     describe("and transfer format is DASH", () => {
  //       it.each([WindowTypes.GROWING, WindowTypes.SLIDING])(
  //         "should not reload the manifest for window type: '%s'",
  //         async (windowType) => {
  //           ManifestLoader.load.mockResolvedValueOnce({
  //             time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 },
  //             transferFormat: DASH,
  //           })

  //           const mediaSources = await initMediaSources(testMedia, {
  //             windowType,
  //             initialWallclockTime: Date.now(),
  //             liveSupport: LiveSupport.SEEKABLE,
  //           })

  //           expect(ManifestLoader.load).toHaveBeenCalledTimes(1)

  //           mediaSources.failover(jest.fn(), jest.fn(), {
  //             isBufferingTimeoutError: false,
  //           })

  //           expect(ManifestLoader.load).toHaveBeenCalledTimes(1)
  //         }
  //       )
  //     })

  //     describe("and transfer format is HLS", () => {
  //       it.each([WindowTypes.GROWING, WindowTypes.SLIDING])(
  //         "should reload the manifest for window type '%s'",
  //         async (windowType) => {
  //           ManifestLoader.load.mockResolvedValueOnce({
  //             time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: NaN },
  //             transferFormat: HLS,
  //           })

  //           const mediaSources = await initMediaSources(testMedia, {
  //             windowType,
  //             initialWallclockTime: Date.now(),
  //             liveSupport: LiveSupport.SEEKABLE,
  //           })

  //           expect(ManifestLoader.load).toHaveBeenCalledTimes(1)

  //           mediaSources.failover(jest.fn(), jest.fn(), {
  //             isBufferingTimeoutError: false,
  //           })

  //           expect(ManifestLoader.load).toHaveBeenCalledTimes(2)
  //         }
  //       )
  //     })
  //   })
  // })

  // describe("refresh", () => {
  //   it("updates the mediasources time data", async () => {
  //     ManifestLoader.load.mockResolvedValueOnce({
  //       time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 },
  //       transferFormat: DASH,
  //     })

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       liveSupport: LiveSupport.SEEKABLE,
  //       windowType: WindowTypes.SLIDING,
  //     })

  //     const existingSource = mediaSources.currentSource()

  //     // test the current time hasn't changed
  //     expect(mediaSources.time()).toEqual({ windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 })

  //     ManifestLoader.load.mockResolvedValueOnce({
  //       time: { windowStartTime: 6000, windowEndTime: 16000, timeCorrectionSeconds: 6 },
  //       transferFormat: DASH,
  //     })

  //     await new Promise((resolve, reject) =>
  //       mediaSources.refresh(
  //         () => resolve(),
  //         () => reject()
  //       )
  //     )

  //     expect(mediaSources.currentSource()).toEqual(existingSource)
  //   })

  //   // [tag:ServerDate]
  //   it("does not pass initial wall-clock time to the manifest loader", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       liveSupport: LiveSupport.SEEKABLE,
  //       windowType: WindowTypes.SLIDING,
  //     })

  //     await new Promise((resolve, reject) =>
  //       mediaSources.refresh(
  //         () => resolve(),
  //         () => reject()
  //       )
  //     )

  //     expect(ManifestLoader.load).toHaveBeenCalledTimes(2)
  //     expect(ManifestLoader.load).toHaveBeenNthCalledWith(
  //       2,
  //       "http://source1.com/",
  //       expect.not.objectContaining({ initialWallclockTime: expect.anything() })
  //     )
  //   })
  // })

  // describe("failoverTimeout", () => {
  //   beforeEach(() => {
  //     testMedia.urls = [
  //       { url: "http://source1.com/", cdn: "http://cdn1.com" },
  //       { url: "http://source2.com/", cdn: "http://cdn2.com" },
  //     ]
  //   })

  //   it("should add the cdn that failed back in to available cdns after a timeout", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       liveSupport: LiveSupport.SEEKABLE,
  //       windowType: WindowTypes.SLIDING,
  //     })

  //     const expectedCdns = [...mediaSources.availableSources()].reverse()

  //     mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: false })

  //     jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT)

  //     expect(mediaSources.availableSources()).toEqual(expectedCdns)
  //   })

  //   it("should not contain the cdn that failed before the timeout has occured", async () => {
  //     testMedia.urls = [
  //       { url: "http://source1.com/", cdn: "http://cdn1.com" },
  //       { url: "http://source2.com/", cdn: "http://cdn2.com" },
  //     ]

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       liveSupport: LiveSupport.SEEKABLE,
  //       windowType: WindowTypes.SLIDING,
  //     })

  //     mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: false })

  //     expect(mediaSources.availableSources()).not.toContain("http://cdn1.com")
  //   })

  //   it("should not preserve timers over teardown boundaries", async () => {
  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       liveSupport: LiveSupport.SEEKABLE,
  //       windowType: WindowTypes.SLIDING,
  //     })

  //     mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: false })

  //     mediaSources.tearDown()

  //     jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT)

  //     expect(mediaSources.availableSources()).toEqual([])
  //   })
  // })

  // describe("failoverSort", () => {
  //   it("called when provided as an override in playerSettings", async () => {
  //     testMedia.urls = [
  //       { url: "http://source1.com/", cdn: "http://cdn1.com" },
  //       { url: "http://source2.com/", cdn: "http://cdn2.com" },
  //     ]

  //     const mockFailoverSort = jest.fn().mockReturnValue([...testMedia.urls].reverse())

  //     testMedia.playerSettings = {
  //       failoverSort: mockFailoverSort,
  //     }

  //     const mediaSources = await initMediaSources(testMedia, {
  //       initialWallclockTime: Date.now(),
  //       liveSupport: LiveSupport.SEEKABLE,
  //       windowType: WindowTypes.SLIDING,
  //     })

  //     mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: true })

  //     expect(mockFailoverSort).toHaveBeenCalledTimes(1)
  //   })
  // })
})
