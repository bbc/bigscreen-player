import WindowTypes from '../models/windowtypes'
import MediaKinds from '../models/mediakinds'
import MediaState from '../models/mediastate'
import BasicStrategy from './basicstrategy'
import DynamicWindowUtils from '../dynamicwindowutils'
import { expect, jest } from '@jest/globals'

const autoResumeSpy = jest.spyOn(DynamicWindowUtils, 'autoResumeAtStartOfRange')

var basicStrategy
var cdnArray
var playbackElement
var mockMediaSources
var testTimeCorrection

var audioElement
var videoElement

function setUpStrategy (windowType, mediaKind) {
  var defaultWindowType = windowType || WindowTypes.STATIC
  var defaultMediaKind = mediaKind || MediaKinds.VIDEO

  basicStrategy = BasicStrategy(mockMediaSources, defaultWindowType, defaultMediaKind, playbackElement)
}

describe('HTML5 Strategy', function () {
  beforeEach(function () {
    audioElement = document.createElement('audio')
    videoElement = document.createElement('video')
    playbackElement = document.createElement('div')
    playbackElement.id = 'app'
    document.body.appendChild(playbackElement)

    jest.spyOn(document, 'createElement').mockImplementationOnce((type) => {
      if (type === 'audio') {
        return audioElement
      } else if (type === 'video') {
        return videoElement
      }
    })

    cdnArray = [
      { url: 'http://testcdn1/test/', cdn: 'http://testcdn1/test/' },
      { url: 'http://testcdn2/test/', cdn: 'http://testcdn2/test/' },
      { url: 'http://testcdn3/test/', cdn: 'http://testcdn3/test/' }
    ]

    mockMediaSources = {
      time: function () {
        return {correction: testTimeCorrection}
      },
      currentSource: function () {
        return cdnArray[0].url
      }
    }
  })

  afterEach(function () {
    testTimeCorrection = 0
    basicStrategy.tearDown()
    videoElement = undefined
    audioElement = undefined
    autoResumeSpy.mockReset()
  })

  describe('transitions', function () {
    it('canBePaused() and canBeginSeek transitions are true', function () {
      setUpStrategy()

      expect(basicStrategy.transitions.canBePaused()).toBe(true)
      expect(basicStrategy.transitions.canBeginSeek()).toBe(true)
    })
  })

  describe('load', function () {
    it('should create a video element and add it to the playback element', function () {
      setUpStrategy(null, MediaKinds.VIDEO)

      expect(playbackElement.childElementCount).toBe(0)

      basicStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBeInstanceOf(HTMLVideoElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it('should create an audio element and add it to the playback element', function () {
      setUpStrategy(null, MediaKinds.AUDIO)

      expect(playbackElement.childElementCount).toBe(0)

      basicStrategy.load(null, 0)

      expect(playbackElement.firstChild).toBeInstanceOf(HTMLAudioElement)
      expect(playbackElement.childElementCount).toBe(1)
    })

    it('should set the style properties correctly on the media element', function () {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)

      expect(videoElement.style.position).toBe('absolute')
      expect(videoElement.style.width).toBe('100%')
      expect(videoElement.style.height).toBe('100%')
    })

    it('should set the autoplay and preload properties correctly on the media element', function () {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)

      const videoElement = document.querySelector('video')

      expect(videoElement.autoplay).toBe(true)
      expect(videoElement.preload).toBe('auto')
    })

    it('should set the source url correctly on the media element', function () {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)

      expect(videoElement.src).toBe('http://testcdn1/test/')
    })

    it('should set the currentTime to start time if one is provided', function () {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toEqual(25)
    })

    it('should not set the currentTime to start time if one is not provided', function () {
      setUpStrategy(null, MediaKinds.VIDEO)
      basicStrategy.load(null, undefined)

      expect(videoElement.currentTime).toEqual(0)
    })

    it('should call load on the media element', function () {
      setUpStrategy()

      const loadSpy = jest.spyOn(videoElement, 'load')

      basicStrategy.load(null, undefined)

      expect(loadSpy).toHaveBeenCalled()
    })

    it('should update the media element source if load is when media element already exists', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)

      expect(videoElement.src).toBe('http://testcdn1/test/')

      mockMediaSources.currentSource = function () {
        return cdnArray[1].url
      }

      basicStrategy.load(null, undefined)

      expect(videoElement.src).toBe('http://testcdn2/test/')
    })

    it('should update the media element currentTime if load is called with a start time when media element already exists', function () {
      setUpStrategy()
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toEqual(25)

      basicStrategy.load(null, 35)

      expect(videoElement.currentTime).toEqual(35)
    })

    it('should not update the media element currentTime if load is called without a start time when media element already exists', function () {
      setUpStrategy()
      basicStrategy.load(null, 25)

      expect(videoElement.currentTime).toEqual(25)

      basicStrategy.load(null, undefined)

      expect(videoElement.currentTime).toEqual(25)
    })

    it('should set up bindings to media element events correctly', function () {
      setUpStrategy()
      const addEventListenerSpy = jest.spyOn(videoElement, 'addEventListener')
      basicStrategy.load(null, undefined)

      expect(addEventListenerSpy).toHaveBeenCalledWith('timeupdate', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('playing', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('pause', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('waiting', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('seeking', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('seeked', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('ended', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
    })
  })

  describe('play', function () {
    it('should call through to the media elements play function', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      const playSpy = jest.spyOn(videoElement, 'play')
      basicStrategy.play()

      expect(playSpy).toHaveBeenCalled()
    })
  })

  describe('pause', function () {
    it('should call through to the media elements pause function', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      const pauseSpy = jest.spyOn(videoElement, 'pause')
      basicStrategy.pause()

      expect(pauseSpy).toHaveBeenCalled()
    })

    it('should start autoresume timeout if sliding window', function () {
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

    it('should not start autoresume timeout if sliding window but disableAutoResume is set', function () {
      var opts = {
        disableAutoResume: true
      }

      setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO)
      basicStrategy.load(null, 0)
      basicStrategy.pause(opts)

      expect(autoResumeSpy).not.toHaveBeenCalled()
    })
  })

  describe('getSeekableRange', function () {
    beforeEach(function () {
      jest.spyOn(videoElement, 'seekable', 'get').mockImplementation(() => {
        return {
          start: function (index) {
            if (index === 0) {
              return 25
            } else {
              return undefined
            }
          },
          end: function (index) {
            if (index === 0) {
              return 100
            } else {
              return undefined
            }
          },
          length: 2
        }
      })
    })

    it('returns the correct start and end time before load has been called', function () {
      setUpStrategy()

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 })
    })

    it('returns the correct start and end time before meta data has loaded', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 })
    })

    it('returns the correct start and end time once meta data has loaded', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)
      videoElement.dispatchEvent(new Event('loadedmetadata'))

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 25, end: 100 })
    })

    it('returns the correct start and end time minus any time correction', function () {
      testTimeCorrection = 20
      setUpStrategy()
      basicStrategy.load(null, undefined)
      videoElement.dispatchEvent(new Event('loadedmetadata'))

      expect(basicStrategy.getSeekableRange()).toEqual({ start: 5, end: 80 })
    })
  })

  describe('getDuration', function () {
    beforeEach(function () {
      jest.spyOn(videoElement, 'duration', 'get').mockReturnValue(100)
    })

    it('returns duration of zero before load has been called', function () {
      setUpStrategy()

      expect(basicStrategy.getDuration()).toEqual(0)
    })

    it('returns duration of zero before meta data has loaded', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)

      expect(basicStrategy.getDuration()).toEqual(0)
    })

    it('returns the correct duration once meta data has loaded', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)
      videoElement.dispatchEvent(new Event('loadedmetadata'))

      expect(basicStrategy.getDuration()).toEqual(100)
    })
  })

  describe('getCurrentTime', function () {
    beforeEach(function () {
      videoElement.currentTime = 5
    })

    it('returns currentTime of zero before load has been called', function () {
      setUpStrategy()

      expect(basicStrategy.getCurrentTime()).toEqual(0)
    })

    it('returns the correct currentTime once load has been called', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)

      expect(basicStrategy.getCurrentTime()).toEqual(5)

      videoElement.currentTime = 10

      expect(basicStrategy.getCurrentTime()).toEqual(10)
    })

    it('subtracts any time correction from the media elements current time', function () {
      testTimeCorrection = 20
      setUpStrategy()
      basicStrategy.load(null, undefined)

      videoElement.currentTime = 50

      expect(basicStrategy.getCurrentTime()).toEqual(30)
    })
  })

  describe('setCurrentTime', function () {
    var seekableRange = {
      start: 0,
      end: 100
    }
    var clampOffset = 1.1

    beforeEach(function () {
      jest.spyOn(videoElement, 'seekable', 'get').mockImplementation(() => {
        return {
          start: function () {
            return seekableRange.start
          },
          end: function () {
            return seekableRange.end
          },
          length: 2
        }
      })
    })

    it('sets the current time on the media element to that passed in', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)

      basicStrategy.setCurrentTime(10)

      expect(basicStrategy.getCurrentTime()).toEqual(10)
    })

    it('adds time correction from the media source onto the passed in seek time', function () {
      testTimeCorrection = 20
      setUpStrategy()
      basicStrategy.load(null, undefined)

      basicStrategy.setCurrentTime(50)

      expect(videoElement.currentTime).toEqual(70)
    })

    it('does not attempt to clamp time if meta data is not loaded', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)

      basicStrategy.setCurrentTime(110) // this is greater than expected seekable range. although range does not exist until meta data loaded

      expect(videoElement.currentTime).toEqual(110)
    })

    it('clamps to 1.1 seconds before seekable range end when seeking to end', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)
      videoElement.dispatchEvent(new Event('loadedmetadata'))

      basicStrategy.setCurrentTime(seekableRange.end)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it('clamps to 1.1 seconds before seekable range end when seeking past end', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)
      videoElement.dispatchEvent(new Event('loadedmetadata'))

      basicStrategy.setCurrentTime(seekableRange.end + 10)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it('clamps to 1.1 seconds before seekable range end when seeking prior to end', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)
      videoElement.dispatchEvent(new Event('loadedmetadata'))

      basicStrategy.setCurrentTime(seekableRange.end - 1)

      expect(videoElement.currentTime).toEqual(seekableRange.end - clampOffset)
    })

    it('clamps to the start of seekable range when seeking before start of range', function () {
      setUpStrategy()
      basicStrategy.load(null, undefined)
      videoElement.dispatchEvent(new Event('loadedmetadata'))

      basicStrategy.setCurrentTime(seekableRange.start - 10)

      expect(videoElement.currentTime).toEqual(seekableRange.start)
    })
  })

  describe('Playback Rate', function () {
    it('sets the playback rate on the media element', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      basicStrategy.setPlaybackRate(2)

      expect(videoElement.playbackRate).toEqual(2)
    })

    it('gets the playback rate on the media element', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      var testRate = 1.5
      basicStrategy.setPlaybackRate(testRate)

      var rate = basicStrategy.getPlaybackRate()

      expect(rate).toEqual(testRate)
    })
  })

  describe('isPaused', function () {
    it('should return false when the media element is not paused', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, 'paused', 'get').mockReturnValueOnce(false)

      expect(basicStrategy.isPaused()).toBe(false)
    })

    it('should return true when the media element is paused', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, 'paused', 'get').mockReturnValueOnce(true)

      expect(basicStrategy.isPaused()).toBe(true)
    })
  })

  describe('isEnded', function () {
    it('should return false when the media element is not ended', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, 'ended', 'get').mockReturnValueOnce(false)

      expect(basicStrategy.isEnded()).toBe(false)
    })

    it('should return true when the media element is ended', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      jest.spyOn(videoElement, 'ended', 'get').mockReturnValueOnce(true)

      expect(basicStrategy.isEnded()).toBe(true)
    })
  })

  describe('tearDown', function () {
    it('should remove all event listener bindings', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)

      const removeEventListenerSpy = jest.spyOn(videoElement, 'removeEventListener')

      basicStrategy.tearDown()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('playing', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('pause', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('waiting', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('seeking', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('seeked', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('ended', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
    })

    it('should remove the video element', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)

      expect(playbackElement.childElementCount).toBe(1)

      basicStrategy.tearDown()

      expect(playbackElement.childElementCount).toBe(0)
    })

    it('should empty the eventCallbacks ', function () {
      setUpStrategy()

      function tearDownAndError () {
        basicStrategy.addEventCallback(function () {}) // add event callback to prove array is emptied in tearDown
        basicStrategy.load(null, 0)
        basicStrategy.tearDown()
        videoElement.dispatchEvent(new Event('pause'))
      }

      expect(tearDownAndError).not.toThrowError()
    })

    it('should undefine the error callback', function () {
      var errorCallbackSpy = jest.fn()

      setUpStrategy()
      basicStrategy.addErrorCallback(this, errorCallbackSpy)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()
      videoElement.dispatchEvent(new Event('error'))

      expect(errorCallbackSpy).not.toHaveBeenCalled()
    })

    it('should undefine the timeupdate callback', function () {
      var timeUpdateCallbackSpy = jest.fn()

      setUpStrategy()
      basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy)
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()
      videoElement.dispatchEvent(new Event('timeupdate'))

      expect(timeUpdateCallbackSpy).not.toHaveBeenCalled()
    })

    it('should undefine the mediaPlayer element', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)
      basicStrategy.tearDown()

      expect(basicStrategy.getPlayerElement()).toBe(undefined)
    })
  })

  describe('getPlayerElement', function () {
    it('should return the mediaPlayer element', function () {
      setUpStrategy()
      basicStrategy.load(null, 0)

      expect(basicStrategy.getPlayerElement()).toEqual(videoElement)
    })
  })

  describe('events', function () {
    var eventCallbackSpy
    var timeUpdateCallbackSpy
    var errorCallbackSpy

    beforeEach(function () {
      setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO)
      basicStrategy.load(null, 25)

      eventCallbackSpy = jest.fn()
      basicStrategy.addEventCallback(this, eventCallbackSpy)

      timeUpdateCallbackSpy = jest.fn()
      basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy)

      errorCallbackSpy = jest.fn()
      basicStrategy.addErrorCallback(this, errorCallbackSpy)
    })

    it('should publish a state change to PLAYING on playing event', function () {
      videoElement.dispatchEvent(new Event('playing'))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it('should publish a state change to PAUSED on pause event', function () {
      videoElement.dispatchEvent(new Event('pause'))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it('should publish a state change to WAITING on seeking event', function () {
      videoElement.dispatchEvent(new Event('seeking'))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it('should publish a state change to WAITING on waiting event', function () {
      videoElement.dispatchEvent(new Event('waiting'))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it('should publish a state change to ENDED on ended event', function () {
      videoElement.dispatchEvent(new Event('ended'))

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED)
      expect(eventCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it('should start auto-resume timeout on seeked event if media element is paused and SLIDING window', function () {
      jest.spyOn(videoElement, 'paused', 'get').mockReturnValueOnce(true)
      videoElement.dispatchEvent(new Event('seeked'))

      expect(autoResumeSpy).toHaveBeenCalledTimes(1)
    })

    it('should publish a time update event on time update', function () {
      videoElement.dispatchEvent(new Event('timeupdate'))

      expect(timeUpdateCallbackSpy).toHaveBeenCalled()
      expect(timeUpdateCallbackSpy).toHaveBeenCalledTimes(1)
    })

    it('should publish a error event on error', function () {
      videoElement.dispatchEvent(new Event('error'))

      expect(errorCallbackSpy).toHaveBeenCalled()
      expect(errorCallbackSpy).toHaveBeenCalledTimes(1)
    })
  })
})
