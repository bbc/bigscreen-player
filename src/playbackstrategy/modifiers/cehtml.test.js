import CehtmlMediaPlayer from "./cehtml"
import MediaPlayerBase from "./mediaplayerbase"

describe("cehtml Base", () => {
  let player
  let mockMediaElement
  let sourceContainer

  let recentEvents

  function eventCallbackReporter(event) {
    recentEvents.push(event.type)
  }

  beforeEach(() => {
    jest.useFakeTimers()

    mockMediaElement = {
      play: jest.fn(),
      seek: jest.fn(),
      remove: jest.fn(),
      stop: jest.fn(),
    }
    mockMediaElement.style = {}
    jest.spyOn(document, "createElement").mockReturnValue(mockMediaElement)
    jest.spyOn(document, "getElementsByTagName").mockReturnValue([
      {
        insertBefore: jest.fn(),
      },
    ])

    sourceContainer = document.createElement("div")

    recentEvents = []

    player = CehtmlMediaPlayer()
    player.addEventCallback(this, eventCallbackReporter)
    player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Seek attempted and finished events", () => {
    afterEach(() => {
      delete window.bigscreenPlayer
    })

    it("Seek Attempted Event Emitted On Initialise Media If The State Is Empty", () => {
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)
    })

    it("Seek Finished Event Emitted On Status Update When Time is Within Sentinel Threshold And The State is Playing", () => {
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)

      player.beginPlaybackFrom(0)

      mockMediaElement.playState = 4 // BUFFERING
      mockMediaElement.onPlayStateChange()

      mockMediaElement.playState = 1 // PLAYING
      mockMediaElement.onPlayStateChange()

      mockMediaElement.playPosition = 0
      for (let idx = 0; idx < 6; idx++) {
        mockMediaElement.playPosition += 500
        jest.advanceTimersByTime(500)
      }

      expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
    })

    it("Seek Finished Event Is Emitted Only Once", () => {
      player.beginPlaybackFrom(0)

      mockMediaElement.playState = 4 // BUFFERING
      mockMediaElement.onPlayStateChange()

      mockMediaElement.playState = 1 // PLAYING
      mockMediaElement.onPlayStateChange()

      mockMediaElement.playPosition = 0
      for (let idx = 0; idx < 6; idx++) {
        mockMediaElement.playPosition += 500
        jest.advanceTimersByTime(500)
      }

      expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)

      recentEvents = []
      mockMediaElement.playPosition += 500
      jest.advanceTimersByTime(500)

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
    })

    it("Seek Finished Event Is Emitted After restartTimeout When Enabled", () => {
      window.bigscreenPlayer = {
        overrides: {
          restartTimeout: 10000,
        },
      }

      player = CehtmlMediaPlayer()
      player.addEventCallback(this, eventCallbackReporter)
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

      expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)

      player.beginPlaybackFrom(0)

      mockMediaElement.playState = 4 // BUFFERING
      mockMediaElement.onPlayStateChange()

      mockMediaElement.playState = 1 // PLAYING
      mockMediaElement.onPlayStateChange()

      mockMediaElement.playPosition = 0
      const numberOfLoops = 10000 / 500
      for (let idx = 0; idx < numberOfLoops - 1; idx++) {
        mockMediaElement.playPosition += 500
        jest.advanceTimersByTime(500)

        expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
      }

      mockMediaElement.playPosition += 1000
      jest.advanceTimersByTime(1000)

      expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
    })
  })

  describe("addEventCallback", () => {
    it("should call the callback on update", () => {
      const spy = jest.fn()

      player.addEventCallback(this, spy)
      player.beginPlayback()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "buffering" }))
    })
  })

  describe("removeEventCallback", () => {
    it("should remove the callback", () => {
      const spy = jest.fn()

      player.addEventCallback(this, spy)
      player.removeEventCallback(this, spy)
      player.beginPlayback()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe("removeAllEventCallbacks", () => {
    it("should remove all the callbacks", () => {
      const spy = jest.fn()

      player.addEventCallback(this, spy)
      player.removeAllEventCallbacks()
      player.beginPlayback()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe("resume", () => {
    it("should call through to play if paused", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()
      player.pause()

      mockMediaElement.play.mockClear()

      expect(mockMediaElement.play).not.toHaveBeenCalled()

      player.resume()

      expect(mockMediaElement.play).toHaveBeenCalledWith(1)
    })

    it("should do nothing if playing", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()

      mockMediaElement.play.mockClear()

      player.resume()

      expect(mockMediaElement.play).not.toHaveBeenCalled()
    })
  })

  describe("playFrom", () => {
    it("should seek to the required time", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()

      player.playFrom(10)

      expect(mockMediaElement.seek).toHaveBeenCalledWith(10000)
    })

    it("should clamp to within the seekable range", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.playTime = 10000
      mockMediaElement.onPlayStateChange()

      player.playFrom(1000000000)

      expect(mockMediaElement.seek).toHaveBeenCalledWith(8900)
    })
  })

  describe("beginPlayback", () => {
    it("should call play on the media element", () => {
      player.beginPlayback()

      expect(mockMediaElement.play).toHaveBeenCalledWith(1)
    })

    it("should not call play if playing", () => {
      player.beginPlayback()

      mockMediaElement.play.mockClear()

      player.beginPlayback()

      expect(mockMediaElement.play).not.toHaveBeenCalled()
    })
  })

  describe("beginPlaybackFrom", () => {
    it("should call play and then seek on the media element", () => {
      player.beginPlaybackFrom(10)
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()

      expect(mockMediaElement.play).toHaveBeenCalledWith(1)
      expect(mockMediaElement.seek).toHaveBeenCalledWith(10000)
    })

    it("should call play or seek if playing", () => {
      player.beginPlaybackFrom(10)
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()

      mockMediaElement.play.mockClear()
      mockMediaElement.seek.mockClear()

      player.beginPlaybackFrom(10)

      expect(mockMediaElement.play).not.toHaveBeenCalledWith()
      expect(mockMediaElement.seek).not.toHaveBeenCalledWith()
    })
  })

  describe("pause", () => {
    it("should call pause on the media element", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()

      mockMediaElement.play.mockClear()
      player.pause()

      expect(mockMediaElement.play).toHaveBeenCalledWith(0)
    })

    it("should not call pause if paused", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()

      player.pause()

      mockMediaElement.play.mockClear()
      player.pause()

      expect(mockMediaElement.play).not.toHaveBeenCalled()
    })
  })

  describe("stop", () => {
    it("should call stop on the media element", () => {
      player.beginPlayback()
      player.stop()

      expect(mockMediaElement.stop).toHaveBeenCalledWith()
    })

    it("should not call stop if playback has not started", () => {
      player.stop()

      expect(mockMediaElement.stop).not.toHaveBeenCalled()
    })

    it("should not call stop if already stopped", () => {
      player.beginPlayback()
      player.stop()

      mockMediaElement.stop.mockClear()
      player.stop()

      expect(mockMediaElement.stop).not.toHaveBeenCalled()
    })
  })

  describe("getSource", () => {
    it("should return the source", () => {
      expect(player.getSource()).toBe("testUrl")
    })
  })

  describe("getMimeType", () => {
    it("should return the mimeType", () => {
      expect(player.getMimeType()).toBe("testMimeType")
    })
  })

  describe("getSeekableRange", () => {
    it("should return the seekable range", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.playTime = 10000
      mockMediaElement.onPlayStateChange()

      expect(player.getSeekableRange()).toEqual({ start: 0, end: 10 })
    })
  })

  describe("getMediaDuration", () => {
    it("should return the media duration", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.playTime = 10000
      mockMediaElement.onPlayStateChange()

      expect(player.getMediaDuration()).toBe(10)
    })
  })

  describe("getState", () => {
    it("should return the state", () => {
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.onPlayStateChange()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })
  })

  describe("getPlayerElement", () => {
    it("should return the media element", () => {
      expect(player.getPlayerElement()).toBe(mockMediaElement)
    })
  })

  describe("getDuration", () => {
    it("should retrun the media duration for vod", () => {
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.playTime = 10000
      mockMediaElement.onPlayStateChange()

      expect(player.getDuration()).toBe(10)
    })

    it("should retrun the inifinty for live", () => {
      player.reset()
      player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, "testUrl", "testMimeType", sourceContainer, {})
      player.beginPlayback()
      mockMediaElement.playState = 1
      mockMediaElement.playTime = 10000
      mockMediaElement.onPlayStateChange()

      expect(player.getDuration()).toBe(Infinity)
    })
  })
})
