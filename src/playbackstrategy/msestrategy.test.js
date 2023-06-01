import MediaKinds from "../models/mediakinds"
import WindowTypes from "../models/windowtypes"
import MediaSources from "../mediasources"
import LiveSupport from "../models/livesupport"
import MSEStrategy from "./msestrategy"
import TimeUtils from "../utils/timeutils"
import DynamicWindowUtils from "../dynamicwindowutils"
import Plugins from "../plugins"

const mockDashInstance = {
  initialize: jest.fn(),
  retrieveManifest: jest.fn(),
  getDebug: jest.fn(),
  getSource: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  time: jest.fn(),
  duration: jest.fn(),
  attachSource: jest.fn(),
  reset: jest.fn(),
  isPaused: jest.fn(),
  pause: jest.fn(),
  play: jest.fn(),
  seek: jest.fn(),
  isReady: jest.fn(),
  refreshManifest: jest.fn(),
  getDashMetrics: jest.fn(),
  getDashAdapter: jest.fn(),
  getBitrateInfoListFor: jest.fn(),
  getAverageThroughput: jest.fn(),
  getDVRWindowSize: jest.fn(),
  updateSettings: jest.fn(),
  setDuration: jest.fn(),
  setPlaybackRate: jest.fn(),
  getPlaybackRate: jest.fn(),
  setBlacklistExpiryTime: jest.fn(),
}

const mockDashMediaPlayer = {
  create: jest.fn(() => mockDashInstance),
}

jest.mock("dashjs/index_mediaplayerOnly", () => ({ MediaPlayer: jest.fn(() => mockDashMediaPlayer) }))
jest.mock("../dynamicwindowutils")

describe("Media Source Extensions Playback Strategy", () => {
  const dashjsMediaPlayerEvents = {
    ERROR: "error",
    MANIFEST_LOADED: "manifestLoaded",
    MANIFEST_VALIDITY_CHANGED: "manifestValidityChanged",
    QUALITY_CHANGE_RENDERED: "qualityChangeRendered",
    BASE_URL_SELECTED: "baseUrlSelected",
    METRIC_ADDED: "metricAdded",
    METRIC_CHANGED: "metricChanged",
  }

  let mseStrategy
  let eventCallbacks
  let dashEventCallback
  const eventHandlers = {}
  let playbackElement
  let cdnArray = []
  let mediaSources
  let mockAudioElement
  let mockVideoElement
  let testManifestObject
  let mockTimeModel

  beforeEach(() => {
    window.bigscreenPlayer = {}

    // For DVRInfo Based Seekable Range
    mockDashInstance.duration.mockReturnValue(101)
    mockDashInstance.isReady.mockReturnValue(true)
    mockDashInstance.getDVRWindowSize.mockReturnValue(101)

    mockDashInstance.on.mockImplementation((eventType, handler) => {
      eventHandlers[eventType] = handler
      dashEventCallback = (eventType, event) => eventHandlers[eventType].call(eventType, event)
    })

    mockDashInstance.getDashMetrics.mockReturnValue({
      getCurrentDVRInfo: () => ({ range: { start: 0, end: 101 } }),
      getCurrentBufferLevel: () => "buffer",
      getCurrentRepresentationSwitch: () => 0,
      getCurrentIndexForRepresentation: () => 1,
    })

    mockDashInstance.getDashAdapter.mockReturnValue({
      getIndexForRepresentation: () => 0,
    })

    mockAudioElement = document.createElement("audio")
    mockVideoElement = document.createElement("video")
    playbackElement = document.createElement("div")

    jest.spyOn(document, "createElement").mockImplementationOnce((elementType) => {
      if (elementType === "audio") {
        return mockAudioElement
      } else if (elementType === "video") {
        return mockVideoElement
      }
    })

    jest.spyOn(mockVideoElement, "addEventListener").mockImplementation((eventType, handler) => {
      eventHandlers[eventType] = handler
      eventCallbacks = (eventType, event) => eventHandlers[eventType].call(this, event)
    })

    jest.spyOn(mockVideoElement, "removeEventListener")

    cdnArray = [
      { url: "http://testcdn1/test/", cdn: "http://testcdn1/test/" },
      { url: "http://testcdn2/test/", cdn: "http://testcdn2/test/" },
      { url: "http://testcdn3/test/", cdn: "http://testcdn3/test/" },
    ]

    const mediaSourceCallbacks = {
      onSuccess: jest.fn(),
      onError: jest.fn(),
    }

    mediaSources = new MediaSources()
    jest.spyOn(mediaSources, "time")
    jest.spyOn(mediaSources, "failover")
    mediaSources.init(
      { urls: cdnArray, captions: [] },
      new Date(),
      WindowTypes.STATIC,
      LiveSupport.SEEKABLE,
      mediaSourceCallbacks
    )

    testManifestObject = {
      type: "manifestLoaded",
      data: {
        Period: {
          BaseURL: "dash/",
        },
      },
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete window.bigscreenPlayer
    mockVideoElement = undefined
    mockAudioElement = undefined
  })

  function setUpMSE(timeCorrection, windowType, mediaKind, windowStartTimeMS, windowEndTimeMS, customPlayerSettings) {
    const defaultWindowType = windowType || WindowTypes.STATIC
    const defaultMediaKind = mediaKind || MediaKinds.VIDEO

    mockTimeModel = {
      correction: timeCorrection || 0,
      windowStartTime: windowStartTimeMS || 0,
      windowEndTime: windowEndTimeMS || 0,
    }

    mseStrategy = MSEStrategy(
      mediaSources,
      defaultWindowType,
      defaultMediaKind,
      playbackElement,
      false,
      customPlayerSettings || {}
    )
  }

  describe("Transitions", () => {
    it("canBePaused() Transition is true", () => {
      setUpMSE()

      expect(mseStrategy.transitions.canBePaused()).toBe(true)
    })

    it("canBeginSeek() Transition is true", () => {
      setUpMSE()

      expect(mseStrategy.transitions.canBeginSeek()).toBe(true)
    })
  })

  describe("Load when there is no mediaPlayer", () => {
    it("should create a video element and add it to the media element", () => {
      setUpMSE(null, null, MediaKinds.VIDEO)

      expect(playbackElement.childElementCount).toBe(0)

      mseStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBe(mockVideoElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it("should create an audio element and add it to the media element", () => {
      setUpMSE(null, null, MediaKinds.AUDIO)

      expect(playbackElement.childElementCount).toBe(0)

      mseStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBe(mockAudioElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it("should initialise MediaPlayer with the expected parameters when no start time is present", () => {
      setUpMSE()
      mseStrategy.load(null)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url)
    })

    it("should modify the manifest when dashjs fires a manifest loaded event", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject)

      const baseUrlArray = [
        {
          __text: `${cdnArray[0].url}dash/`,
          "dvb:priority": 0,
          "dvb:weight": 0,
          serviceLocation: cdnArray[0].url,
        },
        {
          __text: `${cdnArray[1].url}dash/`,
          "dvb:priority": 1,
          "dvb:weight": 0,
          serviceLocation: cdnArray[1].url,
        },
        {
          __text: `${cdnArray[2].url}dash/`,
          "dvb:priority": 2,
          "dvb:weight": 0,
          serviceLocation: cdnArray[2].url,
        },
      ]

      expect(testManifestObject.data.BaseURL_asArray).toEqual(baseUrlArray)
    })

    describe("for STATIC window", () => {
      it("should initialise MediaPlayer with the expected parameters when startTime is zero", () => {
        setUpMSE()
        mseStrategy.load(null, 0)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url)
      })

      it("should initialise MediaPlayer with the expected parameters when startTime is set", () => {
        setUpMSE()
        mseStrategy.load(null, 15)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=15`)
      })
    })

    describe("for SLIDING window", () => {
      beforeEach(() => {
        setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO, 100000, 200000)
        mediaSources.time.mockReturnValue(mockTimeModel)
        mockDashInstance.getSource.mockReturnValue("src")
      })

      it("should initialise MediaPlayer with the expected parameters when startTime is zero", () => {
        mseStrategy.load(null, 0)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=posix:161`)
      })

      it("should initialise MediaPlayer with the expected parameters when startTime is set to 0.1", () => {
        mseStrategy.load(null, 0.1)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=posix:161`)
      })

      it("should initialise MediaPlayer with the expected parameters when startTime is set", () => {
        mseStrategy.load(null, 60)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=posix:220`)
      })
    })

    describe("for GROWING window", () => {
      beforeEach(() => {
        setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000)
        mediaSources.time.mockReturnValue(mockTimeModel)
        mockDashInstance.getSource.mockReturnValue("src")
      })

      it("should initialise MediaPlayer with the expected parameters when startTime is zero", () => {
        mseStrategy.load(null, 0)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=posix:161`)
      })

      it("should initialise MediaPlayer with the expected parameters when startTime is set to 0.1", () => {
        mseStrategy.load(null, 0.1)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=posix:161`)
      })

      it("should initialise MediaPlayer with the expected parameters when startTime is set", () => {
        mseStrategy.load(null, 60)

        expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
        expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=posix:220`)
      })
    })

    it("should set up bindings to MediaPlayer Events correctly", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith("timeupdate", expect.any(Function))
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith("playing", expect.any(Function))
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith("pause", expect.any(Function))
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith("waiting", expect.any(Function))
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith("seeking", expect.any(Function))
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith("seeked", expect.any(Function))
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith("ended", expect.any(Function))
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
    const noop = () => {}
    let failoverInfo

    beforeEach(() => {
      failoverInfo = { isBufferingTimeoutError: false }
    })

    it("should attach a new source with the expected parameters", () => {
      setUpMSE()

      mockDashInstance.getSource.mockReturnValue("src")

      mseStrategy.load(null, 0)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url)

      // Player component would do this with its buffering timeout logic
      mediaSources.failover(noop, noop, failoverInfo)

      mseStrategy.load(null, 0)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[1].url)
    })

    it("should attach a new source with the expected parameters called before we have a valid currentTime", () => {
      setUpMSE()

      mockDashInstance.getSource.mockReturnValue("src")

      mseStrategy.load(null, 45)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=45`)

      mediaSources.failover(noop, noop, failoverInfo)
      mseStrategy.load(null, 0)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[1].url}#t=45`)

      mediaSources.failover(noop, noop, failoverInfo)
      mseStrategy.load(null, 0)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[2].url}#t=45`)
    })

    it("should attach a new source with expected parameters at the current playback time", () => {
      setUpMSE()

      mockDashInstance.getSource.mockReturnValue("src")

      mseStrategy.load(null, 45)

      expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true)
      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[0].url}#t=45`)

      mediaSources.failover(noop, noop, failoverInfo)

      mockVideoElement.currentTime = 86
      eventHandlers.timeupdate()
      mseStrategy.load(null, 0)

      expect(mockDashInstance.attachSource).toHaveBeenCalledWith(`${cdnArray[1].url}#t=86`)
    })

    it("should fire download error event when in growing window", () => {
      jest.spyOn(Plugins.interface, "onErrorHandled")
      setUpMSE()

      mseStrategy.load(cdnArray, WindowTypes.GROWING, 3)

      eventHandlers.error({
        errorMessage: "Boom",
      })

      expect(Plugins.interface.onErrorHandled).not.toHaveBeenCalledWith()
    })

    it("should call plugin handler on dash download manifest error", () => {
      setUpMSE()
      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)
      mseStrategy.load(cdnArray, WindowTypes.GROWING, 3)

      const testError = {
        error: {
          event: {
            id: "manifest",
          },
        },
      }

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, testError)

      expect(mockErrorCallback).toHaveBeenCalled()
    })

    it("should call mediaSources failover on dash baseUrl changed event", () => {
      setUpMSE()
      mseStrategy.load(WindowTypes.STATIC, 10)

      expect(mediaSources.availableSources()).toHaveLength(3)
      dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject)

      eventHandlers.baseUrlSelected({
        baseUrl: {
          url: cdnArray[1].cdn,
          serviceLocation: cdnArray[1].cdn,
        },
      })

      expect(mediaSources.availableSources()).toHaveLength(2)
    })

    it("should call mediaSources failover on dash baseUrl changed event but do nothing on the current url", () => {
      setUpMSE()
      mseStrategy.load(WindowTypes.STATIC, 10)

      expect(mediaSources.availableSources()).toHaveLength(3)
      dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject)

      eventHandlers.baseUrlSelected({
        baseUrl: {
          url: cdnArray[0].cdn,
          serviceLocation: cdnArray[0].cdn,
        },
      })

      expect(mediaSources.availableSources()).toHaveLength(3)
    })
  })

  describe("getSeekableRange()", () => {
    it("returns the correct start and end time", () => {
      setUpMSE()
      mseStrategy.load(null, 45)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 101 })
    })

    it("returns the end time taking the live delay into account for a live stream", () => {
      const customPlayerSettings = {
        streaming: {
          liveDelay: 20,
        },
      }
      setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO, 100, 1000, customPlayerSettings)
      mseStrategy.load(null, 45)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 81 })
    })

    it("returns the end time ignoring the live delay for an on demand stream", () => {
      const customPlayerSettings = {
        streaming: {
          liveDelay: 20,
        },
      }
      setUpMSE(0, WindowTypes.STATIC, MediaKinds.VIDEO, 100, 1000, customPlayerSettings)
      mseStrategy.load(null, 45)

      expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 101 })
    })
  })

  describe("getCurrentTime()", () => {
    it("returns the correct time from the DASH Mediaplayer", () => {
      setUpMSE()
      mockVideoElement.currentTime = 10

      mseStrategy.load(null, 0)

      expect(mseStrategy.getCurrentTime()).toBe(10)
    })

    it("returns 0 when MediaPlayer is undefined", () => {
      setUpMSE()

      expect(mseStrategy.getCurrentTime()).toBe(0)
    })
  })

  describe("getDuration()", () => {
    it("returns the correct duration from the DASH Mediaplayer", () => {
      setUpMSE()

      mseStrategy.load(null, 0)

      expect(mseStrategy.getDuration()).toBe(101)
    })

    it("returns 0 when the MediaPlayer is undefined", () => {
      setUpMSE()

      expect(mseStrategy.getDuration()).toBe(0)
    })
  })

  describe("getPlayerElement()", () => {
    it("returns the media player video element", () => {
      setUpMSE()

      mseStrategy.load(null, 0)

      expect(mseStrategy.getPlayerElement()).toBe(mockVideoElement)
    })

    it("returns the media player audio element", () => {
      setUpMSE(null, null, "audio")

      mseStrategy.load(null, 0)

      expect(mseStrategy.getPlayerElement()).toBe(mockAudioElement)
    })
  })

  describe("tearDown()", () => {
    it("should reset the MediaPlayer", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.tearDown()

      expect(mockDashInstance.reset).toHaveBeenCalledWith()
    })

    it("should tear down bindings to MediaPlayer Events correctly", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.tearDown()

      expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith("timeupdate", expect.any(Function))
      expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith("playing", expect.any(Function))
      expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith("pause", expect.any(Function))
      expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith("waiting", expect.any(Function))
      expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith("seeking", expect.any(Function))
      expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith("seeked", expect.any(Function))
      expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith("ended", expect.any(Function))
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
      setUpMSE()
      mseStrategy.load(null, 0)

      expect(playbackElement.childElementCount).toBe(1)

      mseStrategy.tearDown()

      expect(playbackElement.childElementCount).toBe(0)
    })

    it("should empty the eventCallbacks array and stop emitting events", () => {
      function tearDownAndError() {
        mseStrategy.load(null, 0)
        mseStrategy.tearDown()
        dashEventCallback("pause")
      }

      setUpMSE()

      expect(tearDownAndError).not.toThrow()
    })
  })

  describe("isEnded()", () => {
    it("should be set to false on initialisation of the strategy", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      expect(mseStrategy.isEnded()).toBe(false)
    })

    it("should be set to true when we get an ended event", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      eventCallbacks("ended")

      expect(mseStrategy.isEnded()).toBe(true)
    })

    it("should be set to false when we get a playing event", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      eventCallbacks("playing")

      expect(mseStrategy.isEnded()).toBe(false)
    })

    it("should be set to false when we get a waiting event", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      eventCallbacks("waiting")

      expect(mseStrategy.isEnded()).toBe(false)
    })

    it("should be set to true when we get a completed event then false when we start initial buffering from playing", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      eventCallbacks("ended")

      expect(mseStrategy.isEnded()).toBe(true)

      eventCallbacks("waiting")

      expect(mseStrategy.isEnded()).toBe(false)
    })
  })

  describe("isPaused()", () => {
    it("should correctly return the paused state from the MediaPlayer when not paused", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mockDashInstance.isPaused.mockReturnValue(false)

      expect(mseStrategy.isPaused()).toBe(false)
    })

    it("should correctly return the paused state from the MediaPlayer when paused", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mockDashInstance.isPaused.mockReturnValue(true)

      expect(mseStrategy.isPaused()).toBe(true)
    })
  })

  describe("pause()", () => {
    it("should call through to MediaPlayer's pause function", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.pause()

      expect(mockDashInstance.pause).toHaveBeenCalledWith()
    })
  })

  describe("play()", () => {
    it("should call through to MediaPlayer's play function", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.play()

      expect(mockDashInstance.play).toHaveBeenCalledWith()
    })
  })

  describe("setCurrentTime()", () => {
    it("should call through to MediaPlayer's seek function", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(12)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(12)
    })

    it("should clamp the seek to the start of the seekable range", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(-0.1)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(0)
    })

    it("should clamp the seek to 1.1s before the end of the seekable range", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.setCurrentTime(101)

      expect(mockDashInstance.seek).toHaveBeenCalledWith(99.9)
    })

    describe("sliding window", () => {
      beforeEach(() => {
        setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO, 100, 1000)
        mseStrategy.load(null, 0)
        mockDashInstance.play.mockReset()
      })

      it("should set current time on the video element", () => {
        mseStrategy.setCurrentTime(12)

        expect(mockDashInstance.seek).toHaveBeenCalledWith(12)
      })

      it("should always clamp the seek to the start of the seekable range", () => {
        mseStrategy.setCurrentTime(-0.1)

        expect(mockVideoElement.currentTime).toBe(0)
      })

      it("should always clamp the seek to 1.1s before the end of the seekable range", () => {
        mseStrategy.setCurrentTime(101)

        expect(mockDashInstance.seek).toHaveBeenCalledWith(99.9)
      })

      it("should start autoresume timeout when paused", () => {
        mseStrategy.pause()

        expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
      })

      it("should not start autoresume timeout when paused and disableAutoResume is set", () => {
        const opts = {
          disableAutoResume: true,
        }

        mseStrategy.pause(opts)

        expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
      })

      it("should calculate seek offset time when paused before seeking", () => {
        jest.spyOn(TimeUtils, "calculateSlidingWindowSeekOffset")
        mseStrategy.pause()
        mseStrategy.setCurrentTime(101)

        expect(TimeUtils.calculateSlidingWindowSeekOffset).toHaveBeenCalledTimes(1)
      })

      it("should start auto resume timeout when paused and seeking", () => {
        mockDashInstance.isPaused.mockReturnValue(true)

        mseStrategy.pause()
        mseStrategy.setCurrentTime()

        eventCallbacks("seeked")

        expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(2)
      })

      it("should not try to autoresume when playing and seeking", () => {
        mockDashInstance.isPaused.mockReturnValue(false)

        mseStrategy.setCurrentTime()
        eventCallbacks("seeked")

        expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
      })
    })

    describe("growing window", () => {
      beforeEach(() => {
        setUpMSE(0, WindowTypes.GROWING)
        mseStrategy.load(null, 0)
        mockVideoElement.currentTime = 50
        mockDashInstance.refreshManifest.mockReset()
      })

      it("should perform a seek without refreshing the manifest if seek time is less than current time", () => {
        mseStrategy.setCurrentTime(40)

        expect(mockDashInstance.refreshManifest).not.toHaveBeenCalled()

        expect(mockDashInstance.seek).toHaveBeenCalledWith(40)
      })

      it("should call seek on media player with the original user requested seek time when manifest refreshes but doesnt have a duration", () => {
        mockDashInstance.refreshManifest.mockImplementation((callback) => callback({}))

        mseStrategy.setCurrentTime(60)

        expect(mockDashInstance.seek).toHaveBeenCalledWith(60)
      })

      it("should call seek on media player with the time clamped to new end when manifest refreshes and contains a duration", () => {
        mockDashInstance.refreshManifest.mockImplementation((callback) => callback({ mediaPresentationDuration: 80 }))

        mseStrategy.setCurrentTime(90)

        expect(mockDashInstance.seek).toHaveBeenCalledWith(78.9)
      })
    })
  })

  describe("Playback Rate", () => {
    it("should call through to MediaPlayer's setPlaybackRate function", () => {
      setUpMSE()
      mseStrategy.load(null, 0)

      mseStrategy.setPlaybackRate(2)

      expect(mockDashInstance.setPlaybackRate).toHaveBeenCalledWith(2)
    })

    it("should call through to MediaPlayer's getPlaybackRate function and returns correct value", () => {
      setUpMSE()
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

    afterEach(() => {
      mockDashInstance.setDuration.mockReset()
    })

    describe("overrides dynamic stream duration", () => {
      it("when mseDurationOverride configration property is true and window type is sliding", () => {
        window.bigscreenPlayer.overrides = {
          mseDurationOverride: true,
        }

        setUpMSE(0, WindowTypes.SLIDING)
        mseStrategy.load(null, 0)

        eventHandlers.streamInitialized()

        expect(mockDashInstance.setDuration).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
      })

      it("when mseDurationOverride configration property is true and window type is growing", () => {
        window.bigscreenPlayer.overrides = {
          mseDurationOverride: true,
        }

        setUpMSE(0, WindowTypes.GROWING)
        mseStrategy.load(null, 0)

        eventHandlers.streamInitialized()

        expect(mockDashInstance.setDuration).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
      })
    })

    describe("does not override stream duration", () => {
      it("when mseDurationOverride configration property is true and window type is static", () => {
        window.bigscreenPlayer.overrides = {
          mseDurationOverride: true,
        }

        setUpMSE(0, WindowTypes.STATIC)
        mseStrategy.load(null, 0)

        eventHandlers.streamInitialized()

        expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
      })

      it("when mseDurationOverride configration property is false and window type is static", () => {
        window.bigscreenPlayer.overrides = {
          mseDurationOverride: false,
        }

        setUpMSE(0, WindowTypes.STATIC)
        mseStrategy.load(null, 0)

        eventHandlers.streamInitialized()

        expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
      })

      it("when mseDurationOverride configration property is false and window type is sliding", () => {
        window.bigscreenPlayer.overrides = {
          mseDurationOverride: false,
        }

        setUpMSE(0, WindowTypes.SLIDING)
        mseStrategy.load(null, 0)

        eventHandlers.streamInitialized()

        expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
      })

      it("when mseDurationOverride configration property is false and window type is growing", () => {
        window.bigscreenPlayer.overrides = {
          mseDurationOverride: false,
        }

        setUpMSE(0, WindowTypes.GROWING)
        mseStrategy.load(null, 0)

        eventHandlers.streamInitialized()

        expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER)
      })
    })
  })

  describe("onManifestLoaded", () => {
    it("calls onManifestLoaded plugin with the manifest when dashjs loads it", () => {
      const onManifestLoadedSpy = jest.spyOn(Plugins.interface, "onManifestLoaded")

      dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject)

      expect(onManifestLoadedSpy).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  describe("onMetricAdded and onQualityChangeRendered", () => {
    const mockEvent = {
      mediaType: "video",
      oldQuality: 0,
      newQuality: 1,
      type: "qualityChangeRendered",
    }

    const mockOnPlayerInfoUpdated = jest.fn()

    beforeEach(() => {
      jest.spyOn(Plugins.interface, "onPlayerInfoUpdated").mockReturnValue(mockOnPlayerInfoUpdated)
      jest.spyOn(Plugins.interface, "onErrorHandled")
      mockOnPlayerInfoUpdated.mockReset()
    })

    it("should call plugins with the combined playback bitrate", () => {
      setUpMSE()
      mockDashInstance.getBitrateInfoListFor.mockReturnValue([
        { bitrate: 1024000 },
        { bitrate: 200000 },
        { bitrate: 3000000 },
      ])
      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, mockEvent)

      expect(Plugins.interface.onPlayerInfoUpdated).toHaveBeenCalledWith({
        playbackBitrate: 2048,
        bufferLength: undefined,
      })
    })

    it("should call plugins with video playback buffer length", () => {
      const mockBufferEvent = {
        mediaType: "video",
        metric: "BufferLevel",
      }

      setUpMSE()
      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent)

      expect(Plugins.interface.onPlayerInfoUpdated).toHaveBeenCalledWith({
        playbackBitrate: undefined,
        bufferLength: "buffer",
      })
    })

    it("should not call plugins with audio playback buffer length when mediaKind is video", () => {
      const mockBufferEvent = {
        mediaType: "audio",
        metric: "BufferLevel",
      }

      setUpMSE()
      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent)

      expect(Plugins.interface.onPlayerInfoUpdated).not.toHaveBeenCalledWith()
    })
  })

  describe("Error handling", () => {
    it("should not fire error handled event on initial load", () => {
      const mockEvent = {
        mediaType: "video",
        type: "baseUrlSelected",
        baseUrl: {
          serviceLocation: "cdn1",
        },
      }

      setUpMSE()
      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.BASE_URL_SELECTED, mockEvent)

      expect(Plugins.interface.onErrorHandled).not.toHaveBeenCalledWith()
    })

    it("should not publish error event on initial segment download error", () => {
      const mockEvent = {
        error: {
          message: "initial segment download error",
          code: 28,
        },
      }

      setUpMSE()

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

      expect(mockErrorCallback).not.toHaveBeenCalled()
    })

    it("should not publish error event on content download error", () => {
      const mockEvent = {
        error: {
          message: "content download error",
          code: 27,
        },
      }

      setUpMSE()

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

      expect(mockErrorCallback).not.toHaveBeenCalled()
    })

    it("should initiate a failover with correct parameters on manifest download error", () => {
      const mockEvent = {
        error: {
          message: "manifest download error",
          code: 25,
        },
      }

      setUpMSE()

      mseStrategy.load(null, 0)
      mockVideoElement.currentTime = 10

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

      const failoverParams = {
        isBufferingTimeoutError: false,
        currentTime: mseStrategy.getCurrentTime(),
        duration: mseStrategy.getDuration(),
        code: mockEvent.error.code,
        message: mockEvent.error.message,
      }

      expect(mediaSources.failover).toHaveBeenCalledWith(mseStrategy.load, expect.any(Function), failoverParams)
    })

    it("should not publish error event on manifest download error when it is possible to failover", () => {
      const mockEvent = {
        error: {
          message: "manifest download error",
          code: 25,
        },
      }

      setUpMSE()

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

      expect(mockErrorCallback).not.toHaveBeenCalled()
    })

    it("should publish an error event on manifest download error when there are no more sources to CDN failover to", () => {
      const mockEvent = {
        error: {
          message: "manifest download error",
          code: 25,
        },
      }

      const noop = () => {}
      mediaSources.failover(noop, noop, { isBufferingTimeoutError: false })
      mediaSources.failover(noop, noop, { isBufferingTimeoutError: false })

      setUpMSE()

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)
      mockVideoElement.currentTime = 10

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

      expect(mockErrorCallback).toHaveBeenCalledWith({ code: 25, message: "manifest download error" })
    })

    it("should publish an error event for any other error propagated from dash.js", () => {
      const mockEvent = {
        error: {
          message: "MEDIA_ERR_ABORTED (message from element)",
          code: 1,
        },
      }

      setUpMSE()

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)
      mockVideoElement.currentTime = 10

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

      expect(mockErrorCallback).toHaveBeenCalledWith({ code: 1, message: "MEDIA_ERR_ABORTED (message from element)" })
    })

    it("should reset the media player immediately if an unsupported codec error is thrown", () => {
      const mockEvent = {
        error: {
          message: "videoCodec is not supported",
          code: 30,
        },
      }

      setUpMSE()

      const mockErrorCallback = jest.fn()
      mseStrategy.addErrorCallback(null, mockErrorCallback)

      mseStrategy.load(null, 0)
      mockVideoElement.currentTime = 10

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent)

      expect(mockDashInstance.reset).toHaveBeenCalled()
      expect(mockErrorCallback).toHaveBeenCalledWith({ code: 30, message: "videoCodec is not supported" })
    })

    it("should initiate a failover with the previous error code and message on baseurlselected", () => {
      const mockErrorEvent = {
        error: {
          message: "content download error",
          code: 27,
        },
      }

      setUpMSE()

      mseStrategy.load(null, 0)
      mockVideoElement.currentTime = 10

      dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockErrorEvent)
      expect(mediaSources.failover).not.toHaveBeenCalled()

      const mockBaseUrlEvent = {
        mediaType: "video",
        type: "baseUrlSelected",
        baseUrl: {
          serviceLocation: "cdn1",
        },
      }

      dashEventCallback(dashjsMediaPlayerEvents.BASE_URL_SELECTED, mockBaseUrlEvent)

      const failoverParams = {
        isBufferingTimeoutError: false,
        serviceLocation: "cdn1",
        code: mockErrorEvent.error.code,
        message: mockErrorEvent.error.message,
      }

      expect(mediaSources.failover).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), failoverParams)
    })
  })

  describe("seeking and waiting events", () => {
    let eventCallbackSpy

    beforeEach(() => {
      setUpMSE()
      eventCallbackSpy = jest.fn()
      mseStrategy.addEventCallback(this, eventCallbackSpy)
      mseStrategy.load(null, 0)
      mseStrategy.play()
    })

    it("should call the event callback once when seeking", () => {
      mseStrategy.pause()

      mseStrategy.setCurrentTime(60)

      eventCallbacks("seeking")
      eventCallbacks("waiting")

      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should call the event callback more than once when not seeking", () => {
      eventCallbacks("waiting")
      eventCallbacks("waiting")

      expect(eventCallbackSpy).toHaveBeenCalledTimes(2)
    })
  })
})
