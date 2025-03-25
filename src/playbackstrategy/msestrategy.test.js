import { MediaPlayer } from "dashjs/index_mediaplayerOnly"
import ManifestModifier from "../manifest/manifestmodifier"
import MediaKinds from "../models/mediakinds"
import { ManifestType } from "../models/manifesttypes"
import { MediaState } from "../models/mediastate"
import Utils from "../utils/playbackutils"
import { autoResumeAtStartOfRange } from "../dynamicwindowutils"
import Plugins from "../plugins"
import MSEStrategy from "./msestrategy"

jest.mock("dashjs/index_mediaplayerOnly", () => ({ MediaPlayer: jest.fn() }))
jest.mock("../dynamicwindowutils")
jest.mock("../debugger/debugtool")
jest.mock("../manifest/manifestmodifier")

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
  getTargetLiveDelay: jest.fn(),
  getCurrentLiveLatency: jest.fn(),
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
  getTracksFor: jest.fn(),
  getCurrentTrackFor: jest.fn(),
  setCurrentTrack: jest.fn(),
  setInitialMediaSettingsFor: jest.fn(),
  setAutoPlay: jest.fn(),
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
    STREAM_INITIALIZED: "streamInitialized",
    CURRENT_TRACK_CHANGED: "currentTrackChanged",
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
    jest.useFakeTimers()
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
    jest.clearAllTimers()

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

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url)
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

    it("should initialise MediaPlayer with a source anchor when time is zero", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=0`)
    })

    it("should initialise MediaPlayer with a time anchor when a start time is given", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 15)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null)
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

    it("should keep the cached current time at 0 when the load presentationTimeInSeconds is not a number", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null)

      mediaElement.currentTime = 0
      expect(mseStrategy.getCurrentTime()).toBe(0)
    })
  })

  describe("Load when a mediaPlayer exists (e.g. CDN failover)", () => {
    it("should attach a new source", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      expect(mockDashInstance.initialize).toHaveBeenCalledTimes(1)
      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=0`)

      // Player component would do this with its buffering timeout logic
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)

      mseStrategy.load(null, null)

      expect(mockDashInstance.initialize).toHaveBeenCalledTimes(1)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[1].url}#t=0`)
    })

    it("should attach a new source with previous start time if loaded before there is a valid media element time", () => {
      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[0].url)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 45)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null)
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

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mediaElement, null)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=45`)

      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)

      mediaElement.currentTime = 86
      mediaElement.dispatchEvent(new Event("timeupdate"))

      mseStrategy.load(null, null)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[1].url}#t=86`)
    })
  })

  describe("responding to dash.js events", () => {
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

    it("should call ManifestModifier on dash.js manifest loaded event", () => {
      mockMediaSources.availableSources.mockReturnValueOnce([cdnArray[0].url, cdnArray[1].url, cdnArray[2].url])

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      const testManifestLoadedEvent = {
        type: "manifestLoaded",
        data: {
          Period: {
            BaseURL: "dash/",
          },
        },
      }

      dispatchDashEvent(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestLoadedEvent)

      expect(ManifestModifier.filter).toHaveBeenCalledWith(
        {
          Period: {
            BaseURL: "dash/",
          },
        },
        {}
      )

      expect(ManifestModifier.generateBaseUrls).toHaveBeenCalledWith(
        {
          Period: {
            BaseURL: "dash/",
          },
        },
        [cdnArray[0].url, cdnArray[1].url, cdnArray[2].url]
      )
    })

    it("should call onManifestLoaded plugin with the manifest object dash.js manifest loaded event", () => {
      const onManifestLoadedSpy = jest.spyOn(Plugins.interface, "onManifestLoaded")

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      const testManifestLoadedEvent = {
        type: "manifestLoaded",
        data: {
          Period: {
            BaseURL: "dash/",
          },
        },
      }

      dispatchDashEvent(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestLoadedEvent)

      expect(onManifestLoadedSpy).toHaveBeenCalledWith({
        Period: {
          BaseURL: "dash/",
        },
        manifestLoadCount: 0,
        manifestRequestTime: undefined,
      })
    })

    it("refreshes the manifest on a validity change for dynamic streams", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, {
        type: "manifestValidityChanged",
        data: {
          Period: {
            BaseURL: "dash/",
          },
        },
      })

      expect(mockDashInstance.refreshManifest).toHaveBeenCalledTimes(1)
    })

    it("does not refresh the manifest on a validity change for a static stream", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.STATIC })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, {
        type: "manifestValidityChanged",
        data: {
          Period: {
            BaseURL: "dash/",
          },
        },
      })

      expect(mockDashInstance.refreshManifest).not.toHaveBeenCalled()
    })

    it("should call plugins with the combined playback bitrate on quality change rendered dash.js event", () => {
      jest.spyOn(Plugins.interface, "onPlayerInfoUpdated")

      mockDashInstance.getBitrateInfoListFor.mockReturnValue([
        { bitrate: 1024000 },
        { bitrate: 200000 },
        { bitrate: 3000000 },
      ])

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, {
        mediaType: "video",
        oldQuality: 0,
        newQuality: 1,
        type: "qualityChangeRendered",
      })

      expect(Plugins.interface.onPlayerInfoUpdated).toHaveBeenCalledWith({
        playbackBitrate: 2048,
        bufferLength: undefined,
      })
    })

    it("should call plugins with video playback buffer length on metric added dash.js event", () => {
      jest.spyOn(Plugins.interface, "onPlayerInfoUpdated")
      mockDashMetrics.getCurrentBufferLevel.mockReturnValueOnce(15)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.METRIC_ADDED, {
        mediaType: "video",
        metric: "BufferLevel",
      })

      expect(Plugins.interface.onPlayerInfoUpdated).toHaveBeenCalledWith({
        playbackBitrate: undefined,
        bufferLength: 15,
      })
    })

    it("should not call plugins with audio playback buffer length when mediaKind is video on metric added dash.js event", () => {
      jest.spyOn(Plugins.interface, "onPlayerInfoUpdated")

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.METRIC_ADDED, {
        mediaType: "audio",
        metric: "BufferLevel",
      })

      expect(Plugins.interface.onPlayerInfoUpdated).not.toHaveBeenCalled()
    })

    it("should call onFragmentContentLengthMismatch plugin on FRAGMENT_CONTENT_LENGTH_MISMATCH", () => {
      jest.spyOn(Plugins.interface, "onFragmentContentLengthMismatch")

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.FRAGMENT_CONTENT_LENGTH_MISMATCH, {
        responseUrl: "example.com",
        mediaType: "video/mp4",
        headerLength: 12,
        bodyLength: 13,
      })

      expect(Plugins.interface.onFragmentContentLengthMismatch).toHaveBeenCalledWith({
        responseUrl: "example.com",
        mediaType: "video/mp4",
        headerLength: 12,
        bodyLength: 13,
      })
    })
  })

  describe("responding to media element events", () => {
    it.each([
      [MediaState.PLAYING, "playing"],
      [MediaState.PAUSED, "pause"],
      [MediaState.WAITING, "waiting"],
      [MediaState.WAITING, "seeking"],
      [MediaState.ENDED, "ended"],
    ])("should report media state %i for a %s event", (expectedMediaState, eventType) => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const onEvent = jest.fn()

      mseStrategy.addEventCallback(null, onEvent)

      mseStrategy.load(null, 0)

      mediaElement.dispatchEvent(new Event(eventType))

      expect(onEvent).toHaveBeenCalledWith(expectedMediaState)

      expect(onEvent).toHaveBeenCalledTimes(1)
    })

    it(`should report media state ${MediaState.PLAYING} for a seeked event while unpaused`, () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const onEvent = jest.fn()

      mseStrategy.addEventCallback(null, onEvent)

      mseStrategy.load(null, 0)

      mockDashInstance.isPaused.mockReturnValueOnce(false)

      mediaElement.dispatchEvent(new Event("seeked"))

      expect(onEvent).toHaveBeenCalledWith(MediaState.PLAYING)
      expect(onEvent).toHaveBeenCalledTimes(1)
    })

    it(`should report media state ${MediaState.PAUSED} for a seeked event while paused`, () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const onEvent = jest.fn()

      mseStrategy.addEventCallback(null, onEvent)

      mseStrategy.load(null, 0)

      mockDashInstance.isPaused.mockReturnValueOnce(true)

      mediaElement.dispatchEvent(new Event("seeked"))

      expect(onEvent).toHaveBeenCalledWith(MediaState.PAUSED)
      expect(onEvent).toHaveBeenCalledTimes(1)
    })

    it("should only trigger any event listeners once for any seeking/waiting events during a seek", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const onEvent = jest.fn()

      mseStrategy.addEventCallback(null, onEvent)

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(60)

      mediaElement.dispatchEvent(new Event("seeking"))
      mediaElement.dispatchEvent(new Event("waiting"))
      mediaElement.dispatchEvent(new Event("waiting"))

      expect(onEvent).toHaveBeenCalledTimes(1)
    })

    it("should trigger any event listeners for seeking/waiting events outside a seek", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const onEvent = jest.fn()

      mseStrategy.addEventCallback(null, onEvent)

      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(60)

      mediaElement.dispatchEvent(new Event("seeking"))
      mediaElement.dispatchEvent(new Event("waiting"))
      mediaElement.dispatchEvent(new Event("seeked"))

      expect(onEvent).toHaveBeenCalledTimes(2)

      mediaElement.dispatchEvent(new Event("waiting"))

      expect(onEvent).toHaveBeenCalledTimes(3)
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

  describe("Sets up mediaPlayer respecting audioDescribed.enable", () => {
    it("sets initial audio track settings when audioDescribed.enable is true", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, undefined, undefined, {
        enable: true,
      })
      mseStrategy.load(null, 10)

      expect(mockDashInstance.setInitialMediaSettingsFor).toHaveBeenCalledWith("audio", {
        accessibility: { schemeIdUri: "urn:tva:metadata:cs:AudioPurposeCS:2007", value: "1" },
        role: "alternate",
      })
    })

    it("does not set initial audio track settings when audioDescribed.enable is false", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, undefined, undefined, {
        enable: false,
      })
      mseStrategy.load(null, 10)

      expect(mockDashInstance.setInitialMediaSettingsFor).not.toHaveBeenCalled()
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

    it("falls back to using the default cached seekableRange if DVR range is unavailable", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValueOnce({ range: { start: 180, end: 360 } })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { delay: { liveDelay: 20 } },
      })

      mseStrategy.load(null, 0)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 180, end: 340 })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValueOnce(null)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 180, end: 340 })
    })

    it("falls back to using duration if DVR range is unavailable and seekableRange cache is undefined", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValueOnce(null)
      mockDashInstance.duration.mockReturnValueOnce(180)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { delay: { liveDelay: 20 } },
      })

      mseStrategy.load(null, 0)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 180 })
    })

    it("falls back to using the default cached duration if DVR range is unavailable, there's no cache seekableRange and there's no duration", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.DYNAMIC })

      mockDashMetrics.getCurrentDVRInfo.mockReturnValueOnce(null)
      mockDashInstance.duration.mockReturnValueOnce(NaN)

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { delay: { liveDelay: 20 } },
      })

      mseStrategy.load(null, 0)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 })
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
        mseStrategy.load(null, null)

        expect(mockDashInstance.initialize).toHaveBeenCalledTimes(2)
        expect(mockDashInstance.initialize).toHaveBeenNthCalledWith(2, mediaElement, null)
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

  describe("autoresume", () => {
    it("should not start autoresume timeout when paused on a static stream", () => {
      mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.STATIC })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      mseStrategy.pause()

      expect(autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })

    it("should not start autoresume timeout when paused on a dynamic stream without timeshift", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      mseStrategy.pause()

      expect(autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })

    it("should start autoresume timeout when paused on a dynamic stream with timeshift", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const seekDurationPadding = 0

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, false, {
        streaming: { seekDurationPadding },
      })

      mseStrategy.load(null, 0)

      mseStrategy.pause()

      expect(autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
      expect(autoResumeAtStartOfRange).toHaveBeenCalledWith(
        0,
        { start: 0, end: 100 },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        mockDashInstance.play,
        72000
      )
    })

    it("should start auto resume timeout when paused and seeking", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      mseStrategy.pause()
      mediaElement.dispatchEvent(new Event("pause"))
      mockDashInstance.isPaused.mockReturnValue(true)

      mseStrategy.setCurrentTime(300)
      mediaElement.dispatchEvent(new Event("seeking"))
      mediaElement.dispatchEvent(new Event("seeked"))

      expect(autoResumeAtStartOfRange).toHaveBeenCalledTimes(2)
    })

    it("should not start autoresume timeout when playing and seeking", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      mseStrategy.load(null, 0)

      mockDashInstance.isPaused.mockReturnValue(false)

      mseStrategy.setCurrentTime(300)
      mediaElement.dispatchEvent(new Event("seeking"))
      mediaElement.dispatchEvent(new Event("seeked"))

      expect(autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })
  })

  describe("Audio Described", () => {
    const audioDescribedTrack = {
      roles: ["alternate"],
      accessibilitiesWithSchemeIdUri: [{ schemeIdUri: "urn:tva:metadata:cs:AudioPurposeCS:2007", value: "1" }],
    }

    const mainTrack = { roles: ["main"] }

    describe("isAudioDescribedAvailable()", () => {
      it("returns true when there is an Audio Described track", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 10)

        mockDashInstance.getTracksFor.mockReturnValueOnce([mainTrack, audioDescribedTrack])

        expect(mseStrategy.isAudioDescribedAvailable()).toBe(true)
      })

      it("returns false when there is no Audio Described track", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 10)

        mockDashInstance.getTracksFor.mockReturnValueOnce([mainTrack])

        expect(mseStrategy.isAudioDescribedAvailable()).toBe(false)
      })
    })

    describe("isAudioDescribedEnabled()", () => {
      it("returns true when the current audio track is Audio Described", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 10)

        mockDashInstance.getCurrentTrackFor.mockReturnValueOnce(audioDescribedTrack)

        expect(mseStrategy.isAudioDescribedEnabled()).toBe(true)
      })

      it("returns false when the current track is not Audio Described", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 10)

        mockDashInstance.getCurrentTrackFor.mockReturnValueOnce(mainTrack)

        expect(mseStrategy.isAudioDescribedEnabled()).toBe(false)
      })
    })

    describe("setAudioDescribedOff()", () => {
      it("switches to the main track", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 10)

        mockDashInstance.getTracksFor.mockReturnValueOnce([mainTrack, audioDescribedTrack])

        mseStrategy.setAudioDescribedOff()

        expect(mockDashInstance.setCurrentTrack).toHaveBeenCalledWith(mainTrack)
      })
    })

    describe("setAudioDescribedOn()", () => {
      it("switches to the Audio Described track if present", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 10)

        mockDashInstance.getTracksFor.mockReturnValueOnce([mainTrack, audioDescribedTrack])

        mseStrategy.setAudioDescribedOn()

        expect(mockDashInstance.setCurrentTrack).toHaveBeenCalledWith(audioDescribedTrack)
      })

      it("does not switch to the Audio Described track if not present", () => {
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
        mseStrategy.load(null, 10)

        mockDashInstance.getTracksFor.mockReturnValueOnce([mainTrack])

        mseStrategy.setAudioDescribedOn()

        expect(mockDashInstance.setCurrentTrack).not.toHaveBeenCalled()
      })
    })

    describe("onCurrentTrackChanged", () => {
      it("should ensure callbacks are called with enabled true when the current track is Audio Described", () => {
        mockDashInstance.getCurrentTrackFor.mockReturnValue(audioDescribedTrack)
        mockDashInstance.getTracksFor.mockReturnValue([mainTrack, audioDescribedTrack])
        const callAudioDescribedCallbacksMock = jest.fn()
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, undefined, undefined, {
          callback: callAudioDescribedCallbacksMock,
        })
        mseStrategy.load(null, 10)

        dispatchDashEvent(dashjsMediaPlayerEvents.CURRENT_TRACK_CHANGED, { newMediaInfo: { type: "audio" } })

        expect(callAudioDescribedCallbacksMock).toHaveBeenCalledWith(true)
      })

      it("should ensure callbacks are called with enabled false when the current track is not Audio Described", () => {
        mockDashInstance.getCurrentTrackFor.mockReturnValue(mainTrack)
        mockDashInstance.getTracksFor.mockReturnValue([mainTrack, audioDescribedTrack])
        const callAudioDescribedCallbacksMock = jest.fn()
        const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement, undefined, undefined, {
          callback: callAudioDescribedCallbacksMock,
        })
        mseStrategy.load(null, 10)

        dispatchDashEvent(dashjsMediaPlayerEvents.CURRENT_TRACK_CHANGED, { newMediaInfo: { type: "audio" } })

        expect(callAudioDescribedCallbacksMock).toHaveBeenCalledWith(false)
      })
    })
  })

  describe("Playback Rate", () => {
    it("should call through to MediaPlayer's setPlaybackRate function", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mseStrategy.setPlaybackRate(2)

      expect(mockDashInstance.setPlaybackRate).toHaveBeenCalledWith(2)
    })

    it("should call through to MediaPlayer's getPlaybackRate function and returns correct value", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      mockDashInstance.getPlaybackRate.mockReturnValue(1.5)

      const rate = mseStrategy.getPlaybackRate()

      expect(mockDashInstance.getPlaybackRate).toHaveBeenCalled()
      expect(rate).toBe(1.5)
    })
  })

  describe("mseDurationOverride", () => {
    beforeEach(() => {
      // due to interaction with emitPlayerInfo()
      mockDashInstance.getBitrateInfoListFor.mockReturnValue([
        { bitrate: 1024000 },
        { bitrate: 200000 },
        { bitrate: 3000000 },
      ])
    })

    it("does not override duration for a static stream when mseDurationOverride is false", () => {
      window.bigscreenPlayer.overrides = {
        mseDurationOverride: false,
      }

      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.STATIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.STREAM_INITIALIZED)

      expect(mockDashInstance.setMediaDuration).not.toHaveBeenCalled()
    })

    it("does not override duration for a static stream when mseDurationOverride is true", () => {
      window.bigscreenPlayer.overrides = {
        mseDurationOverride: true,
      }

      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.STATIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.STREAM_INITIALIZED)

      expect(mockDashInstance.setMediaDuration).not.toHaveBeenCalled()
    })

    it("does not override duration for a dynamic stream when mseDurationOverride is false", () => {
      window.bigscreenPlayer.overrides = {
        mseDurationOverride: false,
      }

      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.STREAM_INITIALIZED)

      expect(mockDashInstance.setMediaDuration).not.toHaveBeenCalled()
    })

    it("does override duration for a dynamic stream when mseDurationOverride is true", () => {
      window.bigscreenPlayer.overrides = {
        mseDurationOverride: true,
      }

      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.STREAM_INITIALIZED)

      expect(mockDashInstance.setMediaDuration).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
    })
  })

  describe("handling errors", () => {
    it("should trigger any error listeners on a unhandled dash.js error", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()

      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          code: 9999,
        },
      })

      expect(mockErrorCallback).toHaveBeenCalledWith({ code: 9999 })
    })

    it("should failover with correct parameters on a dash.js manifest download error", async () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          code: 25,
          message: "Mock manifest load fail",
        },
      })

      await jest.runOnlyPendingTimersAsync()

      expect(mockErrorCallback).not.toHaveBeenCalled()

      expect(mockMediaSources.failover).toHaveBeenCalledWith({
        isBufferingTimeoutError: false,
        currentTime: 0,
        duration: 100,
        code: 25,
        message: "Mock manifest load fail",
      })
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[1].url}#t=0`)
      expect(mockDashInstance.attachSource).toHaveBeenCalledTimes(2)
    })

    it("should trigger any error listeners when cdn failover fails following a dash.js manifest download error", async () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      mockMediaSources.failover.mockRejectedValueOnce(new Error("mock failover reject"))

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          code: 25,
          message: "Mock manifest load fail",
        },
      })

      await jest.runOnlyPendingTimersAsync()

      expect(mockErrorCallback).toHaveBeenCalledWith({ code: 25, message: "Mock manifest load fail" })
      expect(mockDashInstance.attachSource).toHaveBeenCalledTimes(1)
    })

    it("should not trigger any error listeners on an init segment download error if more than one CDN available", () => {
      mockMediaSources.availableSources.mockReturnValueOnce(["mock://cdn1.com/mpd/", "mock://cdn2.com/mpd/"])

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()

      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          message: "initial segment download error",
          code: 28,
        },
      })

      expect(mockErrorCallback).not.toHaveBeenCalled()
    })

    it("should trigger any error listeners on an init segment download error if only one CDN available", () => {
      mockMediaSources.availableSources.mockReturnValueOnce(["mock://cdn1.com/mpd/"])

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          message: "initial segment download error",
          code: 28,
        },
      })

      expect(mockErrorCallback).toHaveBeenCalledWith({
        message: "initial segment download error",
        code: 28,
      })

      expect(mockErrorCallback).toHaveBeenCalledTimes(1)
    })

    it("should not trigger any error listeners on a content download error if more than one CDN available", () => {
      mockMediaSources.availableSources.mockReturnValueOnce(["mock://cdn1.com/mpd/", "mock://cdn2.com/mpd/"])

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()

      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          message: "content download error",
          code: 27,
        },
      })

      expect(mockErrorCallback).not.toHaveBeenCalled()
    })

    it("should trigger any error listeners on an content download error if only one CDN available", () => {
      mockMediaSources.availableSources.mockReturnValueOnce(["mock://cdn1.com/mpd/"])

      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          message: "content download error",
          code: 27,
        },
      })

      expect(mockErrorCallback).toHaveBeenCalledWith({
        message: "content download error",
        code: 27,
      })

      expect(mockErrorCallback).toHaveBeenCalledTimes(1)
    })

    it("should reset the media player and trigger any error listeners if an unsupported codec error is thrown", () => {
      const mseStrategy = MSEStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dispatchDashEvent(dashjsMediaPlayerEvents.ERROR, {
        error: {
          message: "videoCodec is not supported",
          code: 30,
        },
      })

      expect(mockDashInstance.reset).toHaveBeenCalled()
      expect(mockErrorCallback).toHaveBeenCalledWith({ code: 30, message: "videoCodec is not supported" })
    })
  })
})
