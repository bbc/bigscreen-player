import { ManifestType } from "../models/manifesttypes"
import MediaKinds from "../models/mediakinds"
import MediaState from "../models/mediastate"
import TimeShiftDetector from "../utils/timeshiftdetector"
import BasicStrategy from "./basicstrategy"
import DynamicWindowUtils from "../dynamicwindowutils"

jest.mock("../utils/timeshiftdetector")

const mockTimeShiftDetector = {
  disconnect: jest.fn(),
  isSeekableRangeSliding: jest.fn(),
  observe: jest.fn(),
  // Mock function to fake time shift detection
  triggerTimeShiftDetected: jest.fn(),
}

const mockMediaSources = {
  time: jest.fn(),
  currentSource: jest.fn().mockReturnValue(""),
  availableSources: jest.fn().mockReturnValue([]),
}

describe("HTML5 Strategy", () => {
  let playbackElement
  let audioElement
  let videoElement
  let cdnArray

  beforeAll(() => {
    jest.spyOn(DynamicWindowUtils, "autoResumeAtStartOfRange")

    TimeShiftDetector.mockImplementation((onceTimeShiftDetected) => {
      mockTimeShiftDetector.triggerTimeShiftDetected.mockImplementation(() => onceTimeShiftDetected())

      return mockTimeShiftDetector
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    audioElement = document.createElement("audio")
    videoElement = document.createElement("video")

    jest.spyOn(videoElement, "pause").mockImplementation(() => {})
    jest.spyOn(videoElement, "play").mockImplementation(() => {})
    jest.spyOn(videoElement, "load").mockImplementation(() => {})
    // jest.spyOn(audioElement, "load").mockImplementation(() => {})

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

    mockMediaSources.currentSource.mockReturnValue(cdnArray[0].url)

    mockMediaSources.time.mockReturnValue({
      manifestType: ManifestType.STATIC,
      presentationTimeOffsetInMilliseconds: 0,
      availabilityStartTimeInMilliseconds: 0,
      timeShiftBufferDepthInMilliseconds: 0,
    })
  })

  afterEach(() => {
    videoElement = undefined
    audioElement = undefined
  })

  describe("transitions", () => {
    it("canBePaused() and canBeginSeek transitions are true", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(basicStrategy.transitions.canBePaused()).toBe(true)
      expect(basicStrategy.transitions.canBeginSeek()).toBe(true)
    })
  })

  describe("load", () => {
    it("should create a video element and add it to the playback element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(playbackElement.childElementCount).toBe(0)

      basicStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBeInstanceOf(HTMLVideoElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it("should create an audio element and add it to the playback element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.AUDIO, playbackElement)

      expect(playbackElement.childElementCount).toBe(0)

      jest.spyOn(audioElement, "load").mockImplementation(() => {})

      basicStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBeInstanceOf(HTMLAudioElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it("should set the style properties correctly on the media element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)

      expect(videoElement.style.position).toBe("absolute")
      expect(videoElement.style.width).toBe("100%")
      expect(videoElement.style.height).toBe("100%")
    })

    it("should set the autoplay and preload properties correctly on the media element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)

      const videoElement = document.querySelector("video")

      expect(videoElement.autoplay).toBe(true)
      expect(videoElement.preload).toBe("auto")
    })

    it("should set the source url correctly on the media element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)

      expect(videoElement.src).toBe("http://testcdn1/test/")
    })

    it("should set the currentTime to start time if one is provided", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toBe(25)
    })

    it("should not set the currentTime to start time if one is not provided", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)

      expect(videoElement.currentTime).toBe(0)
    })

    it("should call load on the media element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const videoLoadSpy = jest.spyOn(videoElement, "load")
      basicStrategy.load(null)

      expect(videoLoadSpy).toHaveBeenCalled()
    })

    it("should update the media element source if load is when media element already exists", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)

      expect(videoElement.src).toBe("http://testcdn1/test/")

      mockMediaSources.currentSource.mockReturnValueOnce(cdnArray[1].url)

      basicStrategy.load(null)

      expect(videoElement.src).toBe("http://testcdn2/test/")
    })

    it("should update the media element currentTime if load is called with a start time when media element already exists", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toBe(25)

      basicStrategy.load(null, 35)

      expect(videoElement.currentTime).toBe(35)
    })

    it("should not update the media element currentTime if load is called without a start time when media element already exists", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toBe(25)

      basicStrategy.load(null)

      expect(videoElement.currentTime).toBe(25)
    })

    it("should set up bindings to media element events correctly", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
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

    it("should provide the seekable range to the time shift detector for any dynamic stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      basicStrategy.load(null)

      expect(mockTimeShiftDetector.observe).toHaveBeenCalledWith(basicStrategy.getSeekableRange)
    })

    it("should not provide the seekable range to the time shift detector for a static stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      basicStrategy.load(null)

      expect(mockTimeShiftDetector.observe).not.toHaveBeenCalled()
    })

    it("should provide the seekable range to the time shift detector again on a reload", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      basicStrategy.load(null)

      expect(mockTimeShiftDetector.observe).toHaveBeenCalledTimes(1)

      basicStrategy.load(null)

      expect(mockTimeShiftDetector.observe).toHaveBeenCalledTimes(2)
    })
  })

  describe("play", () => {
    it("should call through to the media elements play function", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      const playSpy = jest.spyOn(videoElement, "play")
      basicStrategy.play()

      expect(playSpy).toHaveBeenCalled()
    })
  })

  describe("pause", () => {
    it("should call through to the media elements pause function", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      const pauseSpy = jest.spyOn(videoElement, "pause")
      basicStrategy.pause()

      expect(pauseSpy).toHaveBeenCalled()
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
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 })
    })

    it("returns the correct start and end time before meta data has loaded", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 })
    })

    it("returns the correct start and end time once meta data has loaded", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 25, end: 100 })
    })
  })

  describe("getDuration", () => {
    beforeEach(() => {
      jest.spyOn(videoElement, "duration", "get").mockReturnValue(100)
    })

    it("returns duration of zero before load has been called", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(basicStrategy.getDuration()).toBe(0)
    })

    it("returns duration of zero before meta data has loaded", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)

      expect(basicStrategy.getDuration()).toBe(0)
    })

    it("returns the correct duration once meta data has loaded", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
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
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      expect(basicStrategy.getCurrentTime()).toBe(0)
    })

    it("returns the correct currentTime once load has been called", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)

      expect(basicStrategy.getCurrentTime()).toBe(5)

      videoElement.currentTime = 10

      expect(basicStrategy.getCurrentTime()).toBe(10)
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
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)

      basicStrategy.setCurrentTime(10)

      expect(basicStrategy.getCurrentTime()).toBe(10)
    })

    it("does not attempt to clamp time if meta data is not loaded", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)

      // this is greater than expected seekable range. although range does not exist until meta data loaded
      basicStrategy.setCurrentTime(110)

      expect(videoElement.currentTime).toBe(110)
    })

    it("clamps to 1.1 seconds before seekable range end when seeking to end", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.end)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it("clamps to 1.1 seconds before seekable range end when seeking past end", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.end + 10)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it("clamps to 1.1 seconds before seekable range end when seeking prior to end", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.end - 1)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it("clamps to the start of seekable range when seeking before start of range", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null)
      videoElement.dispatchEvent(new Event("loadedmetadata"))

      basicStrategy.setCurrentTime(seekableRange.start - 10)

      expect(videoElement.currentTime).toEqual(seekableRange.start)
    })
  })

  describe("Playback Rate", () => {
    it("sets the playback rate on the media element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      basicStrategy.setPlaybackRate(2)

      expect(videoElement.playbackRate).toBe(2)
    })

    it("gets the playback rate on the media element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      const testRate = 1.5
      basicStrategy.setPlaybackRate(testRate)

      const rate = basicStrategy.getPlaybackRate()

      expect(rate).toEqual(testRate)
    })
  })

  describe("isPaused", () => {
    it("should return false when the media element is not paused", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(false)

      expect(basicStrategy.isPaused()).toBe(false)
    })

    it("should return true when the media element is paused", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(true)

      expect(basicStrategy.isPaused()).toBe(true)
    })
  })

  describe("isEnded", () => {
    it("should return false when the media element is not ended", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "ended", "get").mockReturnValueOnce(false)

      expect(basicStrategy.isEnded()).toBe(false)
    })

    it("should return true when the media element is ended", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, "ended", "get").mockReturnValueOnce(true)

      expect(basicStrategy.isEnded()).toBe(true)
    })
  })

  describe("tearDown", () => {
    it("should remove all event listener bindings", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
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
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)

      expect(playbackElement.childElementCount).toBe(1)

      basicStrategy.tearDown()

      expect(playbackElement.childElementCount).toBe(0)
    })

    it("should empty the eventCallbacks", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

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

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.addErrorCallback(this, errorCallbackSpy)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()
      videoElement.dispatchEvent(new Event("error"))

      expect(errorCallbackSpy).not.toHaveBeenCalled()
    })

    it("should undefine the timeupdate callback", () => {
      const timeUpdateCallbackSpy = jest.fn()

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()
      videoElement.dispatchEvent(new Event("timeupdate"))

      expect(timeUpdateCallbackSpy).not.toHaveBeenCalled()
    })

    it("should undefine the mediaPlayer element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()

      expect(basicStrategy.getPlayerElement()).toBeUndefined()
    })

    it("should disconnect the time shift detector", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()

      expect(mockTimeShiftDetector.disconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe("getPlayerElement", () => {
    it("should return the mediaPlayer element", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)

      expect(basicStrategy.getPlayerElement()).toEqual(videoElement)
    })
  })

  describe("events", () => {
    it("should publish a state change to PLAYING on playing event", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const eventCallbackSpy = jest.fn()
      basicStrategy.addEventCallback(this, eventCallbackSpy)

      basicStrategy.load(null, 25)

      videoElement.dispatchEvent(new Event("playing"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to PAUSED on pause event", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const eventCallbackSpy = jest.fn()
      basicStrategy.addEventCallback(this, eventCallbackSpy)

      basicStrategy.load(null, 25)

      videoElement.dispatchEvent(new Event("pause"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to WAITING on seeking event", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const eventCallbackSpy = jest.fn()
      basicStrategy.addEventCallback(this, eventCallbackSpy)

      basicStrategy.load(null, 25)

      videoElement.dispatchEvent(new Event("seeking"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to WAITING on waiting event", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const eventCallbackSpy = jest.fn()
      basicStrategy.addEventCallback(this, eventCallbackSpy)

      basicStrategy.load(null, 25)

      videoElement.dispatchEvent(new Event("waiting"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a state change to ENDED on ended event", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const eventCallbackSpy = jest.fn()
      basicStrategy.addEventCallback(this, eventCallbackSpy)

      basicStrategy.load(null, 25)

      videoElement.dispatchEvent(new Event("ended"))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a time update event on time update", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const timeUpdateCallbackSpy = jest.fn()
      basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy)

      basicStrategy.load(null, 25)

      videoElement.dispatchEvent(new Event("timeupdate"))

      expect(timeUpdateCallbackSpy).toHaveBeenCalled()
      expect(timeUpdateCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it("should publish a error event with code and message on error", () => {
      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      const errorCallbackSpy = jest.fn()
      basicStrategy.addErrorCallback(this, errorCallbackSpy)

      basicStrategy.load(null, 25)

      videoElement.dispatchEvent(new Event("error"))

      // cannot fully test that the MediaError is used as JSDOM cannot set error on the video element
      expect(errorCallbackSpy).toHaveBeenCalledWith({ code: 0, message: "unknown" })
      expect(errorCallbackSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe("auto resume", () => {
    it("should start auto-resume timeout when Time Shift Detector returns true for sliding", () => {
      mockTimeShiftDetector.isSeekableRangeSliding.mockReturnValueOnce(true)
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      basicStrategy.load(null, 0)
      basicStrategy.pause()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
      expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledWith(
        0,
        { start: 0, end: 0 },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        basicStrategy.play
      )
    })

    it("should not start auto-resume timeout when Time Shift Detector returns false for sliding", () => {
      mockTimeShiftDetector.isSeekableRangeSliding.mockReturnValueOnce(false)
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      basicStrategy.load(null, 0)
      basicStrategy.pause()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })

    it("should start auto-resume timeout on seeked event if media element is paused and Time Shift Detector returns true for sliding", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      mockTimeShiftDetector.isSeekableRangeSliding.mockReturnValueOnce(true)

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)

      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(true)

      videoElement.dispatchEvent(new Event("seeked"))

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
    })

    it("should not start auto-resume timeout on seeked event if media element is paused and Time Shift Detector returns false for sliding", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      mockTimeShiftDetector.isSeekableRangeSliding.mockReturnValueOnce(false)

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)
      basicStrategy.load(null, 0)

      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(true)

      videoElement.dispatchEvent(new Event("seeked"))

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })

    it("should start auto-resume timeout when Time Shift Detector callback fires while paused", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      basicStrategy.load(null, 0)

      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(true)

      mockTimeShiftDetector.triggerTimeShiftDetected()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
    })

    it("should not start auto-resume timeout when Time Shift Detector callback fires while unpaused", () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        timeShiftBufferDepthInMilliseconds: 72000000,
        availabilityStartTimeInMilliseconds: 1731974400000,
        presentationTimeOffsetInMilliseconds: 0,
      })

      const basicStrategy = BasicStrategy(mockMediaSources, MediaKinds.VIDEO, playbackElement)

      basicStrategy.load(null, 0)

      jest.spyOn(videoElement, "paused", "get").mockReturnValueOnce(false)

      mockTimeShiftDetector.triggerTimeShiftDetected()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })
  })
})
