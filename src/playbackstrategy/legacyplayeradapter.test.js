import { LiveSupport } from "../models/livesupport"
import { ManifestType } from "../models/manifesttypes"
import MediaState from "../models/mediastate"
import LegacyAdaptor from "./legacyplayeradapter"
import LiveGlitchCurtain from "./liveglitchcurtain"

jest.mock("../playbackstrategy/liveglitchcurtain")

/**
 * Note: The default 'seekable' API is identical to the API for on-demand/static streams
 *
 * @param {LiveSupport} liveSupport
 * @returns {Object} A mocked media player instance
 */
function createMockMediaPlayer(liveSupport = LiveSupport.SEEKABLE) {
  const eventCallbacks = []

  function dispatchEvent(event) {
    for (const callback of eventCallbacks) {
      callback(event)
    }
  }

  const basePlayer = {
    dispatchEvent,
    addEventCallback: jest
      .fn()
      .mockImplementation((component, callback) => eventCallbacks.push(callback.bind(component))),
    beginPlayback: jest.fn(),
    getMimeType: jest.fn(),
    getPlayerElement: jest.fn(),
    getState: jest.fn(),
    getSource: jest.fn(),
    initialiseMedia: jest.fn(),
    removeAllEventCallbacks: jest.fn(),
    reset: jest.fn(),
    stop: jest.fn(),
  }

  if (liveSupport === LiveSupport.RESTARTABLE) {
    return { ...basePlayer, beginPlaybackFrom: jest.fn() }
  }

  if (liveSupport === LiveSupport.SEEKABLE) {
    return {
      ...basePlayer,
      beginPlaybackFrom: jest.fn(),
      getSeekableRange: jest.fn(),
      playFrom: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    }
  }

  return basePlayer
}

const mockGlitchCurtain = {
  showCurtain: jest.fn(),
  hideCurtain: jest.fn(),
  tearDown: jest.fn(),
}

const mockMediaSources = {
  // init: jest.fn().mockResolvedValue(),
  // tearDown: jest.fn(),
  time: jest.fn(),
  // failoverResetTime: jest.fn().mockReturnValue(10),
  currentSource: jest.fn().mockReturnValue(""),
  // availableSources: jest.fn().mockReturnValue([]),
  // failover: jest.fn().mockResolvedValue(),
}

const MediaPlayerEvent = {
  STOPPED: "stopped", // Event fired when playback is stopped
  BUFFERING: "buffering", // Event fired when playback has to suspend due to buffering
  PLAYING: "playing", // Event fired when starting (or resuming) playing of the media
  PAUSED: "paused", // Event fired when media playback pauses
  COMPLETE: "complete", // Event fired when media playback has reached the end of the media
  ERROR: "error", // Event fired when an error condition occurs
  STATUS: "status", // Event fired regularly during play
  SEEK_ATTEMPTED: "seek-attempted", // Event fired when a device using a seekfinishedemitevent modifier sets the source
  SEEK_FINISHED: "seek-finished", // Event fired when a device using a seekfinishedemitevent modifier has seeked successfully
}

const MediaPlayerState = {
  EMPTY: "EMPTY", // No source set
  STOPPED: "STOPPED", // Source set but no playback
  BUFFERING: "BUFFERING", // Not enough data to play, waiting to download more
  PLAYING: "PLAYING", // Media is playing
  PAUSED: "PAUSED", // Media is paused
  COMPLETE: "COMPLETE", // Media has reached its end point
  ERROR: "ERROR", // An error occurred
}

describe("Legacy Playback Adapter", () => {
  let legacyAdaptor
  let mediaPlayer
  let mediaElement
  let playbackElement
  const cdnArray = []

  const originalCreateElement = document.createElement

  const mockMediaElement = (mediaKind) => {
    const mediaEl = originalCreateElement.call(document, mediaKind)

    mediaEl.__mocked__ = true

    jest.spyOn(mediaEl, "addEventListener")
    jest.spyOn(mediaEl, "removeEventListener")

    return mediaEl
  }

  beforeAll(() => {
    LiveGlitchCurtain.mockReturnValue(mockGlitchCurtain)

    jest.spyOn(document, "createElement").mockImplementation((elementType) => {
      if (["audio", "video"].includes(elementType)) {
        mediaElement = mockMediaElement(elementType)
        return mediaElement
      }

      return originalCreateElement.call(document, elementType)
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    window.bigscreenPlayer = {
      playbackStrategy: "stubstrategy",
    }

    playbackElement = originalCreateElement.call(document, "div")

    mockMediaSources.time.mockReturnValue({ manifestType: ManifestType.STATIC })
  })

  afterEach(() => {
    delete window.bigscreenPlayer
  })

  describe("load", () => {
    it("should initialise the media player", () => {
      mockMediaSources.currentSource.mockReturnValueOnce("mock://media.src/")

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", 0)

      expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith(
        "video",
        "mock://media.src/",
        "video/mp4",
        playbackElement,
        {
          disableSeekSentinel: false,
          disableSentinels: false,
        }
      )
    })

    it("should begin playback from zero if no start time is passed in for a static stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(0)
    })

    it("should begin playback from the passed in start time for a static stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", 50)

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(50)
    })

    it.each([LiveSupport.PLAYABLE, LiveSupport.RESTARTABLE, LiveSupport.SEEKABLE])(
      "should begin playback at the live point for a dynamic stream on a %s device",
      (liveSupport) => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(liveSupport)

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdaptor.load("video/mp4", null)

        expect(mediaPlayer.beginPlayback).toHaveBeenCalledTimes(1)
      }
    )

    it("should ignore start time and begin playback at the live point for a dynamic stream on a playable device", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", 50)

      expect(mediaPlayer.beginPlayback).toHaveBeenCalledTimes(1)
    })

    it.each([LiveSupport.RESTARTABLE, LiveSupport.SEEKABLE])(
      "should begin playback from the start time for a dynamic stream on a %s device",
      (liveSupport) => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(liveSupport)

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdaptor.load("video/mp4", 50)

        expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(50)
      }
    )

    it.each([LiveSupport.RESTARTABLE, LiveSupport.SEEKABLE])(
      "should begin playback from the start time for a dynamic stream on a %s device when start time is zero",
      (liveSupport) => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(liveSupport)

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdaptor.load("video/mp4", 0)

        expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(0)
      }
    )

    it("should disable all sentinels for a dynamic UHD stream when configured to do so", () => {
      window.bigscreenPlayer.overrides = {
        liveUhdDisableSentinels: true,
      }

      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })
      mockMediaSources.currentSource.mockReturnValueOnce("mock://media.src/")

      const isUHD = true
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, isUHD, mediaPlayer)

      legacyAdaptor.load("video/mp4")

      expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith(
        "video",
        "mock://media.src/",
        "video/mp4",
        playbackElement,
        {
          disableSeekSentinel: false,
          disableSentinels: true,
        }
      )
    })

    it("should disable seek sentinels if we are configured to do so", () => {
      window.bigscreenPlayer.overrides = {
        disableSeekSentinel: true,
      }

      mockMediaSources.currentSource.mockReturnValueOnce("mock://media.src/")

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4")

      expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith(
        "video",
        "mock://media.src/",
        "video/mp4",
        playbackElement,
        {
          disableSeekSentinel: true,
          disableSentinels: false,
        }
      )
    })
  })

  describe("play", () => {
    describe("when the player supports playFrom()", () => {
      it("should play from 0 if the stream has ended", () => {
        const mediaPlayer = createMockMediaPlayer()

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdaptor.load("video/mp4", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

        legacyAdaptor.play()

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(0)
      })

      it.each([ManifestType.STATIC, ManifestType.DYNAMIC])(
        "should play from the current time for a %s stream when we are not ended, paused or buffering",
        (manifestType) => {
          mockMediaSources.time.mockReturnValueOnce({ manifestType })

          const mediaPlayer = createMockMediaPlayer()

          const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

          legacyAdaptor.load("video/mp4", null)

          mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS, currentTime: 10 })

          legacyAdaptor.play()

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)
        }
      )
    })

    describe("when the player does not support playFrom()", () => {
      it("should not throw an error when playback has completed", () => {
        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdaptor.load("video/mp4", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

        expect(() => legacyAdaptor.play()).not.toThrow()
      })

      it("should not throw an error if we are not ended or in a state where player can resume", () => {
        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdaptor.load("video/mp4", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS, currentTime: 10 })

        expect(() => legacyAdaptor.play()).not.toThrow()
      })
    })

    describe("player resume support", () => {
      it("should resume when in a state where player can resume", () => {
        const mediaPlayer = createMockMediaPlayer()

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        mediaPlayer.getState.mockReturnValue(MediaPlayerState.PAUSED)

        legacyAdaptor.play()

        expect(mediaPlayer.resume).toHaveBeenCalledWith()
      })

      it("should not throw when the player does not support resume", () => {
        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

        mediaPlayer.getState.mockReturnValue(MediaPlayerState.PAUSED)

        expect(() => legacyAdaptor.play()).not.toThrow()
      })
    })
  })

  describe("pause", () => {
    it("should pause when we don't need to delay a call to pause", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.pause()

      expect(mediaPlayer.pause).toHaveBeenCalledTimes(1)
    })

    it("should not pause when we need to delay a call to pause", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("application/dash+xml", null)

      // seeking
      legacyAdaptor.setCurrentTime(10)
      mediaPlayer.getState.mockReturnValue(MediaPlayerState.BUFFERING)

      legacyAdaptor.pause()

      expect(mediaPlayer.pause).not.toHaveBeenCalled()
    })
  })

  describe("isPaused", () => {
    it("should be set to false once we have loaded", () => {
      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdaptor.load("video/mp4", null)

      expect(legacyAdaptor.isPaused()).toBe(false)
    })

    it("should be set to false when we call play", () => {
      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdaptor.load("video/mp4", null)

      legacyAdaptor.play()

      expect(legacyAdaptor.isPaused()).toBe(false)
    })

    it("should be set to false when we get a playing event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING })

      expect(legacyAdaptor.isPaused()).toBe(false)
    })

    it("should be set to false when we get a time update event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS })

      expect(legacyAdaptor.isPaused()).toBe(false)
    })

    it("should be set to true when we get a paused event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

      expect(legacyAdaptor.isPaused()).toBe(true)
    })

    it("should be set to true when we get a ended event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

      expect(legacyAdaptor.isPaused()).toBe(true)
    })
  })

  describe("isEnded", () => {
    it("should be set to false on initialisation of the strategy", () => {
      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdaptor.load("video/mp4", null)

      expect(legacyAdaptor.isEnded()).toBe(false)
    })

    it("should be set to true when we get an ended event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

      expect(legacyAdaptor.isEnded()).toBe(true)
    })

    it("should be set to false when we a playing event is recieved", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING })

      expect(legacyAdaptor.isEnded()).toBe(false)
    })

    it("should be set to false when we get a waiting event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.BUFFERING })

      expect(legacyAdaptor.isEnded()).toBe(false)
    })

    it("should be set to true when we get a completed event then false when we start initial buffering from playing", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdaptor.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

      expect(legacyAdaptor.isEnded()).toBe(true)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.BUFFERING })

      expect(legacyAdaptor.isEnded()).toBe(false)
    })
  })

  // describe("getDuration", () => {
  //   it("should be set to 0 on initialisation", () => {
  //     setUpLegacyAdaptor()

  //     expect(legacyAdaptor.getDuration()).toBe(0)
  //   })

  //   it("should be updated by the playing event duration when the duration is undefined or 0", () => {
  //     setUpLegacyAdaptor()

  //     eventCallbacks({ type: MediaPlayerEvent.PLAYING, duration: 10 })

  //     expect(legacyAdaptor.getDuration()).toBe(10)
  //   })

  //   it("should use the local duration when the value is not undefined or 0", () => {
  //     setUpLegacyAdaptor()

  //     eventCallbacks({ type: MediaPlayerEvent.PLAYING, duration: 10 })

  //     expect(legacyAdaptor.getDuration()).toBe(10)

  //     eventCallbacks({ type: MediaPlayerEvent.PLAYING, duration: 20 })

  //     expect(legacyAdaptor.getDuration()).toBe(10)
  //   })
  // })

  // describe("getPlayerElement", () => {
  //   it("should return the mediaPlayer element", () => {
  //     setUpLegacyAdaptor()

  //     const videoElement = document.createElement("video")

  //     mediaPlayer.getPlayerElement.mockReturnValue(videoElement)

  //     expect(legacyAdaptor.getPlayerElement()).toEqual(videoElement)
  //   })
  // })

  // describe("getSeekableRange", () => {
  //   it("should return the start as 0 and the end as the duration for vod", () => {
  //     setUpLegacyAdaptor()

  //     eventCallbacks({ type: MediaPlayerEvent.PLAYING, duration: 10 })

  //     expect(legacyAdaptor.getSeekableRange()).toEqual({ start: 0, end: 10 })
  //   })

  //   it("should return the start/end from the player - time correction", () => {
  //     testTimeCorrection = 10
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING, playableDevice: false })

  //     mediaPlayer.getSeekableRange.mockReturnValue({ start: 110, end: 1010 })

  //     expect(legacyAdaptor.getSeekableRange()).toEqual({ start: 100, end: 1000 })
  //   })

  //   it("should return the start/end from the player when the time correction is 0", () => {
  //     testTimeCorrection = 0
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING, playableDevice: false })

  //     mediaPlayer.getSeekableRange.mockReturnValue({ start: 100, end: 1000 })

  //     expect(legacyAdaptor.getSeekableRange()).toEqual({ start: 100, end: 1000 })
  //   })
  // })

  // describe("getCurrentTime", () => {
  //   it("should be set when we get a playing event", () => {
  //     setUpLegacyAdaptor()

  //     eventCallbacks({ type: MediaPlayerEvent.PLAYING, currentTime: 10 })

  //     expect(legacyAdaptor.getCurrentTime()).toBe(10)
  //   })

  //   it("should be set with time correction when we get a playing event", () => {
  //     testTimeCorrection = 5
  //     setUpLegacyAdaptor({ windowType: WindowTypes.STATIC })

  //     eventCallbacks({ type: MediaPlayerEvent.PLAYING, currentTime: 10 })

  //     expect(legacyAdaptor.getCurrentTime()).toBe(5)
  //   })

  //   it("should be set when we get a time update event", () => {
  //     setUpLegacyAdaptor()

  //     eventCallbacks({ type: MediaPlayerEvent.STATUS, currentTime: 10 })

  //     expect(legacyAdaptor.getCurrentTime()).toBe(10)
  //   })

  //   it("should be set with time correction when we get a time update event", () => {
  //     testTimeCorrection = 5
  //     setUpLegacyAdaptor({ windowType: WindowTypes.STATIC })

  //     eventCallbacks({ type: MediaPlayerEvent.STATUS, currentTime: 10 })

  //     expect(legacyAdaptor.getCurrentTime()).toBe(5)
  //   })
  // })

  // describe("setCurrentTime", () => {
  //   it("should set isEnded to false", () => {
  //     setUpLegacyAdaptor()

  //     legacyAdaptor.setCurrentTime(10)

  //     expect(legacyAdaptor.isEnded()).toBe(false)
  //   })

  //   it("should update currentTime to the time value passed in", () => {
  //     setUpLegacyAdaptor()

  //     legacyAdaptor.setCurrentTime(10)

  //     expect(legacyAdaptor.getCurrentTime()).toBe(10)
  //   })

  //   describe("if the player supports playFrom()", () => {
  //     it("should seek to the time value passed in", () => {
  //       setUpLegacyAdaptor()

  //       legacyAdaptor.setCurrentTime(10)

  //       expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)
  //     })

  //     it("should seek to the time value passed in + time correction", () => {
  //       testTimeCorrection = 10
  //       setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //       legacyAdaptor.setCurrentTime(10)

  //       expect(mediaPlayer.playFrom).toHaveBeenCalledWith(20)
  //     })

  //     it("should pause after a seek if we were in a paused state, not watching dash and on a capable device", () => {
  //       setUpLegacyAdaptor()

  //       eventCallbacks({ type: MediaPlayerEvent.PAUSED })

  //       legacyAdaptor.setCurrentTime(10)

  //       expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)

  //       expect(mediaPlayer.pause).toHaveBeenCalledWith()
  //     })

  //     it("should not pause after a seek if we are not on capable device and watching a dash stream", () => {
  //       setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //       legacyAdaptor.load("application/dash+xml")

  //       eventCallbacks({ type: MediaPlayerEvent.PAUSED })

  //       legacyAdaptor.setCurrentTime(10)

  //       expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)

  //       expect(mediaPlayer.pause).not.toHaveBeenCalledWith()
  //     })
  //   })

  //   describe("if the player does not support playFrom()", () => {
  //     beforeEach(() => {
  //       delete mediaPlayer.playFrom
  //     })

  //     it("should not throw an Error", () => {
  //       setUpLegacyAdaptor()

  //       expect(() => legacyAdaptor.setCurrentTime(10)).not.toThrow()
  //     })

  //     it("should not throw an error for live", () => {
  //       testTimeCorrection = 10
  //       setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //       expect(() => legacyAdaptor.setCurrentTime(10)).not.toThrow()
  //     })

  //     it("should remain paused if we were in a paused state, not watching dash and on a capable device", () => {
  //       setUpLegacyAdaptor()

  //       eventCallbacks({ type: MediaPlayerEvent.PAUSED })

  //       legacyAdaptor.setCurrentTime(10)

  //       expect(legacyAdaptor.isPaused()).toBe(true)
  //     })

  //     it("should not pause after a no-op seek if we are not on capable device and watching a dash stream", () => {
  //       setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //       legacyAdaptor.load("application/dash+xml")

  //       eventCallbacks({ type: MediaPlayerEvent.PAUSED })

  //       legacyAdaptor.setCurrentTime(10)

  //       expect(mediaPlayer.pause).not.toHaveBeenCalledWith()
  //     })
  //   })
  // })

  // describe("Playback Rate", () => {
  //   it("calls through to the mediaPlayers setPlaybackRate function", () => {
  //     setUpLegacyAdaptor()

  //     legacyAdaptor.setPlaybackRate(2)

  //     expect(mediaPlayer.setPlaybackRate).toHaveBeenCalledWith(2)
  //   })

  //   it("calls through to the mediaPlayers getPlaybackRate function and returns correct value", () => {
  //     setUpLegacyAdaptor()
  //     mediaPlayer.getPlaybackRate.mockReturnValue(1.5)

  //     const rate = legacyAdaptor.getPlaybackRate()

  //     expect(mediaPlayer.getPlaybackRate).toHaveBeenCalledWith()
  //     expect(rate).toBe(1.5)
  //   })

  //   it("getPlaybackRate returns 1.0 if mediaPlayer does not have getPlaybackRate function", () => {
  //     mediaPlayer = {
  //       addEventCallback: jest.fn(),
  //     }
  //     setUpLegacyAdaptor()

  //     expect(legacyAdaptor.getPlaybackRate()).toBe(1)
  //   })
  // })

  describe("transitions", () => {
    it("should pass back possible transitions", () => {
      const legacyAdaptor = LegacyAdaptor(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      expect(legacyAdaptor.transitions).toEqual(
        expect.objectContaining({
          canBePaused: expect.any(Function),
          canBeStopped: expect.any(Function),
          canBeginSeek: expect.any(Function),
          canResume: expect.any(Function),
        })
      )
    })
  })

  // describe("reset", () => {
  //   it("should reset the player", () => {
  //     setUpLegacyAdaptor()

  //     legacyAdaptor.reset()

  //     expect(mediaPlayer.reset).toHaveBeenCalledWith()
  //   })

  //   it("should stop the player if we are not in an unstoppable state", () => {
  //     setUpLegacyAdaptor()

  //     legacyAdaptor.reset()

  //     expect(mediaPlayer.stop).toHaveBeenCalledWith()
  //   })

  //   it("should not stop the player if we in an unstoppable state", () => {
  //     setUpLegacyAdaptor()

  //     mediaPlayer.getState.mockReturnValue(MediaPlayerState.EMPTY)

  //     legacyAdaptor.reset()

  //     expect(mediaPlayer.stop).not.toHaveBeenCalledWith()
  //   })
  // })

  // describe("tearDown", () => {
  //   beforeEach(() => {
  //     setUpLegacyAdaptor()

  //     legacyAdaptor.tearDown()
  //   })

  //   it("should remove all event callbacks", () => {
  //     expect(mediaPlayer.removeAllEventCallbacks).toHaveBeenCalledWith()
  //   })

  //   it("should set isPaused to true", () => {
  //     expect(legacyAdaptor.isPaused()).toBe(true)
  //   })

  //   it("should return isEnded as false", () => {
  //     expect(legacyAdaptor.isEnded()).toBe(false)
  //   })
  // })

  // describe("live glitch curtain", () => {
  //   beforeEach(() => {
  //     window.bigscreenPlayer.overrides = {
  //       showLiveCurtain: true,
  //     }
  //   })

  //   it("should show curtain for a live restart and we get a seek-attempted event", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("video/mp4", 10)

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

  //     expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()
  //   })

  //   it("should show curtain for a live restart to 0 and we get a seek-attempted event", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("video/mp4", 0)

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

  //     expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()
  //   })

  //   it("should not show curtain when playing from the live point and we get a seek-attempted event", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("video/mp4")

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

  //     expect(mockGlitchCurtain.showCurtain).not.toHaveBeenCalledWith()
  //   })

  //   it("should show curtain when the forceBeginPlaybackToEndOfWindow config is set and the playback type is live", () => {
  //     window.bigscreenPlayer.overrides.forceBeginPlaybackToEndOfWindow = true

  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

  //     expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()
  //   })

  //   it("should not show curtain when the config overide is not set and we are playing live", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

  //     expect(mockGlitchCurtain.showCurtain).not.toHaveBeenCalledWith()
  //   })

  //   it("should hide the curtain when we get a seek-finished event", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("video/mp4", 0)

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

  //     expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_FINISHED })

  //     expect(mockGlitchCurtain.hideCurtain).toHaveBeenCalledWith()
  //   })

  //   it("should tear down the curtain on strategy tearDown if it has been shown", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("video/mp4", 0)

  //     eventCallbacks({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

  //     legacyAdaptor.tearDown()

  //     expect(mockGlitchCurtain.tearDown).toHaveBeenCalledWith()
  //   })
  // })

  // describe("dash live on error after exiting seek", () => {
  //   it("should have called reset on the player", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     // set up the values handleErrorOnExitingSeek && exitingSeek so they are truthy then fire an error event so we restart.
  //     legacyAdaptor.load("application/dash+xml")

  //     legacyAdaptor.setCurrentTime(10)

  //     eventCallbacks({ type: MediaPlayerEvent.ERROR })

  //     expect(mediaPlayer.reset).toHaveBeenCalledWith()
  //   })

  //   it("should initialise the player", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("application/dash+xml")

  //     legacyAdaptor.setCurrentTime(10)

  //     eventCallbacks({ type: MediaPlayerEvent.ERROR })

  //     expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith(
  //       "video",
  //       cdnArray[0].url,
  //       "application/dash+xml",
  //       playbackElement,
  //       expect.any(Object)
  //     )
  //   })

  //   it("should begin playback from the currentTime", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("application/dash+xml")

  //     legacyAdaptor.setCurrentTime(10)

  //     eventCallbacks({ type: MediaPlayerEvent.ERROR })

  //     expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(10)
  //   })

  //   it("should begin playback from the currentTime + time correction", () => {
  //     testTimeCorrection = 10
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("application/dash+xml")

  //     legacyAdaptor.setCurrentTime(10)

  //     eventCallbacks({ type: MediaPlayerEvent.ERROR })

  //     expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(20)
  //   })
  // })

  // describe("delay pause until after seek", () => {
  //   it("should pause the player if we were in a paused state on dash live", () => {
  //     setUpLegacyAdaptor({ windowType: WindowTypes.SLIDING })

  //     legacyAdaptor.load("application/dash+xml")

  //     eventCallbacks({ type: MediaPlayerEvent.PAUSED })

  //     legacyAdaptor.setCurrentTime(10)

  //     expect(mediaPlayer.pause).not.toHaveBeenCalledWith()

  //     eventCallbacks({ type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: { start: 5 } })

  //     expect(mediaPlayer.pause).toHaveBeenCalledWith()
  //   })

  //   it("should pause the player if we were in a paused state for devices with known issues", () => {
  //     window.bigscreenPlayer.overrides = {
  //       pauseOnExitSeek: true,
  //     }

  //     setUpLegacyAdaptor()

  //     legacyAdaptor.load("video/mp4")

  //     eventCallbacks({ type: MediaPlayerEvent.PAUSED })

  //     legacyAdaptor.setCurrentTime(10)

  //     expect(mediaPlayer.pause).not.toHaveBeenCalledWith()

  //     eventCallbacks({ type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: { start: 5 } })

  //     expect(mediaPlayer.pause).toHaveBeenCalledWith()
  //   })
  // })

  // describe("events", () => {
  //   it("should publish a playing event", () => {
  //     setUpLegacyAdaptor()

  //     const eventCallbackSpy = jest.fn()
  //     legacyAdaptor.addEventCallback(this, eventCallbackSpy)

  //     eventCallbacks({ type: MediaPlayerEvent.PLAYING })

  //     expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING)
  //   })

  //   it("should publish a paused event", () => {
  //     setUpLegacyAdaptor()

  //     const eventCallbackSpy = jest.fn()
  //     legacyAdaptor.addEventCallback(this, eventCallbackSpy)

  //     eventCallbacks({ type: MediaPlayerEvent.PAUSED })

  //     expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED)
  //   })

  //   it("should publish a buffering event", () => {
  //     setUpLegacyAdaptor()

  //     const eventCallbackSpy = jest.fn()
  //     legacyAdaptor.addEventCallback(this, eventCallbackSpy)

  //     eventCallbacks({ type: MediaPlayerEvent.BUFFERING })

  //     expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
  //   })

  //   it("should publish an ended event", () => {
  //     setUpLegacyAdaptor()

  //     const eventCallbackSpy = jest.fn()
  //     legacyAdaptor.addEventCallback(this, eventCallbackSpy)

  //     eventCallbacks({ type: MediaPlayerEvent.COMPLETE })

  //     expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED)
  //   })

  //   it("should publish a time update event", () => {
  //     setUpLegacyAdaptor()

  //     const timeUpdateCallbackSpy = jest.fn()
  //     legacyAdaptor.addTimeUpdateCallback(this, timeUpdateCallbackSpy)

  //     eventCallbacks({ type: MediaPlayerEvent.STATUS })

  //     expect(timeUpdateCallbackSpy).toHaveBeenCalledWith()
  //   })

  //   it("should publish an error event with default code and message if element does not emit them", () => {
  //     setUpLegacyAdaptor()

  //     const errorCallbackSpy = jest.fn()

  //     legacyAdaptor.addErrorCallback(this, errorCallbackSpy)
  //     eventCallbacks({ type: MediaPlayerEvent.ERROR })

  //     expect(errorCallbackSpy).toHaveBeenCalledWith({ code: 0, message: "unknown" })
  //   })

  //   it("should publish an error event passing through correct code and message", () => {
  //     setUpLegacyAdaptor()

  //     const errorCallbackSpy = jest.fn()

  //     legacyAdaptor.addErrorCallback(this, errorCallbackSpy)
  //     eventCallbacks({ type: MediaPlayerEvent.ERROR, code: 1, message: "This is a test error" })

  //     expect(errorCallbackSpy).toHaveBeenCalledWith({ code: 1, message: "This is a test error" })
  //   })
  // })
})
