import { LiveSupport } from "../models/livesupport"
import { ManifestType } from "../models/manifesttypes"
import MediaState from "../models/mediastate"
import LegacyAdapter from "./legacyplayeradapter"
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
  time: jest.fn(),
  currentSource: jest.fn().mockReturnValue(""),
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
  let mediaElement
  let playbackElement

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

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", 0)

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

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(0)
    })

    it("should begin playback from the passed in start time for a static stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", 50)

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(50)
    })

    it.each([LiveSupport.PLAYABLE, LiveSupport.RESTARTABLE, LiveSupport.SEEKABLE])(
      "should begin playback at the live point for a dynamic stream on a %s device",
      (liveSupport) => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(liveSupport)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("video/mp4", null)

        expect(mediaPlayer.beginPlayback).toHaveBeenCalledTimes(1)
      }
    )

    it("should ignore start time and begin playback at the live point for a dynamic stream on a playable device", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", 50)

      expect(mediaPlayer.beginPlayback).toHaveBeenCalledTimes(1)
    })

    it.each([LiveSupport.RESTARTABLE, LiveSupport.SEEKABLE])(
      "should begin playback from the start time for a dynamic stream on a %s device",
      (liveSupport) => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(liveSupport)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("video/mp4", 50)

        expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(50)
      }
    )

    it.each([LiveSupport.RESTARTABLE, LiveSupport.SEEKABLE])(
      "should begin playback from the start time for a dynamic stream on a %s device when start time is zero",
      (liveSupport) => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(liveSupport)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("video/mp4", 0)

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

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, isUHD, mediaPlayer)

      legacyAdapter.load("video/mp4")

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

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4")

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

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("video/mp4", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

        legacyAdapter.play()

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(0)
      })

      it.each([ManifestType.STATIC, ManifestType.DYNAMIC])(
        "should play from the current time for a %s stream when we are not ended, paused or buffering",
        (manifestType) => {
          mockMediaSources.time.mockReturnValueOnce({ manifestType })

          const mediaPlayer = createMockMediaPlayer()

          const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

          legacyAdapter.load("video/mp4", null)

          mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS, currentTime: 10 })

          legacyAdapter.play()

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)
        }
      )
    })

    describe("when the player does not support playFrom()", () => {
      it("should not throw an error when playback has completed", () => {
        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("video/mp4", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

        expect(() => legacyAdapter.play()).not.toThrow()
      })

      it("should not throw an error if we are not ended or in a state where player can resume", () => {
        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("video/mp4", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS, currentTime: 10 })

        expect(() => legacyAdapter.play()).not.toThrow()
      })
    })

    describe("player resume support", () => {
      it("should resume when in a state where player can resume", () => {
        const mediaPlayer = createMockMediaPlayer()

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        mediaPlayer.getState.mockReturnValue(MediaPlayerState.PAUSED)

        legacyAdapter.play()

        expect(mediaPlayer.resume).toHaveBeenCalledWith()
      })

      it("should not throw when the player does not support resume", () => {
        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        mediaPlayer.getState.mockReturnValue(MediaPlayerState.PAUSED)

        expect(() => legacyAdapter.play()).not.toThrow()
      })
    })
  })

  describe("pause", () => {
    it("should pause when we don't need to delay a call to pause", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.pause()

      expect(mediaPlayer.pause).toHaveBeenCalledTimes(1)
    })

    it("should not pause when we need to delay a call to pause", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/dash+xml", null)

      // seeking
      legacyAdapter.setCurrentTime(10)
      mediaPlayer.getState.mockReturnValue(MediaPlayerState.BUFFERING)

      legacyAdapter.pause()

      expect(mediaPlayer.pause).not.toHaveBeenCalled()
    })
  })

  describe("isPaused", () => {
    it("should be set to true on initialisation", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      expect(legacyAdapter.isPaused()).toBeUndefined()
    })

    it("should be set to false once we have loaded", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdapter.load("video/mp4", null)

      expect(legacyAdapter.isPaused()).toBe(false)
    })

    it("should be set to false when we call play", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdapter.load("video/mp4", null)

      legacyAdapter.play()

      expect(legacyAdapter.isPaused()).toBe(false)
    })

    it("should be set to false when we get a playing event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING })

      expect(legacyAdapter.isPaused()).toBe(false)
    })

    it("should be set to false when we get a time update event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS })

      expect(legacyAdapter.isPaused()).toBe(false)
    })

    it("should be set to true when we get a paused event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

      expect(legacyAdapter.isPaused()).toBe(true)
    })

    it("should be set to true when we get a ended event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

      expect(legacyAdapter.isPaused()).toBe(true)
    })
  })

  describe("isEnded", () => {
    it("should be set to false on initialisation of the strategy", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      expect(legacyAdapter.isEnded()).toBe(false)
    })

    it("should be set to true when we get an ended event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

      expect(legacyAdapter.isEnded()).toBe(true)
    })

    it("should be set to false when we a playing event is recieved", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING })

      expect(legacyAdapter.isEnded()).toBe(false)
    })

    it("should be set to false when we get a waiting event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.BUFFERING })

      expect(legacyAdapter.isEnded()).toBe(false)
    })

    it("should be set to true when we get a completed event then false when we start initial buffering from playing", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

      expect(legacyAdapter.isEnded()).toBe(true)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.BUFFERING })

      expect(legacyAdapter.isEnded()).toBe(false)
    })
  })

  describe("getDuration", () => {
    it("should be set to 0 on initialisation", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      expect(legacyAdapter.getDuration()).toBe(0)
    })

    it("should be updated by the playing event duration when the duration is undefined or 0", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING, duration: 10 })

      expect(legacyAdapter.getDuration()).toBe(10)
    })

    it("should use the local duration when the value is not undefined or 0", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING, duration: 10 })

      expect(legacyAdapter.getDuration()).toBe(10)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING, duration: 20 })

      expect(legacyAdapter.getDuration()).toBe(10)
    })
  })

  describe("getPlayerElement", () => {
    it("should return the mediaPlayer element", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      const videoElement = document.createElement("video")

      mediaPlayer.getPlayerElement.mockReturnValue(videoElement)

      expect(legacyAdapter.getPlayerElement()).toEqual(videoElement)
    })
  })

  describe("getSeekableRange", () => {
    it("should return the start as 0 and the end as the duration for a static stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING, duration: 10 })

      expect(legacyAdapter.getSeekableRange()).toEqual({ start: 0, end: 10 })
    })

    it("should return the start/end from the player for a dynamic stream on a seekable device", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer(LiveSupport.SEEKABLE)

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.getSeekableRange.mockReturnValue({ start: 100, end: 200 })

      expect(legacyAdapter.getSeekableRange()).toEqual({ start: 100, end: 200 })
    })

    it.each([LiveSupport.PLAYABLE, LiveSupport.RESTARTABLE])(
      "should return null for a dynamic stream on a %s device",
      (liveSupport) => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(liveSupport)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("video/mp4", null)

        expect(legacyAdapter.getSeekableRange()).toBeNull()
      }
    )
  })

  describe("getCurrentTime", () => {
    it("should be undefined on initialisation", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      expect(legacyAdapter.getCurrentTime()).toBeUndefined()
    })

    it("should be set when we get a playing event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PLAYING, currentTime: 10 })

      expect(legacyAdapter.getCurrentTime()).toBe(10)
    })

    it("should be set when we get a time update event", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS, currentTime: 10 })

      expect(legacyAdapter.getCurrentTime()).toBe(10)
    })
  })

  describe("setCurrentTime", () => {
    it("should update currentTime to the time value passed in", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdapter.setCurrentTime(10)

      expect(legacyAdapter.getCurrentTime()).toBe(10)
    })

    it("should set isEnded to false", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.COMPLETE })

      legacyAdapter.setCurrentTime(10)

      expect(legacyAdapter.isEnded()).toBe(false)
    })

    describe("if the player supports playFrom()", () => {
      it.each([ManifestType.STATIC, ManifestType.DYNAMIC])(
        "should seek to the time value passed in for a %s stream",
        (manifestType) => {
          mockMediaSources.time.mockReturnValueOnce({ manifestType })

          const mediaPlayer = createMockMediaPlayer()

          const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

          legacyAdapter.setCurrentTime(10)

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)
        }
      )

      it("should pause after a seek if we were in a paused state", () => {
        const mediaPlayer = createMockMediaPlayer()

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("application/vnd.apple.mpegurl", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

        legacyAdapter.setCurrentTime(10)

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)

        expect(mediaPlayer.pause).toHaveBeenCalledWith()
      })

      it("should not pause after a seek if we were in a paused state on a dynamic DASH stream", () => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer()

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("application/dash+xml", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

        legacyAdapter.setCurrentTime(10)

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)

        expect(mediaPlayer.pause).not.toHaveBeenCalled()
      })

      it("should attempt to restart playback from seek time when a seek exits with an error on a dynamic DASH stream", () => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer()
        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        // any dynamic DASH (based on mime type) stream will have handleErrorOnExitingSeek as true when instantiating this module,
        // handleErrorOnExitingSeek true will cause exitingSeek to be true on a call to setCurrentTime
        legacyAdapter.load("application/dash+xml", null)
        legacyAdapter.setCurrentTime(10)

        mediaPlayer.getSource.mockReturnValueOnce("mock://media.src/")
        mediaPlayer.getMimeType.mockReturnValueOnce("application/dash+xml")

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.ERROR })

        expect(mediaPlayer.reset).toHaveBeenCalled()
        expect(mediaPlayer.initialiseMedia).toHaveBeenNthCalledWith(
          2,
          "video",
          "mock://media.src/",
          "application/dash+xml",
          playbackElement,
          {
            disableSeekSentinel: false,
            disableSentinels: false,
          }
        )
        expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(10)
      })
    })

    describe("if the player does not support playFrom()", () => {
      it.each([ManifestType.STATIC, ManifestType.DYNAMIC])(
        "should not throw an error for a %s stream",
        (manifestType) => {
          mockMediaSources.time.mockReturnValueOnce({ manifestType })

          const legacyAdapter = LegacyAdapter(
            mockMediaSources,
            playbackElement,
            false,
            createMockMediaPlayer(LiveSupport.PLAYABLE)
          )

          expect(() => legacyAdapter.setCurrentTime(10)).not.toThrow()
        }
      )

      it("should remain paused if we were in a paused state", () => {
        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("application/vnd.apple.mpegurl", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

        legacyAdapter.setCurrentTime(10)

        expect(legacyAdapter.isPaused()).toBe(true)
      })

      it("should remain paused after a seek no-op if we were in a paused state on a dynamic DASH stream", () => {
        mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

        const mediaPlayer = createMockMediaPlayer(LiveSupport.PLAYABLE)

        const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

        legacyAdapter.load("application/dash+xml", null)

        mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

        legacyAdapter.setCurrentTime(10)

        expect(legacyAdapter.isPaused()).toBe(true)
      })
    })
  })

  describe("Playback Rate", () => {
    function createMockOnDemandPlayer() {
      return { ...createMockMediaPlayer(LiveSupport.SEEKABLE), getPlaybackRate: jest.fn(), setPlaybackRate: jest.fn() }
    }

    it("calls through to the mediaPlayers setPlaybackRate function", () => {
      const mediaPlayer = createMockOnDemandPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.setPlaybackRate(2)

      expect(mediaPlayer.setPlaybackRate).toHaveBeenCalledWith(2)
    })

    it("calls through to the mediaPlayers getPlaybackRate function and returns correct value", () => {
      const mediaPlayer = createMockOnDemandPlayer()

      mediaPlayer.getPlaybackRate.mockReturnValue(1.5)

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      expect(legacyAdapter.getPlaybackRate()).toBe(1.5)
      expect(mediaPlayer.getPlaybackRate).toHaveBeenCalled()
    })

    it("getPlaybackRate returns 1.0 if mediaPlayer does not have getPlaybackRate function", () => {
      const legacyAdapter = LegacyAdapter(
        mockMediaSources,
        playbackElement,
        false,
        createMockMediaPlayer(LiveSupport.PLAYABLE)
      )

      expect(legacyAdapter.getPlaybackRate()).toBe(1)
    })
  })

  describe("transitions", () => {
    it("should pass back possible transitions", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      expect(legacyAdapter.transitions).toEqual(
        expect.objectContaining({
          canBePaused: expect.any(Function),
          canBeStopped: expect.any(Function),
          canBeginSeek: expect.any(Function),
          canResume: expect.any(Function),
        })
      )
    })
  })

  describe("reset", () => {
    it("should reset the player", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.reset()

      expect(mediaPlayer.reset).toHaveBeenCalledWith()
    })

    it("should stop the player if we are not in an unstoppable state", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.reset()

      expect(mediaPlayer.stop).toHaveBeenCalledWith()
    })

    it("should not stop the player if we in an unstoppable state", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      mediaPlayer.getState.mockReturnValue(MediaPlayerState.EMPTY)

      legacyAdapter.reset()

      expect(mediaPlayer.stop).not.toHaveBeenCalledWith()
    })
  })

  describe("tearDown", () => {
    it("should remove all event callbacks", () => {
      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.tearDown()

      expect(mediaPlayer.removeAllEventCallbacks).toHaveBeenCalledWith()
    })

    it("should set isPaused to true", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdapter.tearDown()

      expect(legacyAdapter.isPaused()).toBe(true)
    })

    it("should return isEnded as false", () => {
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, createMockMediaPlayer())

      legacyAdapter.tearDown()

      expect(legacyAdapter.isEnded()).toBe(false)
    })
  })

  describe("live glitch curtain", () => {
    beforeEach(() => {
      window.bigscreenPlayer.overrides = {
        showLiveCurtain: true,
      }
    })

    it("should show curtain for a live restart and we get a seek-attempted event", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/vnd.apple.mpegurl", 10)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalled()
    })

    it("should show curtain for a live restart to 0 and we get a seek-attempted event", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/vnd.apple.mpegurl", 0)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalled()
    })

    it("should not show curtain when playing from the live point and we get a seek-attempted event", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/vnd.apple.mpegurl", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

      expect(mockGlitchCurtain.showCurtain).not.toHaveBeenCalled()
    })

    it("should show curtain when the forceBeginPlaybackToEndOfWindow config is set and the playback type is live", () => {
      window.bigscreenPlayer.overrides.forceBeginPlaybackToEndOfWindow = true

      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/vnd.apple.mpegurl", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalled()
    })

    it("should not show curtain when the config overide is not set and we are playing live", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/vnd.apple.mpegurl", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

      expect(mockGlitchCurtain.showCurtain).not.toHaveBeenCalledWith()
    })

    it("should hide the curtain when we get a seek-finished event", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/vnd.apple.mpegurl", 0)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalled()

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_FINISHED })

      expect(mockGlitchCurtain.hideCurtain).toHaveBeenCalled()
    })

    it("should tear down the curtain on strategy tearDown if it has been shown", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()

      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/vnd.apple.mpegurl", 0)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.SEEK_ATTEMPTED })

      legacyAdapter.tearDown()

      expect(mockGlitchCurtain.tearDown).toHaveBeenCalled()
    })
  })

  describe("handling delaying pause until after a successful seek", () => {
    it("should pause the player if we were in a paused state on a dynamic DASH stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const mediaPlayer = createMockMediaPlayer()
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("application/dash+xml", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

      legacyAdapter.setCurrentTime(10)

      expect(mediaPlayer.pause).not.toHaveBeenCalledWith()

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: { start: 5 } })

      expect(mediaPlayer.pause).toHaveBeenCalledWith()
    })

    it("should pause the player if we were in a paused state for devices with known issues", () => {
      window.bigscreenPlayer.overrides = {
        pauseOnExitSeek: true,
      }

      const mediaPlayer = createMockMediaPlayer()
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      legacyAdapter.load("video/mp4", null)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.PAUSED })

      legacyAdapter.setCurrentTime(10)

      expect(mediaPlayer.pause).not.toHaveBeenCalledWith()

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: { start: 5 } })

      expect(mediaPlayer.pause).toHaveBeenCalledWith()
    })
  })

  describe("responding to media player events", () => {
    it.each([
      [MediaState.PLAYING, MediaPlayerEvent.PLAYING],
      [MediaState.PAUSED, MediaPlayerEvent.PAUSED],
      [MediaState.WAITING, MediaPlayerEvent.BUFFERING],
      [MediaState.ENDED, MediaPlayerEvent.COMPLETE],
    ])("should report media state %i for a %s event", (expectedMediaState, eventType) => {
      const mediaPlayer = createMockMediaPlayer()
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      const onEvent = jest.fn()
      legacyAdapter.addEventCallback(this, onEvent)

      mediaPlayer.dispatchEvent({ type: eventType })

      expect(onEvent).toHaveBeenCalledWith(expectedMediaState)
    })

    it("should report a time update event for a Media Player STATUS event", () => {
      const mediaPlayer = createMockMediaPlayer()
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      const onTimeUpdate = jest.fn()
      legacyAdapter.addTimeUpdateCallback(this, onTimeUpdate)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.STATUS })

      expect(onTimeUpdate).toHaveBeenCalled()
    })

    it("should report an error event with default code and message if element does not emit them", () => {
      const mediaPlayer = createMockMediaPlayer()
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      const onError = jest.fn()
      legacyAdapter.addErrorCallback(this, onError)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.ERROR })

      expect(onError).toHaveBeenCalledWith({ code: 0, message: "unknown" })
    })

    it("should report an error event passing through correct code and message", () => {
      const mediaPlayer = createMockMediaPlayer()
      const legacyAdapter = LegacyAdapter(mockMediaSources, playbackElement, false, mediaPlayer)

      const onError = jest.fn()
      legacyAdapter.addErrorCallback(this, onError)

      mediaPlayer.dispatchEvent({ type: MediaPlayerEvent.ERROR, code: 1, message: "This is a test error" })

      expect(onError).toHaveBeenCalledWith({ code: 1, message: "This is a test error" })
    })
  })
})
