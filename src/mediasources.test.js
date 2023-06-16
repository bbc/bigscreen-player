import WindowTypes from "./models/windowtypes"
import LiveSupport from "./models/livesupport"
import TransferFormats from "./models/transferformats"
import PluginEnums from "./pluginenums"
import MediaSources from "./mediasources"
import Plugins from "./plugins"
import ManifestLoader from "./manifest/manifestloader"
import getError from "./testutils/geterror"

jest.mock("./manifest/manifestloader", () => ({ load: jest.fn(() => Promise.resolve({ time: {} })) }))

jest.mock("./plugins", () => ({
  interface: {
    onErrorCleared: jest.fn(),
    onBuffering: jest.fn(),
    onBufferingCleared: jest.fn(),
    onError: jest.fn(),
    onFatalError: jest.fn(),
    onErrorHandled: jest.fn(),
    onSubtitlesLoadError: jest.fn(),
  },
}))

describe("Media Sources", () => {
  const FAILOVER_RESET_TIMEOUT = 60000
  const SEGMENT_LENGTH = 3.84

  const initMediaSources = (media, { initialWallclockTime, windowType, liveSupport } = {}) => {
    const mediaSources = MediaSources()

    return new Promise((resolveInit, rejectInit) =>
      mediaSources.init(media, initialWallclockTime, windowType, liveSupport, {
        onSuccess: () => resolveInit(mediaSources),
        onError: (error) => rejectInit(error),
      })
    )
  }

  let testMedia

  beforeAll(() => {
    jest.useFakeTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()

    testMedia = {
      urls: [{ url: "http://source1.com/", cdn: "http://supplier1.com/" }],
      captions: [{ url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH }],
      playerSettings: {
        failoverResetTime: FAILOVER_RESET_TIMEOUT,
      },
    }
  })

  describe("init", () => {
    it("throws an error when initialised with no sources", () => {
      testMedia.urls = []

      const mediaSources = MediaSources()

      expect(() =>
        mediaSources.init(testMedia, Date.now(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {
          onSuccess: jest.fn(),
          onError: jest.fn(),
        })
      ).toThrow(new Error("Media Sources urls are undefined"))
    })

    it("clones the urls", async () => {
      testMedia.urls = [{ url: "mock://url.test/", cdn: "mock://cdn.test/" }]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      testMedia.urls[0].url = "mock://url.clone/"

      expect(mediaSources.currentSource()).toBe("mock://url.test/")
    })

    it.each([
      ["both callbacks", {}],
      ["success callback", { onError: jest.fn() }],
      ["failure callback", { onSuccess: jest.fn() }],
    ])("throws an error when %s are undefined", (_, callbacks) => {
      const mediaSources = MediaSources()

      expect(() =>
        mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, callbacks)
      ).toThrow("Media Sources callbacks are undefined")
    })

    it.each([WindowTypes.GROWING, WindowTypes.SLIDING])(
      "passes the '%s' window type to the manifest loader",
      async (windowType) => {
        await initMediaSources(testMedia, {
          windowType,
          initialWallclockTime: Date.now(),
          liveSupport: LiveSupport.SEEKABLE,
        })

        expect(ManifestLoader.load).toHaveBeenCalledWith("http://source1.com/", expect.objectContaining({ windowType }))
      }
    )

    it("calls onSuccess callback immediately for STATIC window content", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.time()).toEqual({})
    })

    it("calls onSuccess callback immediately for LIVE content on a PLAYABLE device", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.SLIDING,
        liveSupport: LiveSupport.PLAYABLE,
      })

      expect(mediaSources.time()).toEqual({})
    })

    it("calls onSuccess callback when manifest loader returns on success for SLIDING window content", async () => {
      ManifestLoader.load.mockResolvedValueOnce({
        time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 },
        transferFormat: TransferFormats.DASH,
      })

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.SLIDING,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.time()).toEqual({ windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 })
    })

    it("fetch presentation time offset from the manifest for on-demand media with segmented subtitles", async () => {
      testMedia.captions = [
        { url: "mock://some.media/captions/$segment$.m4s", cdn: "foo", segmentLength: SEGMENT_LENGTH },
      ]

      ManifestLoader.load.mockResolvedValueOnce({
        time: { presentationTimeOffsetSeconds: 54 },
        transferFormat: TransferFormats.DASH,
      })

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.time()).toEqual({ presentationTimeOffsetSeconds: 54 })
    })

    it("calls onError when manifest fails to load for media with segmented subtitles", async () => {
      testMedia.captions = [
        { url: "mock://some.media/captions/$segment$.m4s", cdn: "foo", segmentLength: SEGMENT_LENGTH },
      ]

      ManifestLoader.load.mockRejectedValueOnce()

      const error = await getError(async () =>
        initMediaSources(testMedia, {
          initialWallclockTime: Date.now(),
          windowType: WindowTypes.STATIC,
          liveSupport: LiveSupport.SEEKABLE,
        })
      )

      expect(error).toEqual({ error: "manifest" })
    })

    it.skip("fails over to next source when the first source fails to load", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      ManifestLoader.load.mockRejectedValueOnce()
      ManifestLoader.load.mockResolvedValueOnce({
        time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 },
        transferFormat: TransferFormats.DASH,
      })

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.SLIDING,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.time()).toEqual({ windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 })
    })

    it("calls onError callback when manifest loader fails and there are insufficent sources to failover to", async () => {
      ManifestLoader.load.mockRejectedValueOnce()

      const error = await getError(async () =>
        initMediaSources(testMedia, {
          initialWallclockTime: Date.now(),
          windowType: WindowTypes.SLIDING,
          liveSupport: LiveSupport.SEEKABLE,
        })
      )

      expect(error).toEqual({ error: "manifest" })
    })

    it("sets time data correcly when manifest loader successfully returns", async () => {
      ManifestLoader.load.mockResolvedValueOnce({
        time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 },
        transferFormat: TransferFormats.DASH,
      })

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.SLIDING,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.time()).toEqual({ windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 })
    })

    it("overrides the subtitlesRequestTimeout when set in media object", async () => {
      testMedia.subtitlesRequestTimeout = 60000

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.SLIDING,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.subtitlesRequestTimeout()).toBe(60000)
    })
  })

  describe("failover", () => {
    it("should load the manifest from the next url if manifest load is required", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      // HLS manifests must be reloaded on failover to fetch accurate start time
      ManifestLoader.load.mockResolvedValueOnce({
        time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: NaN },
        transferFormat: TransferFormats.HLS,
      })

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.SLIDING,
        liveSupport: LiveSupport.SEEKABLE,
      })

      mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: true })

      expect(ManifestLoader.load).toHaveBeenCalledTimes(2)

      expect(ManifestLoader.load).toHaveBeenNthCalledWith(
        2,
        "http://source2.com/",
        expect.objectContaining({ windowType: WindowTypes.SLIDING })
      )
    })

    it("should fire onErrorHandled plugin with correct error code and message when failing to load manifest", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      ManifestLoader.load.mockRejectedValueOnce()

      await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.SLIDING,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(Plugins.interface.onErrorHandled).toHaveBeenCalledWith({
        status: PluginEnums.STATUS.FAILOVER,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
        cdn: "http://supplier1.com/",
        newCdn: "http://supplier2.com/",
        isInitialPlay: undefined,
        timeStamp: expect.any(Object),
        code: PluginEnums.ERROR_CODES.MANIFEST_LOAD,
        message: PluginEnums.ERROR_MESSAGES.MANIFEST,
      })
    })

    it("When there are sources to failover to, it calls the post failover callback", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleFailoverSuccess = jest.fn()
      const handleFailoverError = jest.fn()

      mediaSources.failover(handleFailoverSuccess, handleFailoverError, { isBufferingTimeoutError: true })

      expect(handleFailoverSuccess).toHaveBeenCalled()
      expect(handleFailoverError).not.toHaveBeenCalled()
    })

    it("When there are no more sources to failover to, it calls failure action callback", async () => {
      testMedia.urls = [{ url: "http://source1.com/", cdn: "http://supplier1.com/" }]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleFailoverSuccess = jest.fn()
      const handleFailoverError = jest.fn()

      mediaSources.failover(handleFailoverSuccess, handleFailoverError, { isBufferingTimeoutError: true })

      expect(handleFailoverSuccess).not.toHaveBeenCalled()
      expect(handleFailoverError).toHaveBeenCalledWith()
    })

    it("When there are sources to failover to, it emits correct plugin event", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleFailoverSuccess = jest.fn()
      const handleFailoverError = jest.fn()

      mediaSources.failover(handleFailoverSuccess, handleFailoverError, {
        isBufferingTimeoutError: true,
        code: 0,
        message: "unknown",
      })

      expect(Plugins.interface.onErrorHandled).toHaveBeenCalledWith({
        status: PluginEnums.STATUS.FAILOVER,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: true,
        cdn: "http://supplier1.com/",
        newCdn: "http://supplier2.com/",
        isInitialPlay: undefined,
        timeStamp: expect.any(Object),
        code: 0,
        message: "unknown",
      })
    })

    it("Plugin event not emitted when there are no sources to failover to", async () => {
      testMedia.urls = [{ url: "http://source1.com/", cdn: "http://supplier1.com/" }]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleFailoverSuccess = jest.fn()
      const handleFailoverError = jest.fn()

      mediaSources.failover(handleFailoverSuccess, handleFailoverError, { isBufferingTimeoutError: true })

      expect(Plugins.interface.onErrorHandled).not.toHaveBeenCalled()
    })

    it("moves the specified service location to the top of the list", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://supplier1.com/" },
        { url: "http://source2.com/", cdn: "http://supplier2.com/" },
        { url: "http://source3.com/", cdn: "http://supplier3.com/" },
        { url: "http://source4.com/", cdn: "http://supplier4.com/" },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleFailoverSuccess = jest.fn()
      const handleFailoverError = jest.fn()

      const serviceLocation = "http://source3.com/?key=value#hash"

      mediaSources.failover(handleFailoverSuccess, handleFailoverError, {
        serviceLocation,
        isBufferingTimeoutError: true,
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

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleFailoverSuccess = jest.fn()
      const handleFailoverError = jest.fn()

      mediaSources.failover(handleFailoverSuccess, handleFailoverError, {
        isBufferingTimeoutError: true,
        serviceLocation: "http://sourceInfinity.com/?key=value#hash",
      })

      expect(mediaSources.currentSource()).toBe("http://source2.com/")
    })
  })

  describe("isFirstManifest", () => {
    it("does not failover if service location is identical to current source cdn besides path", async () => {
      testMedia.urls = [
        { url: "http://source1.com/path/to/thing.extension", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.currentSource()).toBe("http://source1.com/path/to/thing.extension")

      mediaSources.failover(jest.fn(), jest.fn(), {
        isBufferingTimeoutError: false,
        serviceLocation: "http://source1.com/path/to/different/thing.extension",
      })

      expect(mediaSources.currentSource()).toBe("http://source1.com/path/to/thing.extension")
    })

    it("does not failover if service location is identical to current source cdn besides hash and query", async () => {
      testMedia.urls = [
        { url: "http://source1.com", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.currentSource()).toBe("http://source1.com")

      mediaSources.failover(jest.fn(), jest.fn(), {
        isBufferingTimeoutError: false,
        serviceLocation: "http://source1.com?key=value#hash",
      })

      expect(mediaSources.currentSource()).toBe("http://source1.com")
    })
  })

  describe("currentSource", () => {
    beforeEach(() => {
      testMedia.urls = [
        { url: "http://source1.com", cdn: "http://cdn1.com" },
        { url: "http://source2.com", cdn: "http://cdn2.com" },
      ]
    })

    it("returns the first media source url", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.currentSource()).toBe("http://source1.com")
    })

    it("returns the second media source following a failover", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: true })

      expect(mediaSources.currentSource()).toBe("http://source2.com")
    })
  })

  describe("currentSubtitlesSource", () => {
    beforeEach(() => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
        { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
      ]
    })

    it("returns the first subtitles source url", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.currentSubtitlesSource()).toBe("http://subtitlessource1.com/")
    })

    it("returns the second subtitle source following a failover", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      mediaSources.failoverSubtitles()

      expect(mediaSources.currentSubtitlesSource()).toBe("http://subtitlessource2.com/")
    })
  })

  describe("currentSubtitlesSegmentLength", () => {
    it("returns the first subtitles segment length", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.currentSubtitlesSegmentLength()).toBe(SEGMENT_LENGTH)
    })
  })

  describe("currentSubtitlesCdn", () => {
    it("returns the first subtitles cdn", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.currentSubtitlesCdn()).toBe("http://supplier1.com/")
    })
  })

  describe("failoverSubtitles", () => {
    it("When there are subtitles sources to failover to, it calls the post failover callback", async () => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
        { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleSubtitleFailoverSuccess = jest.fn()
      const handleSubtitleFailoverError = jest.fn()

      mediaSources.failoverSubtitles(handleSubtitleFailoverSuccess, handleSubtitleFailoverError)

      expect(handleSubtitleFailoverSuccess).toHaveBeenCalledTimes(1)
      expect(handleSubtitleFailoverError).not.toHaveBeenCalled()
    })

    it("When there are no more subtitles sources to failover to, it calls failure action callback", async () => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      const handleSubtitleFailoverSuccess = jest.fn()
      const handleSubtitleFailoverError = jest.fn()

      mediaSources.failoverSubtitles(handleSubtitleFailoverSuccess, handleSubtitleFailoverError)

      expect(handleSubtitleFailoverSuccess).not.toHaveBeenCalled()
      expect(handleSubtitleFailoverError).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesLoadError plugin with correct parameters when there are sources available to failover to", async () => {
      testMedia.captions = [
        { url: "http://subtitlessource1.com/", cdn: "http://supplier1.com/", segmentLength: SEGMENT_LENGTH },
        { url: "http://subtitlessource2.com/", cdn: "http://supplier2.com/", segmentLength: SEGMENT_LENGTH },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      mediaSources.failoverSubtitles(jest.fn(), jest.fn(), { statusCode: 404 })

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

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      mediaSources.failoverSubtitles(jest.fn(), jest.fn(), { statusCode: 404 })

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

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        windowType: WindowTypes.STATIC,
        liveSupport: LiveSupport.SEEKABLE,
      })

      expect(mediaSources.availableSources()).toEqual(["http://source1.com/", "http://source2.com/"])
    })
  })

  describe("should Failover", () => {
    let mediaSources

    describe("when window type is STATIC", () => {
      beforeEach(async () => {
        testMedia.urls = [
          { url: "http://source1.com/", cdn: "http://cdn1.com" },
          { url: "http://source2.com/", cdn: "http://cdn2.com" },
        ]

        mediaSources = await initMediaSources(testMedia, {
          initialWallclockTime: Date.now(),
          windowType: WindowTypes.STATIC,
          liveSupport: LiveSupport.SEEKABLE,
        })
      })

      it("should failover if current time is greater than 5 seconds from duration", () => {
        const onSuccessStub = jest.fn()
        const onErrorStub = jest.fn()

        const failoverParams = {
          duration: 100,
          currentTime: 94,
          isBufferingTimeoutError: false,
        }

        mediaSources.failover(onSuccessStub, onErrorStub, failoverParams)

        expect(onSuccessStub).toHaveBeenCalledTimes(1)
      })

      it("should not failover if current time is within 5 seconds of duration", () => {
        const onSuccessStub = jest.fn()
        const onErrorStub = jest.fn()

        const failoverParams = {
          duration: 100,
          currentTime: 96,
          isBufferingTimeoutError: false,
        }

        mediaSources.failover(onSuccessStub, onErrorStub, failoverParams)

        expect(onErrorStub).toHaveBeenCalledTimes(1)
      })

      it("should failover if playback has not yet started", () => {
        const onSuccessStub = jest.fn()
        const onErrorStub = jest.fn()

        const failoverParams = {
          duration: 0,
          currentTime: undefined,
          isBufferingTimeoutError: false,
        }

        mediaSources.failover(onSuccessStub, onErrorStub, failoverParams)

        expect(onSuccessStub).toHaveBeenCalledTimes(1)
      })
    })

    describe("when window type is not STATIC", () => {
      beforeEach(() => {
        testMedia.urls = [
          { url: "http://source1.com/", cdn: "http://cdn1.com" },
          { url: "http://source2.com/", cdn: "http://cdn2.com" },
        ]
      })

      describe("and transfer format is DASH", () => {
        it.each([WindowTypes.GROWING, WindowTypes.SLIDING])(
          "should not reload the manifest for window type: '%s'",
          async (windowType) => {
            ManifestLoader.load.mockResolvedValueOnce({
              time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 },
              transferFormat: TransferFormats.DASH,
            })

            const mediaSources = await initMediaSources(testMedia, {
              windowType,
              initialWallclockTime: Date.now(),
              liveSupport: LiveSupport.SEEKABLE,
            })

            expect(ManifestLoader.load).toHaveBeenCalledTimes(1)

            mediaSources.failover(jest.fn(), jest.fn(), {
              isBufferingTimeoutError: false,
            })

            expect(ManifestLoader.load).toHaveBeenCalledTimes(1)
          }
        )
      })

      describe("and transfer format is HLS", () => {
        it.each([WindowTypes.GROWING, WindowTypes.SLIDING])(
          "should reload the manifest for window type '%s'",
          async (windowType) => {
            ManifestLoader.load.mockResolvedValueOnce({
              time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: NaN },
              transferFormat: TransferFormats.HLS,
            })

            const mediaSources = await initMediaSources(testMedia, {
              windowType,
              initialWallclockTime: Date.now(),
              liveSupport: LiveSupport.SEEKABLE,
            })

            expect(ManifestLoader.load).toHaveBeenCalledTimes(1)

            mediaSources.failover(jest.fn(), jest.fn(), {
              isBufferingTimeoutError: false,
            })

            expect(ManifestLoader.load).toHaveBeenCalledTimes(2)
          }
        )
      })
    })
  })

  describe("refresh", () => {
    it("updates the mediasources time data", async () => {
      ManifestLoader.load.mockResolvedValueOnce({
        time: { windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 },
        transferFormat: TransferFormats.DASH,
      })

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        liveSupport: LiveSupport.SEEKABLE,
        windowType: WindowTypes.SLIDING,
      })

      const existingSource = mediaSources.currentSource()

      // test the current time hasn't changed
      expect(mediaSources.time()).toEqual({ windowStartTime: 1000, windowEndTime: 10000, timeCorrectionSeconds: 1 })

      ManifestLoader.load.mockResolvedValueOnce({
        time: { windowStartTime: 6000, windowEndTime: 16000, timeCorrectionSeconds: 6 },
        transferFormat: TransferFormats.DASH,
      })

      await new Promise((resolve, reject) =>
        mediaSources.refresh(
          () => resolve(),
          () => reject()
        )
      )

      expect(mediaSources.currentSource()).toEqual(existingSource)

      expect(mediaSources.time()).toEqual({ windowStartTime: 6000, windowEndTime: 16000, timeCorrectionSeconds: 6 })
    })
  })

  describe("failoverTimeout", () => {
    beforeEach(() => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://cdn1.com" },
        { url: "http://source2.com/", cdn: "http://cdn2.com" },
      ]
    })

    it("should add the cdn that failed back in to available cdns after a timeout", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        liveSupport: LiveSupport.SEEKABLE,
        windowType: WindowTypes.SLIDING,
      })

      const expectedCdns = [...mediaSources.availableSources()].reverse()

      mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: false })

      jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT)

      expect(mediaSources.availableSources()).toEqual(expectedCdns)
    })

    it("should not contain the cdn that failed before the timeout has occured", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://cdn1.com" },
        { url: "http://source2.com/", cdn: "http://cdn2.com" },
      ]

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        liveSupport: LiveSupport.SEEKABLE,
        windowType: WindowTypes.SLIDING,
      })

      mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: false })

      expect(mediaSources.availableSources()).not.toContain("http://cdn1.com")
    })

    it("should not preserve timers over teardown boundaries", async () => {
      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        liveSupport: LiveSupport.SEEKABLE,
        windowType: WindowTypes.SLIDING,
      })

      mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: false })

      mediaSources.tearDown()

      jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT)

      expect(mediaSources.availableSources()).toEqual([])
    })
  })

  describe("failoverSort", () => {
    it("called when provided as an override in playerSettings", async () => {
      testMedia.urls = [
        { url: "http://source1.com/", cdn: "http://cdn1.com" },
        { url: "http://source2.com/", cdn: "http://cdn2.com" },
      ]

      const mockFailoverSort = jest.fn().mockReturnValue([...testMedia.urls].reverse())

      testMedia.playerSettings = {
        failoverSort: mockFailoverSort,
      }

      const mediaSources = await initMediaSources(testMedia, {
        initialWallclockTime: Date.now(),
        liveSupport: LiveSupport.SEEKABLE,
        windowType: WindowTypes.SLIDING,
      })

      mediaSources.failover(jest.fn(), jest.fn(), { isBufferingTimeoutError: true })

      expect(mockFailoverSort).toHaveBeenCalledTimes(1)
    })
  })
})
