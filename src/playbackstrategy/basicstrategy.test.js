import WindowTypes from "../models/windowtypes"
import MediaKinds from "../models/mediakinds"
import MediaState from "../models/mediastate"
import BasicStrategy from "./basicstrategy"
import DynamicWindowUtils from "../dynamicwindowutils"

const autoResumeSpy = jest.spyOn(DynamicWindowUtils, "autoResumeAtStartOfRange")

describe("HTML5 Strategy", () => {
  let audioElement
  let videoElement
  let basicStrategy
  let cdnArray
  let playbackElement
  let mockMediaSources
  let testTimeCorrection

  function setUpStrategy(windowType, mediaKind) {
    const defaultWindowType = windowType || WindowTypes.STATIC
    const defaultMediaKind = mediaKind || MediaKinds.VIDEO

    basicStrategy = BasicStrategy(mockMediaSources, defaultWindowType, defaultMediaKind, playbackElement)
  }

  beforeEach(() => {
    audioElement = document.createElement("audio")
    videoElement = document.createElement("video")

    jest.spyOn(videoElement, "load").mockImplementation(() => {})
    jest.spyOn(videoElement, "pause").mockImplementation(() => {})
    jest.spyOn(videoElement, "play").mockImplementation(() => {})

    playbackElement = document.createElement("div")
    playbackElement.id = "app"
    document.body.appendChild(playbackElement)

    jest.spyOn(document, "createElement").mockImplementationOnce((type) => {
      if (type === "audio") {
        return audioElement
      } else if (type === "video") {
        return videoElement
      }
    })

    cdnArray = [
      { url: "http://testcdn1/test/", cdn: "http://testcdn1/test/" },
      { url: "http://testcdn2/test/", cdn: "http://testcdn2/test/" },
      { url: "http://testcdn3/test/", cdn: "http://testcdn3/test/" },
    ]

    mockMediaSources = {
      time: () => ({ windowStartTime: testTimeCorrection * 1000 }),
      currentSource: () => cdnArray[0].url,
    }
  })

  afterEach(() => {
    testTimeCorrection = 0
    basicStrategy.tearDown()
    videoElement = undefined
    audioElement = undefined
    autoResumeSpy.mockReset()
  })

  describe("transitions", () => {
    it("canBePaused() and canBeginSeek transitions are true", () => {
      setUpStrategy()

      expect(basicStrategy.transitions.canBePaused()).toBe(true)
      expect(basicStrategy.transitions.canBeginSeek()).toBe(true)
    })
  })

  describe("load", () => {
    it("should create a video element and add it to the playback element", () => {
      setUpStrategy(null, MediaKinds.VIDEO)

      expect(playbackElement.childElementCount).toBe(0)

      basicStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBeInstanceOf(HTMLVideoElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it("should create an audio element and add it to the playback element", () => {
      setUpStrategy(null, MediaKinds.AUDIO)

      expect(playbackElement.childElementCount).toBe(0)

      jest.spyOn(audioElement, "load").mockImplementation(() => {})

      basicStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBeInstanceOf(HTMLAudioElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it("should set the style properties correctly on the media element", () => {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)

      expect(videoElement.style.position).toBe("absolute")
      expect(videoElement.style.width).toBe("100%")
      expect(videoElement.style.height).toBe("100%")
    })

    it("should set the autoplay and preload properties correctly on the media element", () => {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)

      const videoElement = document.querySelector("video")

      expect(videoElement.autoplay).toBe(true)
      expect(videoElement.preload).toBe("auto")
    })

    it("should set the source url correctly on the media element", () => {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)

      expect(videoElement.src).toBe("http://testcdn1/test/")
    })

    it("should set the currentTime to start time if one is provided", () => {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toBe(25)
    })

    it("should not set the currentTime to start time if one is not provided", () => {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null)

      expect(videoElement.currentTime).toBe(0)
    })

    it("should call load on the media element", () => {
      setUpStrategy()

      const videoLoadSpy = jest.spyOn(videoElement, "load")
      basicStrategy.load(null)

      expect(videoLoadSpy).toHaveBeenCalled()
    })

    it("should update the media element source if load is when media element already exists", () => {
      setUpStrategy()
      basicStrategy.load(null)

      expect(videoElement.src).toBe("http://testcdn1/test/")

      mockMediaSources.currentSource = () => cdnArray[1].url

      basicStrategy.load(null)

      expect(videoElement.src).toBe("http://testcdn2/test/")
    })

    it("should update the media element currentTime if load is called with a start time when media element already exists", () => {
      setUpStrategy()
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toBe(25)

      basicStrategy.load(null, 35)

      expect(videoElement.currentTime).toBe(35)
    })

    it("should not update the media element currentTime if load is called without a start time when media element already exists", () => {
      setUpStrategy()
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toBe(25)

      basicStrategy.load(null)

      expect(videoElement.currentTime).toBe(25)
    })

    it("should set up bindings to media element events correctly", () => {
      setUpStrategy()
      const addEventListenerSpy = jest.spyOn(videoElement, "addEventListener")
      basicStrategy.load(null)

      expect(addEventListenerSpy).toHaveBeenCalledWith("timeupdate", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("playing", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("pause", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("waiting", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("seeking", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("seeked", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("ended", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith("loadedmetadata", expect.any(Function))
    })
  })

  describe("play", () => {
    it("should call through to the media elements play function", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      const playSpy = jest.spyOn(videoElement, "play")
      basicStrategy.play()

      expect(playSpy).toHaveBeenCalled()
    })
  })

  describe("pause", () => {
    it("should call through to the media elements pause function", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      const pauseSpy = jest.spyOn(videoElement, "pause")
      basicStrategy.pause()

      expect(pauseSpy).toHaveBeenCalled()
    })

    it("should start autoresume timeout if sliding window", () => {
      setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)
      basicStrategy.pause()

      expect(autoResumeSpy).toHaveBeenCalledTimes(1)
      expect(autoResumeSpy).toHaveBeenCalledWith(
        0,
        { start: 0, end: 0 },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        basicStrategy.play
      )
    })

    it("should not start autoresume timeout if sliding window but disableAutoResume is set", () => {
      const opts = {
        disableAutoResume: true,
      }

      setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)
      basicStrategy.pause(opts)

      expect(autoResumeSpy).not.toHaveBeenCalled()
    })
  })

  describe("getSeekableRange", () => {
    beforeEach(() => {
      jest.spyOn(videoElement, "seekable", "get").mockImplementation(() => ({
        start: (index) => {
          if (index === 0) {
            return 25
          }
        },
        end: (index) => {
          if (index === 0) {
            return 100
          }
        },
        length: 2,
      }))
    })

    it("returns the correct start and end time before load has been called", () => {
      setUpStrategy()

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 })
    })

    it("returns the correct start and end time before meta data has loaded", () => {
      setUpStrategy()
      basicStrategy.load(null)

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 })
    })

    it("returns the correct start and end time once meta data has loaded", () => {
      setUpStrategy()
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 25, end: 100 })
    })

    it("returns the correct start and end time minus any time correction", () => {
      testTimeCorrection = 20
      setUpStrategy()
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 5, end: 80 })
    })
  })

  describe("getDuration", () => {
    beforeEach(() => {
      jest.spyOn(videoElement, "duration", "get").mockReturnValue(100)
    })

    it("returns duration of zero before load has been called", () => {
      setUpStrategy()

      expect(basicStrategy.getDuration()).toBe(0)
    })

    it("returns duration of zero before meta data has loaded", () => {
      setUpStrategy()
      basicStrategy.load(null)

      expect(basicStrategy.getDuration()).toBe(0)
    })

    it("returns the correct duration once meta data has loaded", () => {
      setUpStrategy()
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      expect(basicStrategy.getDuration()).toBe(100)
    })
  })

  describe("getCurrentTime", () => {
    beforeEach(() => {
      videoElement.currentTime = 5
    })

    it("returns currentTime of zero before load has been called", () => {
      setUpStrategy()

      expect(basicStrategy.getCurrentTime()).toBe(0)
    })

    it("returns the correct currentTime once load has been called", () => {
      setUpStrategy()
      basicStrategy.load(null)

      expect(basicStrategy.getCurrentTime()).toBe(5)

      videoElement.currentTime = 10

      expect(basicStrategy.getCurrentTime()).toBe(10)
    })

    it("subtracts any time correction from the media elements current time", () => {
      testTimeCorrection = 20
      setUpStrategy()
      basicStrategy.load(null)

      videoElement.currentTime = 50

      expect(basicStrategy.getCurrentTime()).toBe(30)
    })
  })

  describe("setCurrentTime", () => {
    const clampOffset = 1.1
    const seekableRange = {
      start: 0,
      end: 100,
    }

    beforeEach(() => {
      jest.spyOn(videoElement, "seekable", "get").mockImplementation(() => ({
        start: () => seekableRange.start,
        end: () => seekableRange.end,
        length: 2,
      }))
    })

    it("sets the current time on the media element to that passed in", () => {
      setUpStrategy()
      basicStrategy.load(null)

      basicStrategy.setCurrentTime(10)

      expect(basicStrategy.getCurrentTime()).toBe(10)
    })

    it("adds time correction from the media source onto the passed in seek time", () => {
      testTimeCorrection = 20
      setUpStrategy()
      basicStrategy.load(null)

      basicStrategy.setCurrentTime(50)

      expect(videoElement.currentTime).toBe(70)
    })

    it("does not attempt to clamp time if meta data is not loaded", () => {
      setUpStrategy()
      basicStrategy.load(null)

      // this is greater than expected seekable range. although range does not exist until meta data loaded
      basicStrategy.setCurrentTime(110)

      expect(videoElement.currentTime).toBe(110)
    })

    it("clamps to 1.1 seconds before seekable range end when seeking to end", () => {
      setUpStrategy()
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.end)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it("clamps to 1.1 seconds before seekable range end when seeking past end", () => {
      setUpStrategy()
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.end + 10)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it("clamps to 1.1 seconds before seekable range end when seeking prior to end", () => {
      setUpStrategy()
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.end - 1)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it("clamps to the start of seekable range when seeking before start of range", () => {
      setUpStrategy()
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.start - 10)

      expect(videoElement.currentTime).toEqual(seekableRange.start)
    })
  })

  describe("Playback Rate", () => {
    it("sets the playback rate on the media element", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      basicStrategy.setPlaybackRate(2)

      expect(videoElement.playbackRate).toBe(2)
    })

    it("gets the playback rate on the media element", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      const testRate = 1.5
      basicStrategy.setPlaybackRate(testRate)

      const rate = basicStrategy.getPlaybackRate()

      expect(rate).toEqual(testRate)
    })
  })

  describe("isPaused", () => {
    it("should return false when the media element is not paused", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(false)

      expect(basicStrategy.isPaused()).toBe(false)
    })

    it("should return true when the media element is paused", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(true)

      expect(basicStrategy.isPaused()).toBe(true)
    })
  })

  describe("isEnded", () => {
    it("should return false when the media element is not ended", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "ended", "get").mockReturnValueOnce(false)

      expect(basicStrategy.isEnded()).toBe(false)
    })

    it("should return true when the media element is ended", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "ended", "get").mockReturnValueOnce(true)

      expect(basicStrategy.isEnded()).toBe(true)
    })
  })

  describe("tearDown", () => {
    it("should remove all event listener bindings", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)

      const removeEventListenerSpy = jest.spyOn(videoElement, "removeEventListener")

      basicStrategy.tearDown()

      expect(removeEventListenerSpy).toHaveBeenCalledWith("playing", expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith("pause", expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith("waiting", expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith("seeking", expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith("seeked", expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith("ended", expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith("loadedmetadata", expect.any(Function))
    })

    it("should remove the video element", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)

      expect(playbackElement.childElementCount).toBe(1)

      basicStrategy.tearDown()

      expect(playbackElement.childElementCount).toBe(0)
    })

    it("should empty the eventCallbacks", () => {
      setUpStrategy()

      function tearDownAndError() {
        // add event callback to prove array is emptied in tearDown
        basicStrategy.addEventCallback(() => {})
        basicStrategy.load(null, 0)
        basicStrategy.tearDown()
        videoElement.dispatchEvent(new Event("pause"))
      }

      expect(tearDownAndError).not.toThrow()
    })

    it("should undefine the error callback", () => {
      const errorCallbackSpy = jest.fn()

      setUpStrategy()
      basicStrategy.addErrorCallback(this, errorCallbackSpy)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()
      videoElement.dispatchEvent(new Event("error"))

      expect(errorCallbackSpy).not.toHaveBeenCalled()
    })

    it("should undefine the timeupdate callback", () => {
      const timeUpdateCallbackSpy = jest.fn()

      setUpStrategy()
      basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()
      videoElement.dispatchEvent(new Event("timeupdate"))

      expect(timeUpdateCallbackSpy).not.toHaveBeenCalled()
    })

    it("should undefine the mediaPlayer element", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()

      expect(basicStrategy.getPlayerElement()).toBeUndefined()
    })
  })

  describe("getPlayerElement", () => {
    it("should return the mediaPlayer element", () => {
      setUpStrategy()
      basicStrategy.load(null, 0)

      expect(basicStrategy.getPlayerElement()).toEqual(videoElement)
    })
  })

  describe("events", () => {
    let eventCallbackSpy
    let timeUpdateCallbackSpy
    let errorCallbackSpy

    beforeEach(() => {
      setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO)
      basicStrategy.load(null, 25)

      eventCallbackSpy = jest.fn()
      basicStrategy.addEventCallback(this, eventCallbackSpy)

      timeUpdateCallbackSpy = jest.fn()
      basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy)

      errorCallbackSpy = jest.fn()
      basicStrategy.addErrorCallback(this, errorCallbackSpy)
    })

    it("should publish a state change to PLAYING on playing event", () => {
      videoElement.dispatchEvent(new Event("playing"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to PAUSED on pause event", () => {
      videoElement.dispatchEvent(new Event("pause"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to WAITING on seeking event", () => {
      videoElement.dispatchEvent(new Event("seeking"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to WAITING on waiting event", () => {
      videoElement.dispatchEvent(new Event("waiting"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to ENDED on ended event", () => {
      videoElement.dispatchEvent(new Event("ended"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should start auto-resume timeout on seeked event if media element is paused and SLIDING window", () => {
      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(true)
      videoElement.dispatchEvent(new Event("seeked"))

      expect(autoResumeSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a time update event on time update", () => {
      videoElement.dispatchEvent(new Event("timeupdate"))

      expect(timeUpdateCallbackSpy).toHaveBeenCalled()
      expect(timeUpdateCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a error event with code and message on error", () => {
      videoElement.dispatchEvent(new Event("error"))

      // cannot fully test that the MediaError is used as JSDOM cannot set error on the video element
      expect(errorCallbackSpy).toHaveBeenCalledWith({ code: 0, message: "unknown" })
      expect(errorCallbackSpy).toHaveBeenCalledTimes(1)
    })
  })
})
