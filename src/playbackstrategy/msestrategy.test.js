import MediaKinds from "../models/mediakinds"
// import LiveSupport from "../models/livesupport"
import MSEStrategy from "./msestrategy"
// import TimeUtils from "../utils/timeutils"
// import DynamicWindowUtils from "../dynamicwindowutils"
// import Plugins from "../plugins"
// import DebugTool from "../debugger/debugtool"
import Utils from "../utils/playbackutils"
// import PauseTriggers from "../models/pausetriggers"
import { ManifestType } from "../models/manifesttypes"
import { MediaPlayer } from "dashjs/index_mediaplayerOnly"

jest.mock("dashjs/index_mediaplayerOnly", () => ({ MediaPlayer: jest.fn() }))
jest.mock("../dynamicwindowutils")
jest.mock("../debugger/debugtool")

const mockDashAdapter = {
  getIndexForRepresentation: jest.fn().mockReturnValue(0),
}

const mockDashMetrics = {
  getCurrentDVRInfo: jest.fn(),
  getCurrentBufferLevel: jest.fn().mockReturnValue(0),
  getCurrentRepresentationSwitch: jest.fn().mockReturnValue(0),
  getCurrentIndexForRepresentation: jest.fn().mockReturnValue(1),
}

const mockDashInstance = {
  initialize: jest.fn(),
  retrieveManifest: jest.fn(),
  refreshManifest: jest.fn().mockImplementation((onRefresh) => onRefresh({})),
  getDebug: jest.fn(),
  getSource: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  time: jest.fn(),
  duration: jest.fn(),
  attachSource: jest.fn(),
  reset: jest.fn(),
  destroy: jest.fn(),
  isPaused: jest.fn(),
  pause: jest.fn(),
  play: jest.fn(),
  seek: jest.fn(),
  isReady: jest.fn(),
  getDashMetrics: jest.fn().mockReturnValue(mockDashMetrics),
  getDashAdapter: jest.fn().mockReturnValue(mockDashAdapter),
  getBitrateInfoListFor: jest.fn(),
  getAverageThroughput: jest.fn(),
  getDVRWindowSize: jest.fn(),
  updateSettings: jest.fn(),
  setMediaDuration: jest.fn(),
  setPlaybackRate: jest.fn(),
  getPlaybackRate: jest.fn(),
  setBlacklistExpiryTime: jest.fn(),
  getActiveStream: jest.fn(() => ({
    getProcessors: jest.fn(() => []),
  })),
}

const mockDashMediaPlayer = {
  create: jest.fn(() => mockDashInstance),
}

const mockMediaSources = {
  init: jest.fn().mockResolvedValue(),
  tearDown: jest.fn(),
  time: jest.fn(),
  failoverResetTime: jest.fn().mockReturnValue(10),
  currentSource: jest.fn().mockReturnValue(""),
  availableSources: jest.fn().mockReturnValue([]),
  failover: jest.fn().mockResolvedValue(),
}

describe("Media Source Extensions Playback Strategy", () => {
  const dashjsMediaPlayerEvents = {
    ERROR: "error",
    MANIFEST_LOADED: "manifestLoaded",
    MANIFEST_VALIDITY_CHANGED: "manifestValidityChanged",
    QUALITY_CHANGE_RENDERED: "qualityChangeRendered",
    BASE_URL_SELECTED: "baseUrlSelected",
    METRIC_ADDED: "metricAdded",
    METRIC_CHANGED: "metricChanged",
    FRAGMENT_CONTENT_LENGTH_MISMATCH: "fragmentContentLengthMismatch",
  }

  let eventHandlers
  let playbackElement
  let cdnArray = []
  let mediaElement

  const originalCreateElement = document.createElement

  function dispatchDashEvent(eventType, event) {
    if (typeof eventHandlers[eventType] !== "function") {
      return
    }

    eventHandlers[eventType].call(eventType, event)
  }

  const mockMediaElement = (mediaKind) => {
    const mediaEl = originalCreateElement.call(document, mediaKind)

    mediaEl.__mocked__ = true

    jest.spyOn(mediaEl, "addEventListener")
    jest.spyOn(mediaEl, "removeEventListener")

    return mediaEl
  }

  const isMockedElement = (el) => el instanceof HTMLElement && el.__mocked__

  beforeAll(() => {
    MediaPlayer.mockReturnValue(mockDashMediaPlayer)

    jest.spyOn(document, "createElement").mockImplementation((elementType) => {
      if (["audio", "video"].includes(elementType)) {
        mediaElement = mockMediaElement(elementType)
        return mediaElement
      }

      return originalCreateElement.call(document, elementType)
    })

    mockDashInstance.on.mockImplementation((eventType, handler) => {
      eventHandlers[eventType] = handler
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    eventHandlers = {}

    delete window.bigscreenPlayer

    mediaElement = undefined

    window.bigscreenPlayer = {}

    mockMediaSources.time.mockReturnValue({
      manifestType: ManifestType.STATIC,
      presentationTimeOffsetInMilliseconds: 0,
      availabilityStartTimeInMilliseconds: 0,
      timeShiftBufferDepthInMilliseconds: 0,
    })

    mockDashInstance.duration.mockReturnValue(100)
    mockDashInstance.isReady.mockReturnValue(true)

    mockDashMetrics.getCurrentDVRInfo.mockReturnValue({ range: { start: 0, end: 100 } })

    playbackElement = originalCreateElement.call(document, "div")

    cdnArray = [{ url: "http://cdn1.com/" }, { url: "http://cdn2.com/" }, { url: "http://cdn3.com/" }]
  })

  describe("Load for the first time (when there is no current mediaPlayer)", () => {
    it("should create a video element and add as a child of the input playback element", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(playbackElement.childElementCount).toBe(0)

      mseStrategy.load(null, 0)

      expect(playbackElement.childElementCount).toBe(1)
      expect(playbackElement.firstChild).toBeInstanceOf(HTMLVideoElement)
      expect(playbackElement.firstChild).toBe(mediaElement)
      expect(isMockedElement(playbackElement.firstChild)).toBe(true)
    })

    it("should create a audio element and add as a child of the input playback element", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.AUDIO, playbackElement)

      expect(playbackElement.childElementCount).toBe(0)

      mseStrategy.load(null, 0)

      expect(playbackElement.childElementCount).toBe(1)

      expect(playbackElement.firstChild).toBeInstanceOf(HTMLAudioElement)
      expect(playbackElement.firstChild).toBe(mediaElement)
      expect(isMockedElement(playbackElement.firstChild)).toBe(true)
    })

    it("should initialise MediaPlayer with the expected parameters when no start time is present", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url)
    })

    it("should modify the manifest when dashjs fires a manifest loaded event", () => {
      mockMediaSources.availableSources.mockReturnValueOnce([cdnArray[0].url, cdnArray[1].url, cdnArray[2].url])

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      const testManifestObject = {
        type: "manifestLoaded",
        data: {
          Period: {
            BaseURL: "dash/",
          },
        },
      }

      dispatchDashEvent(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject)

      const baseUrlArray = [
        {
          "__text": `${cdnArray[0].url}dash/`,
          "dvb:priority": 0,
          "dvb:weight": 0,
          "serviceLocation": cdnArray[0].url,
        },
        {
          "__text": `${cdnArray[1].url}dash/`,
          "dvb:priority": 1,
          "dvb:weight": 0,
          "serviceLocation": cdnArray[1].url,
        },
        {
          "__text": `${cdnArray[2].url}dash/`,
          "dvb:priority": 2,
          "dvb:weight": 0,
          "serviceLocation": cdnArray[2].url,
        },
      ]

      expect(testManifestObject.data.BaseURL_asArray).toEqual(baseUrlArray)
    })

    it("does not pass BSP specific settings to Dash", () => {
      const liveDelay = 20
      const failoverResetTime = 2
      const seekDurationPadding = 0

      const bspSettings = { failoverResetTime, failoverSort: () => {}, streaming: { seekDurationPadding } }
      const dashSettings = { streaming: { delay: { liveDelay } } }
      const customPlayerSettings = Utils.merge(bspSettings, dashSettings)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, customPlayerSettings)

      mseStrategy.load(null, 0)

      expect(mockDashInstance.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          streaming: expect.objectContaining({
            delay: { liveDelay },
          }),
        })
      )

      expect(mockDashInstance.updateSettings).not.toHaveBeenCalledWith(
        expect.objectContaining({
          failoverResetTime,
        })
      )

      expect(mockDashInstance.updateSettings).not.toHaveBeenCalledWith(
        expect.objectContaining({
          failoverSort: expect.any(Function),
        })
      )

      expect(mockDashInstance.updateSettings).not.toHaveBeenCalledWith(
        expect.objectContaining({
          streaming: expect.objectContaining({ seekDurationPadding }),
        })
      )
    })

    it("should initialise MediaPlayer without any source anchor when time is zero", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url)
    })

    it("should initialise MediaPlayer with a time anchor when a start time is given", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 15)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=15`)
    })

    it("should set up bindings to MediaPlayer events correctly", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mediaElement.addEventListener).toHaveBeenCalledWith("timeupdate", expect.any(Function))
      expect(mediaElement.addEventListener).toHaveBeenCalledWith("playing", expect.any(Function))
      expect(mediaElement.addEventListener).toHaveBeenCalledWith("pause", expect.any(Function))
      expect(mediaElement.addEventListener).toHaveBeenCalledWith("waiting", expect.any(Function))
      expect(mediaElement.addEventListener).toHaveBeenCalledWith("seeking", expect.any(Function))
      expect(mediaElement.addEventListener).toHaveBeenCalledWith("seeked", expect.any(Function))
      expect(mediaElement.addEventListener).toHaveBeenCalledWith("ended", expect.any(Function))
      expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.ERROR, expect.any(Function))
      expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.MANIFEST_LOADED, expect.any(Function))
      expect(mockDashInstance.on).toHaveBeenCalledWith(
        dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED,
        expect.any(Function)
      )
      expect(mockDashInstance.on).toHaveBeenCalledWith(
        dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED,
        expect.any(Function)
      )
      expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.METRIC_ADDED, expect.any(Function))
    })
  })

  describe("Load when a mediaPlayer exists (e.g. CDN failover)", () => {
    it("should attach a new source", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mockDashInstance.initialize).toHaveBeenCalledTimes(1)
      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url)

      // Player component would do this with its buffering timeout logic
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)

      mseStrategy.load(null, null)

      expect(mockDashInstance.initialize).toHaveBeenCalledTimes(1)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[1].url)
    })

    it("should attach a new source with previous start time if loaded before there is a valid media element time", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 45)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=45`)

      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)
      mseStrategy.load(null, null)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[1].url}#t=45`)

      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[2].url)
      mseStrategy.load(null, null)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[2].url}#t=45`)
    })

    it("should attach a new source with expected parameters at the current playback time", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 45)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=45`)

      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)

      mediaElement.currentTime = 86
      mediaElement.dispatchEvent(new Event("timeupdate"))

      mseStrategy.load(null, null)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[1].url}#t=86`)
    })
  })

  describe("Responding to dash.js events", () => {
    it("should call mediaSources failover on dash baseUrl changed event", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.BASE_URL_SELECTED, {
        baseUrl: {
          url: "http://example.com",
          serviceLocation: "http://example.com",
        },
      })

      expect(mockMediaSources.failover).toHaveBeenCalledWith({
        isBufferingTimeoutError: false,
        code: undefined,
        message: undefined,
        serviceLocation: "http://example.com",
      })
    })

    it("should call mediaSources failover on dash baseUrl changed event including last known error", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      const testError = {
        error: {
          code: 9999,
          message: "Mock error",
        },
      }

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, testError)

      dispatchDashEvent(dashjsMediaPlayerEvents.BASE_URL_SELECTED, {
        baseUrl: {
          url: "http://example.com",
          serviceLocation: "http://example.com",
        },
      })

      expect(mockMediaSources.failover).toHaveBeenCalledWith({
        isBufferingTimeoutError: false,
        code: 9999,
        message: "Mock error",
        serviceLocation: "http://example.com",
      })
    })
  })

  describe("Transitions", () => {
    it("always returns true for canBePaused()", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(mseStrategy.transitions.canBePaused()).toBe(true)
    })

    it("always returns true for canBeginSeek()", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(mseStrategy.transitions.canBeginSeek()).toBe(true)
    })
  })

  describe("getSeekableRange()", () => {
    it("returns zero to duration for a static stream", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.STATIC })

      mockDashInstance.duration.mockReturnValueOnce(300)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 300 })
    })

    it("accounts for live delay for a dynamic stream", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValueOnce({ range: { start: 180, end: 360 } })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { delay: { liveDelay: 20 } },
      })

      mseStrategy.load(null, 0)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 180, end: 340 })
    })

    it("returns the end time ignoring the live delay for an on demand stream", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.STATIC })

      mockDashInstance.duration.mockReturnValueOnce(105)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { delay: { liveDelay: 20 } },
      })

      mseStrategy.load(null, 0)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 105 })
    })

    it("falls back to using duration if DVR range is unavailable", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValueOnce(null)
      mockDashInstance.duration.mockReturnValueOnce(180)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { delay: { liveDelay: 20 } },
      })

      mseStrategy.load(null, 0)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 180 })
    })
  })

  describe("getCurrentTime()", () => {
    it("returns the correct time", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mseStrategy.getCurrentTime()).toBe(0)

      mediaElement.currentTime = 10

      expect(mseStrategy.getCurrentTime()).toBe(10)
    })

    it("returns 0 when MediaPlayer is undefined", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(mseStrategy.getCurrentTime()).toBe(0)
    })
  })

  describe("getDuration()", () => {
    it("returns the correct duration from the DASH Mediaplayer", () => {
      mockDashInstance.duration.mockReturnValueOnce(180)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mseStrategy.getDuration()).toBe(180)
    })

    it("returns 0 when the MediaPlayer is undefined", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(mseStrategy.getDuration()).toBe(0)
    })

    it("returns 0 when the MediaPlayer is not ready", () => {
      mockDashInstance.isReady.mockReturnValue(false)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mseStrategy.getDuration()).toBe(0)
    })
  })

  describe("getPlayerElement()", () => {
    it("returns the media player video element", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mseStrategy.getPlayerElement()).toBeInstanceOf(HTMLVideoElement)
      expect(mseStrategy.getPlayerElement()).toBe(mediaElement)
    })

    it("returns the media player audio element", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.AUDIO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mseStrategy.getPlayerElement()).toBeInstanceOf(HTMLAudioElement)
      expect(mseStrategy.getPlayerElement()).toBe(mediaElement)
    })
  })

  describe("reset()", () => {
    describe("when resetMSEPlayer is configured as true", () => {
      beforeEach(() => {
        window.bigscreenPlayer.overrides = {
          resetMSEPlayer: true,
        }
      })

      it("should destroy the player and listeners", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 0)

        expect(playbackElement.childElementCount).toBe(1)

        mseStrategy.reset()

        expect(mockDashInstance.destroy).toHaveBeenCalledWith()

        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("timeupdate", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("loadedmetadata", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("loadeddata", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("play", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("playing", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("pause", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("waiting", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("seeking", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("seeked", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("ended", expect.any(Function))
        expect(mediaElement.removeEventListener).toHaveBeenCalledWith("ratechange", expect.any(Function))

        expect(playbackElement.childElementCount).toBe(0)
      })

      it("should setup player and element on a load after a reset", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 0)

        mseStrategy.reset()

        mockMediaSources.currentSource.mockReturnValueOnce("http://example2.com")
        mseStrategy.load(null, 0)

        expect(mockDashInstance.initialize).toHaveBeenCalledTimes(2)
        expect(mockDashInstance.initialize).toHaveBeenNthCalledWith(2, mediaElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenNthCalledWith(2, "http://example2.com")

        expect(playbackElement.childElementCount).toBe(1)
        expect(playbackElement.firstChild).toBeInstanceOf(HTMLVideoElement)
        expect(playbackElement.firstChild).toBe(mediaElement)
        expect(isMockedElement(playbackElement.firstChild)).toBe(true)
      })
    })

    describe("when resetMSEPlayer is configured as false", () => {
      beforeEach(() => {
        window.bigscreenPlayer.overrides = {
          resetMSEPlayer: false,
        }
      })

      it("should not destroy the player or listeners", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

        mseStrategy.load(null, 0)
        mseStrategy.reset()

        expect(mockDashInstance.destroy).not.toHaveBeenCalledWith()
        expect(playbackElement.childElementCount).toBe(1)

        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("timeupdate", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("loadedmetadata", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("loadeddata", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("play", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("playing", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("pause", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("waiting", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("seeking", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("seeked", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("ended", expect.any(Function))
        expect(mediaElement.removeEventListener).not.toHaveBeenCalledWith("ratechange", expect.any(Function))
      })
    })
  })

  describe("tearDown()", () => {
    it("should destroy the MediaPlayer", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.tearDown()

      expect(mockDashInstance.destroy).toHaveBeenCalledWith()
    })

    it("should tear down bindings to MediaPlayer Events correctly", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.tearDown()

      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("timeupdate", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("loadedmetadata", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("loadeddata", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("play", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("playing", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("pause", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("waiting", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("seeking", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("seeked", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("ended", expect.any(Function))
      expect(mediaElement.removeEventListener).toHaveBeenCalledWith("ratechange", expect.any(Function))

      expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.ERROR, expect.any(Function))
      expect(mockDashInstance.off).toHaveBeenCalledWith(
        dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED,
        expect.any(Function)
      )
      expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.METRIC_ADDED, expect.any(Function))
      expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.MANIFEST_LOADED, expect.any(Function))
      expect(mockDashInstance.off).toHaveBeenCalledWith(
        dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED,
        expect.any(Function)
      )
    })

    it("should remove the video element", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      expect(playbackElement.childElementCount).toBe(1)

      mseStrategy.tearDown()

      expect(playbackElement.childElementCount).toBe(0)
    })
  })

  describe("isEnded()", () => {
    it("should be set to false on initialisation of the strategy", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      expect(mseStrategy.isEnded()).toBe(false)
    })

    it("should be set to true when we get an ended event", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mediaElement.dispatchEvent(new Event("ended"))

      expect(mseStrategy.isEnded()).toBe(true)
    })

    it.each(["playing", "waiting"])("should be set to false when we get a %s event", (eventType) => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mediaElement.dispatchEvent(new Event(eventType))

      expect(mseStrategy.isEnded()).toBe(false)
    })

    it("should be set to false when we get another event after an ended event", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mediaElement.dispatchEvent(new Event("ended"))

      expect(mseStrategy.isEnded()).toBe(true)

      mediaElement.dispatchEvent(new Event("seeking"))

      expect(mseStrategy.isEnded()).toBe(false)
    })
  })

  describe("isPaused()", () => {
    it("should correctly return the paused state from the MediaPlayer when not paused", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mockDashInstance.isPaused.mockReturnValue(false)

      expect(mseStrategy.isPaused()).toBe(false)
    })

    it("should correctly return the paused state from the MediaPlayer when paused", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mockDashInstance.isPaused.mockReturnValue(true)

      expect(mseStrategy.isPaused()).toBe(true)
    })
  })

  describe("pause()", () => {
    it("should call through to MediaPlayer's pause function", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.pause()

      expect(mockDashInstance.pause).toHaveBeenCalledWith()
    })
  })

  describe("play()", () => {
    it("should call through to MediaPlayer's play function", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.play()

      expect(mockDashInstance.play).toHaveBeenCalledWith()
    })
  })

  describe("setCurrentTime()", () => {
    it("should call through to MediaPlayer's seek function", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(12)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(12)
    })

    it("should clamp the seek to the start of the safely seekable range", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(-0.1)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(0)
    })

    it("should clamp the seek to the end of the safely seekable range", () => {
      mockDashInstance.duration.mockReturnValueOnce(600)

      const seekDurationPadding = 0

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { seekDurationPadding },
      })

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(1000)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(600)
    })

    it("clamps a seek to the end of the safely seekable range by seek duration padding", () => {
      mockDashInstance.duration.mockReturnValueOnce(360)

      const seekDurationPadding = 0.1

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { seekDurationPadding },
      })

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(360)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(359.9)
    })

    it("clamps a seek to end using the default seek duration padding when not passed in", () => {
      mockDashInstance.duration.mockReturnValueOnce(100)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(100)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(98.9)
    })

    it("seeks relative to the DVR range for dynamic streams", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValue({ range: { start: 180, end: 360 } })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(240)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(60)
    })

    it("refreshes the manifest when seeking forward in a dynamic stream", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValue({ range: { start: 180, end: 360 } })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mediaElement.currentTime = 200

      mseStrategy.setCurrentTime(240)

      expect(mockDashInstance.refreshManifest).toHaveBeenCalled()
    })

    it("does not refresh the manifest when seeking backward in a dynamic stream", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValue({ range: { start: 180, end: 360 } })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mediaElement.currentTime = 260

      mseStrategy.setCurrentTime(240)

      expect(mockDashInstance.refreshManifest).not.toHaveBeenCalled()
    })

    it("should clamp seek time to the manifest's duration when it is present in the refreshed manifest", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValue({ range: { start: 180, end: 360 } })

      mockDashInstance.refreshManifest.mockImplementationOnce((onRefresh) =>
        onRefresh({ mediaPresentationDuration: 230 })
      )

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(240)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(50)
    })
  })

  // describe("autoresume", () => {
  //   it("should start autoresume timeout when paused", () => {
  //     mseStrategy.pause()

  //     expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
  //   })

  //   it("should not start autoresume timeout when paused and disableAutoResume is set", () => {
  //     const opts = {
  //       disableAutoResume: true,
  //     }

  //     mseStrategy.pause(opts)

  //     expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
  //   })

  //   it("should start auto resume timeout when paused and seeking", () => {
  //     mockDashInstance.isPaused.mockReturnValue(true)

  //     mseStrategy.pause()
  //     mseStrategy.setCurrentTime()

  //     eventCallbacks("seeked")

  //     expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(2)
  //   })

  //   it("should not try to autoresume when playing and seeking", () => {
  //     mockDashInstance.isPaused.mockReturnValue(false)

  //     mseStrategy.setCurrentTime()
  //     eventCallbacks("seeked")

  //     expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
  //   })
  // })

  // describe("Playback Rate", () => {
  //   it("should call through to MediaPlayer's setPlaybackRate function", () => {
  //     setUpMSE()
  //     mseStrategy.load(null, 0)

  //     mseStrategy.setPlaybackRate(2)

  //     expect(mockDashInstance.setPlaybackRate).toHaveBeenCalledWith(2)
  //   })

  //   it("should call through to MediaPlayer's getPlaybackRate function and returns correct value", () => {
  //     setUpMSE()
  //     mseStrategy.load(null, 0)
  //     mockDashInstance.getPlaybackRate.mockReturnValue(1.5)

  //     const rate = mseStrategy.getPlaybackRate()

  //     expect(mockDashInstance.getPlaybackRate).toHaveBeenCalled()
  //     expect(rate).toBe(1.5)
  //   })
  // })

  // describe("mseDurationOverride", () => {
  //   beforeEach(() => {
  //     // due to interaction with emitPlayerInfo()
  //     mockDashInstance.getBitrateInfoListFor.mockReturnValue([
  //       { bitrate: 1024000 },
  //       { bitrate: 200000 },
  //       { bitrate: 3000000 },
  //     ])
  //   })

  //   afterEach(() => {
  //     mockDashInstance.setMediaDuration.mockReset()
  //   })

  //   describe("overrides dynamic stream duration", () => {
  //     it("when mseDurationOverride configration property is true and window type is sliding", () => {
  //       window.bigscreenPlayer.overrides = {
  //         mseDurationOverride: true,
  //       }

  //       setUpMSE(0, WindowTypes.SLIDING)
  //       mseStrategy.load(null, 0)

  //       eventHandlers.streamInitialized()

  //       expect(mockDashInstance.setMediaDuration).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
  //     })

  //     it("when mseDurationOverride configration property is true and window type is growing", () => {
  //       window.bigscreenPlayer.overrides = {
  //         mseDurationOverride: true,
  //       }

  //       setUpMSE(0, WindowTypes.GROWING)
  //       mseStrategy.load(null, 0)

  //       eventHandlers.streamInitialized()

  //       expect(mockDashInstance.setMediaDuration).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
  //     })
  //   })

  //   describe("does not override stream duration", () => {
  //     it("when mseDurationOverride configration property is true and window type is static", () => {
  //       window.bigscreenPlayer.overrides = {
  //         mseDurationOverride: true,
  //       }

  //       setUpMSE(0, WindowTypes.STATIC)
  //       mseStrategy.load(null, 0)

  //       eventHandlers.streamInitialized()

  //       expect(mockDashInstance.setMediaDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
  //     })

  //     it("when mseDurationOverride configration property is false and window type is static", () => {
  //       window.bigscreenPlayer.overrides = {
  //         mseDurationOverride: false,
  //       }

  //       setUpMSE(0, WindowTypes.STATIC)
  //       mseStrategy.load(null, 0)

  //       eventHandlers.streamInitialized()

  //       expect(mockDashInstance.setMediaDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
  //     })

  //     it("when mseDurationOverride configration property is false and window type is sliding", () => {
  //       window.bigscreenPlayer.overrides = {
  //         mseDurationOverride: false,
  //       }

  //       setUpMSE(0, WindowTypes.SLIDING)
  //       mseStrategy.load(null, 0)

  //       eventHandlers.streamInitialized()

  //       expect(mockDashInstance.setMediaDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
  //     })

  //     it("when mseDurationOverride configration property is false and window type is growing", () => {
  //       window.bigscreenPlayer.overrides = {
  //         mseDurationOverride: false,
  //       }

  //       setUpMSE(0, WindowTypes.GROWING)
  //       mseStrategy.load(null, 0)

  //       eventHandlers.streamInitialized()

  //       expect(mockDashInstance.setMediaDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
  //     })
  //   })
  // })

  // describe("onManifestLoaded", () => {
  //   it("calls onManifestLoaded plugin with the manifest when dashjs loads it", () => {
  //     const onManifestLoadedSpy = jest.spyOn(Plugins.interface, "onManifestLoaded")
  //     setUpMSE(0, WindowTypes.SLIDING)
  //     mseStrategy.load(null, 0)
  //     dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject)

  //     expect(onManifestLoadedSpy).toHaveBeenCalledWith(expect.any(Object))
  //   })
  // })

  // describe("onManifestValidityChanged", () => {
  //   beforeEach(() => {
  //     mockDashInstance.refreshManifest.mockReset()
  //   })

  //   it("calls refreshManifest on mediaPlayer with a growing window", () => {
  //     setUpMSE(0, WindowTypes.GROWING)
  //     mseStrategy.load(null, 0)
  //     dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, testManifestObject)

  //     expect(mockDashInstance.refreshManifest).toHaveBeenCalledTimes(1)
  //   })

  //   it("does not call refreshManifest on mediaPlayer with a sliding window", () => {
  //     setUpMSE(0, WindowTypes.SLIDING)

  //     mseStrategy.load(null, 0)
  //     dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, testManifestObject)

  //     expect(mockDashInstance.refreshManifest).not.toHaveBeenCalled()
  //   })

  //   it("does not call refreshManifest on mediaPlayer with a static window", () => {
  //     setUpMSE(0, WindowTypes.STATIC)

  //     mseStrategy.load(null, 0)
  //     dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, testManifestObject)

  //     expect(mockDashInstance.refreshManifest).not.toHaveBeenCalled()
  //   })
  // })

  // describe("onMetricAdded and onQualityChangeRendered", () => {
  //   const mockEvent = {
  //     mediaType: "video",
  //     oldQuality: 0,
  //     newQuality: 1,
  //     type: "qualityChangeRendered",
  //   }

  //   const mockOnPlayerInfoUpdated = jest.fn()

  //   beforeEach(() => {
  //     jest.spyOn(Plugins.interface, "onPlayerInfoUpdated").mockReturnValue(mockOnPlayerInfoUpdated)
  //     jest.spyOn(Plugins.interface, "onErrorHandled")
  //     mockOnPlayerInfoUpdated.mockReset()
  //   })

  //   it("should call plugins with the combined playback bitrate", () => {
  //     setUpMSE()
  //     mockDashInstance.getBitrateInfoListFor.mockReturnValue([
  //       { bitrate: 1024000 },
  //       { bitrate: 200000 },
  //       { bitrate: 3000000 },
  //     ])
  //     mseStrategy.load(null, 0)

  //     dashEventCallback(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, mockEvent)

  //     expect(Plugins.interface.onPlayerInfoUpdated).toHaveBeenCalledWith({
  //       playbackBitrate: 2048,
  //       bufferLength: undefined,
  //     })
  //   })

  //   it("should call plugins with video playback buffer length", () => {
  //     const mockBufferEvent = {
  //       mediaType: "video",
  //       metric: "BufferLevel",
  //     }

  //     setUpMSE()
  //     mseStrategy.load(null, 0)

  //     dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent)

  //     expect(Plugins.interface.onPlayerInfoUpdated).toHaveBeenCalledWith({
  //       playbackBitrate: undefined,
  //       bufferLength: "buffer",
  //     })
  //   })

  //   it("should not call plugins with audio playback buffer length when mediaKind is video", () => {
  //     const mockBufferEvent = {
  //       mediaType: "audio",
  //       metric: "BufferLevel",
  //     }

  //     setUpMSE()
  //     mseStrategy.load(null, 0)

  //     dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent)

  //     expect(Plugins.interface.onPlayerInfoUpdated).not.toHaveBeenCalledWith()
  //   })
  // })

  // describe("Error handling", () => {

  // it("should publish an unhandled dash.js error", () => {
  //   const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

  //   const mockErrorCallback = jest.fn()
  //   mseStrategy.addErrorCallback(null, mockErrorCallback)

  //   mseStrategy.load(null, 0)

  //   const testError = {
  //     error: {
  //       code: 9999,
  //     },
  //   }

  //   dashEventCallback(dashjsMediaPlayerEvents.ERROR, testError)

  //   expect(mockErrorCallback).toHaveBeenCalledWith({ code: 9999 })
  // })

  // it("should failover on a dash.js manifest download error", async () => {
  //   const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

  //   const mockErrorCallback = jest.fn()
  //   mseStrategy.addErrorCallback(null, mockErrorCallback)

  //   mseStrategy.load(null, 0)

  //   const testError = {
  //     error: {
  //       code: 25,
  //       message: "Mock manifest load fail",
  //     },
  //   }

  //   mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)

  //   dashEventCallback(dashjsMediaPlayerEvents.ERROR, testError)

  //   await new Promise(process.nextTick)

  //   expect(mockErrorCallback).not.toHaveBeenCalled()
  //   expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[1].url)
  //   expect(mockDashInstance.attachSource).toHaveBeenCalledTimes(2)
  // })

  // it("should propagate error when cdn failover fails on a dash.js manifest download error", async () => {
  //   const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

  //   const mockErrorCallback = jest.fn()
  //   mseStrategy.addErrorCallback(null, mockErrorCallback)

  //   mseStrategy.load(null, 0)

  //   const testError = {
  //     error: {
  //       code: 25,
  //       message: "Mock manifest load fail",
  //     },
  //   }

  //   mockMediaSources.failover.mockRejectedValueOnce(new Error("mock failover reject"))

  //   dashEventCallback(dashjsMediaPlayerEvents.ERROR, testError)

  //   await new Promise(process.nextTick)

  //   expect(mockErrorCallback).toHaveBeenCalledWith({ code: 25, message: "Mock manifest load fail" })
  //   expect(mockDashInstance.attachSource).toHaveBeenCalledTimes(1)
  // })

  //   it("should not fire error handled event on initial load", () => {
  //     const mockEvent = {
  //       mediaType: "video",
  //       type: "baseUrlSelected",
  //       baseUrl: {
  //         serviceLocation: "cdn1",
  //       },
  //     }

  //     setUpMSE()
  //     mseStrategy.load(null, 0)

  //     dashEventCallback(dashjsMediaPlayerEvents.BASE_URL_SELECTED, mockEvent)

  //     expect(Plugins.interface.onErrorHandled).not.toHaveBeenCalledWith()
  //   })

  //   it("should not publish error event on init segment download error if more than one CDN available", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "initial segment download error",
  //         code: 28,
  //       },
  //     }

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockErrorCallback).not.toHaveBeenCalled()
  //   })

  //   it("should publish error event on init segment download error if only one CDN available", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "initial segment download error",
  //         code: 28,
  //       },
  //     }

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)

  //     const noop = () => {}
  //     mediaSources.failover(noop, noop, { isBufferingTimeoutError: true })
  //     mediaSources.failover(noop, noop, { isBufferingTimeoutError: true })

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockErrorCallback).toHaveBeenCalled()
  //   })

  //   it("should not publish error event on content download error if more than one CDN available", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "content download error",
  //         code: 27,
  //       },
  //     }

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockErrorCallback).not.toHaveBeenCalled()
  //   })

  //   it("should publish error event on content download error if only one CDN available", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "content download error",
  //         code: 27,
  //       },
  //     }

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)

  //     const noop = () => {}
  //     mediaSources.failover(noop, noop, { isBufferingTimeoutError: true })
  //     mediaSources.failover(noop, noop, { isBufferingTimeoutError: true })

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockErrorCallback).toHaveBeenCalled()
  //   })

  //   it("should initiate a failover with correct parameters on manifest download error", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "manifest download error",
  //         code: 25,
  //       },
  //     }

  //     setUpMSE()

  //     mseStrategy.load(null, 0)
  //     mediaElement.currentTime = 10

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     const failoverParams = {
  //       isBufferingTimeoutError: false,
  //       currentTime: mseStrategy.getCurrentTime(),
  //       duration: mseStrategy.getDuration(),
  //       code: mockEvent.error.code,
  //       message: mockEvent.error.message,
  //     }

  //     expect(mediaSources.failover).toHaveBeenCalledWith(mseStrategy.load, expect.any(Function), failoverParams)
  //   })

  //   it("should not publish error event on manifest download error when it is possible to failover", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "manifest download error",
  //         code: 25,
  //       },
  //     }

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockErrorCallback).not.toHaveBeenCalled()
  //   })

  //   it("should publish an error event on manifest download error when there are no more sources to CDN failover to", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "manifest download error",
  //         code: 25,
  //       },
  //     }

  //     const noop = () => {}
  //     mediaSources.failover(noop, noop, { isBufferingTimeoutError: false })
  //     mediaSources.failover(noop, noop, { isBufferingTimeoutError: false })

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)
  //     mediaElement.currentTime = 10

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockErrorCallback).toHaveBeenCalledWith({ code: 25, message: "manifest download error" })
  //   })

  //   it("should publish an error event for any other error propagated from dash.js", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "MEDIA_ERR_ABORTED (message from element)",
  //         code: 1,
  //       },
  //     }

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)
  //     mediaElement.currentTime = 10

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockErrorCallback).toHaveBeenCalledWith({ code: 1, message: "MEDIA_ERR_ABORTED (message from element)" })
  //   })

  //   it("should reset the media player immediately if an unsupported codec error is thrown", () => {
  //     const mockEvent = {
  //       error: {
  //         message: "videoCodec is not supported",
  //         code: 30,
  //       },
  //     }

  //     setUpMSE()

  //     const mockErrorCallback = jest.fn()
  //     mseStrategy.addErrorCallback(null, mockErrorCallback)

  //     mseStrategy.load(null, 0)
  //     mediaElement.currentTime = 10

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

  //     expect(mockDashInstance.reset).toHaveBeenCalled()
  //     expect(mockErrorCallback).toHaveBeenCalledWith({ code: 30, message: "videoCodec is not supported" })
  //   })

  //   it("should initiate a failover with the previous error code and message on baseurlselected", () => {
  //     const mockErrorEvent = {
  //       error: {
  //         message: "content download error",
  //         code: 27,
  //       },
  //     }

  //     setUpMSE()

  //     mseStrategy.load(null, 0)
  //     mediaElement.currentTime = 10

  //     dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockErrorEvent)
  //     expect(mediaSources.failover).not.toHaveBeenCalled()

  //     const mockBaseUrlEvent = {
  //       mediaType: "video",
  //       type: "baseUrlSelected",
  //       baseUrl: {
  //         serviceLocation: "cdn1",
  //       },
  //     }

  //     dashEventCallback(dashjsMediaPlayerEvents.BASE_URL_SELECTED, mockBaseUrlEvent)

  //     const failoverParams = {
  //       isBufferingTimeoutError: false,
  //       serviceLocation: "cdn1",
  //       code: mockErrorEvent.error.code,
  //       message: mockErrorEvent.error.message,
  //     }

  //     expect(mediaSources.failover).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), failoverParams)
  //   })
  // })

  // describe("seeking and waiting events", () => {
  //   let eventCallbackSpy

  //   beforeEach(() => {
  //     setUpMSE()
  //     eventCallbackSpy = jest.fn()
  //     mseStrategy.addEventCallback(this, eventCallbackSpy)
  //     mseStrategy.load(null, 0)
  //     mseStrategy.play()
  //   })

  //   it("should call the event callback once when seeking", () => {
  //     mseStrategy.pause()

  //     mseStrategy.setCurrentTime(60)

  //     eventCallbacks("seeking")
  //     eventCallbacks("waiting")

  //     expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
  //   })

  //   it("should call the event callback more than once when not seeking", () => {
  //     eventCallbacks("waiting")
  //     eventCallbacks("waiting")

  //     expect(eventCallbackSpy).toHaveBeenCalledTimes(2)
  //   })
  // })

  // describe("plugins", () => {
  //   it("fires onFragmentContentLengthMismatch when dash.js fires FRAGMENT_CONTENT_LENGTH_MISMATCH", () => {
  //     const mockFragmentContentLengthMismatchEvent = {
  //       responseUrl: "example.com",
  //       mediaType: "video/mp4",
  //       headerLength: 12,
  //       bodyLength: 13,
  //     }

  //     jest.spyOn(Plugins.interface, "onFragmentContentLengthMismatch")

  //     setUpMSE()
  //     mseStrategy.load(null, 0)

  //     dashEventCallback(
  //       dashjsMediaPlayerEvents.FRAGMENT_CONTENT_LENGTH_MISMATCH,
  //       mockFragmentContentLengthMismatchEvent
  //     )

  //     expect(Plugins.interface.onFragmentContentLengthMismatch).toHaveBeenCalledWith(
  //       mockFragmentContentLengthMismatchEvent
  //     )
  //   })
  // })

  // describe("gap jumps", () => {
  //   it("logs a seek triggered by a gap to the debugger", () => {
  //     setUpMSE()
  //     mseStrategy.load(null, 0)
  //     dashEventCallback("gapCausedInternalSeek", { duration: 0.3, seekTime: 33.3 })

  //     expect(DebugTool.gap).toHaveBeenCalledTimes(1)
  //     expect(DebugTool.gap).toHaveBeenCalledWith(33, 33.3)
  //   })

  //   it("logs a seek to end triggered by a gap to the debugger", () => {
  //     setUpMSE()
  //     mseStrategy.load(null, 0)

  //     dashEventCallback("gapCausedSeekToPeriodEnd", { duration: 0.3, seekTime: 33.3 })

  //     expect(DebugTool.gap).toHaveBeenCalledTimes(1)
  //     expect(DebugTool.gap).toHaveBeenCalledWith(33, 33.3)
  //   })
  // })
})
