import MediaPlayerBase from '../mediaplayerbase'
import RestartableMediaPlayer from './restartable'
import WindowTypes from '../../../models/windowtypes'

var sourceContainer = document.createElement('div')
var player
var restartableMediaPlayer
var testTime = {
  windowStartTime: 0,
  windowEndTime: 100000,
  correction: 0
}

var mockMediaSources = {
  time: function () {
    return testTime
  },
  refresh: function (successCallback, errorCallback) {
    successCallback()
  }
}

function initialiseRestartableMediaPlayer (windowType) {
  windowType = windowType || WindowTypes.SLIDING
  restartableMediaPlayer = RestartableMediaPlayer(player, windowType, mockMediaSources)
}

describe('restartable HMTL5 Live Player', function () {
  function wrapperTests (action, expectedReturn) {
    if (expectedReturn) {
      player[action].mockReturnValue(expectedReturn)

      expect(restartableMediaPlayer[action]()).toBe(expectedReturn)
    } else {
      restartableMediaPlayer[action]()

      expect(player[action]).toHaveBeenCalledTimes(1)
    }
  }

  beforeEach(function () {
    player = {
      'beginPlayback': jest.fn(),
      'initialiseMedia': jest.fn(),
      'stop': jest.fn(),
      'reset': jest.fn(),
      'getState': jest.fn(),
      'getSource': jest.fn(),
      'getMimeType': jest.fn(),
      'addEventCallback': jest.fn(),
      'removeEventCallback': jest.fn(),
      'removeAllEventCallbacks': jest.fn(),
      'getPlayerElement': jest.fn(),
      'pause': jest.fn(),
      'resume': jest.fn(),
      'beginPlaybackFrom': jest.fn()
    }
  })

  describe('methods call the appropriate media player methods', function () {
    beforeEach(function () {
      initialiseRestartableMediaPlayer()
    })

    it('calls beginPlayback on the media player', function () {
      wrapperTests('beginPlayback')
    })

    it('calls initialiseMedia on the media player', function () {
      wrapperTests('initialiseMedia')
    })

    it('calls stop on the media player', function () {
      wrapperTests('stop')
    })

    it('calls reset on the media player', function () {
      wrapperTests('reset')
    })

    it('calls getState on the media player', function () {
      wrapperTests('getState', 'thisState')
    })

    it('calls getSource on the media player', function () {
      wrapperTests('getSource', 'thisSource')
    })

    it('calls getMimeType on the media player', function () {
      wrapperTests('getMimeType', 'thisMimeType')
    })

    it('calls addEventCallback on the media player', function () {
      var thisArg = 'arg'
      var callback = function () { return }
      restartableMediaPlayer.addEventCallback(thisArg, callback)

      expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, expect.any(Function))
    })

    it('calls removeEventCallback on the media player', function () {
      var thisArg = 'arg'
      var callback = function () { return }
      restartableMediaPlayer.addEventCallback(thisArg, callback)
      restartableMediaPlayer.removeEventCallback(thisArg, callback)

      expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, expect.any(Function))
    })

    it('calls removeAllEventCallbacks on the media player', function () {
      wrapperTests('removeAllEventCallbacks')
    })

    it('calls getPlayerElement on the media player', function () {
      wrapperTests('getPlayerElement', 'thisPlayerElement')
    })

    it('calls pause on the media player', function () {
      wrapperTests('pause')
    })
  })

  describe('should not have methods for', function () {
    function isUndefined (action) {
      expect(restartableMediaPlayer[action]).not.toBeDefined()
    }

    beforeEach(function () {
      initialiseRestartableMediaPlayer()
    })

    it('playFrom', function () {
      isUndefined('playFrom')
    })
  })

  describe('should use fake time for', function () {
    var timeUpdates = []
    function timeUpdate (opts) {
      timeUpdates.forEach(function (fn) { fn(opts) })
    }

    beforeEach(function () {
      jest.useFakeTimers()
      // jasmine.clock().mockDate()

      player.addEventCallback.mockImplementation(function (self, callback) {
        timeUpdates.push(callback)
      })
      // player.addEventCallback.and.callFake(function (self, callback) {
      //   timeUpdates.push(callback)
      // })

      initialiseRestartableMediaPlayer()
    })

    afterEach(function () {
      jest.useRealTimers()
    })

    describe('getCurrentTime', function () {
      it('should be set on to the window length on beginPlayback', function () {
        restartableMediaPlayer.beginPlayback()

        expect(restartableMediaPlayer.getCurrentTime()).toBe(100)
      })

      it('should start at supplied time', function () {
        restartableMediaPlayer.beginPlaybackFrom(10)

        expect(restartableMediaPlayer.getCurrentTime()).toBe(10)
      })

      it('should increase when playing', function () {
        restartableMediaPlayer.beginPlaybackFrom(10)

        timeUpdate({ state: MediaPlayerBase.STATE.PLAYING })

        jest.advanceTimersByTime(1000)

        timeUpdate({ state: MediaPlayerBase.STATE.PLAYING })

        expect(restartableMediaPlayer.getCurrentTime()).toBe(11)
      })

      it('should not increase when paused', function () {
        restartableMediaPlayer.beginPlaybackFrom(10)
        timeUpdate({ state: MediaPlayerBase.STATE.PAUSED })

        jest.advanceTimersByTime(1000)

        timeUpdate({ state: MediaPlayerBase.STATE.PLAYING })

        expect(restartableMediaPlayer.getCurrentTime()).toBe(10)
      })
    })

    describe('getSeekableRange', function () {
      it('should start at the window time', function () {
        restartableMediaPlayer.beginPlaybackFrom(0)

        timeUpdate({ state: MediaPlayerBase.STATE.PLAYING })

        expect(restartableMediaPlayer.getSeekableRange()).toEqual({ start: 0, end: 100 })
      })

      it('should increase start and end for a sliding window', function () {
        restartableMediaPlayer.beginPlaybackFrom(0)

        timeUpdate({ state: MediaPlayerBase.STATE.PLAYING })

        jest.advanceTimersByTime(1000)

        expect(restartableMediaPlayer.getSeekableRange()).toEqual({ start: 1, end: 101 })
      })

      it('should only increase end for a growing window', function () {
        initialiseRestartableMediaPlayer(WindowTypes.GROWING)
        restartableMediaPlayer.beginPlaybackFrom(0)
        timeUpdate({ state: MediaPlayerBase.STATE.PLAYING })
        jest.advanceTimersByTime(1000)

        expect(restartableMediaPlayer.getSeekableRange()).toEqual({ start: 0, end: 101 })
      })
    })
  })

  describe('calls the mediaplayer with the correct media Type', function () {
    beforeEach(function () {
      initialiseRestartableMediaPlayer()
    })

    it('for static video', function () {
      restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, '', '', sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined)
    })

    it('for live video', function () {
      restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined)
    })

    it('for static audio', function () {
      restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, '', '', sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_AUDIO, '', '', sourceContainer, undefined)
    })
  })

  describe('Restartable features', function () {
    afterEach(function () {
      delete window.bigscreenPlayer
    })

    it('begins playback with the desired offset', function () {
      initialiseRestartableMediaPlayer()
      var offset = 10

      restartableMediaPlayer.beginPlaybackFrom(offset)

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(offset)
    })

    it('should respect config forcing playback from the end of the window', function () {
      window.bigscreenPlayer = {
        overrides: {
          forceBeginPlaybackToEndOfWindow: true
        }
      }

      initialiseRestartableMediaPlayer()

      restartableMediaPlayer.beginPlayback()

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(Infinity)
    })
  })

  describe('Pausing and Auto-Resume', function () {
    var mockCallback = []

    function startPlaybackAndPause (startTime, disableAutoResume, windowType) {
      initialiseRestartableMediaPlayer(windowType)

      restartableMediaPlayer.beginPlaybackFrom(startTime)

      for (var index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING})
      }

      restartableMediaPlayer.pause({disableAutoResume: disableAutoResume})

      for (index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED})
      }
    }

    beforeEach(function () {
      jest.useFakeTimers()

      player.addEventCallback.mockImplementation(function (self, callback) {
        mockCallback.push(callback)
      })
    })

    afterEach(function () {
      jest.useRealTimers()
      mockCallback = []
    })

    it('calls resume when approaching the start of the buffer', function () {
      startPlaybackAndPause(20, false)

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).toHaveBeenCalledWith()
    })

    it('does not call resume when approaching the start of the buffer with the disableAutoResume option', function () {
      startPlaybackAndPause(20, true)

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).not.toHaveBeenCalledWith()
    })

    it('does not call resume if paused after the autoresume point', function () {
      startPlaybackAndPause(20, false)

      jest.advanceTimersByTime(11 * 1000)

      expect(player.resume).not.toHaveBeenCalledWith()
    })

    it('does not auto-resume if the video is no longer paused', function () {
      startPlaybackAndPause(20, false)

      for (var index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING})
      }

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).not.toHaveBeenCalledTimes(2)
    })

    it('Calls resume when paused is called multiple times', function () {
      startPlaybackAndPause(0, false)

      var event = {state: MediaPlayerBase.STATE.PLAYING, currentTime: 25}
      for (var index = 0; index < mockCallback.length; index++) {
        mockCallback[index](event)
      }

      restartableMediaPlayer.pause()

      event.currentTime = 30
      for (index = 0; index < mockCallback.length; index++) {
        mockCallback[index](event)
      }

      restartableMediaPlayer.pause()
      // uses real time to determine pause intervals
      // if debugging the time to the buffer will be decreased by the time spent.
      jest.advanceTimersByTime(22 * 1000)

      expect(player.resume).toHaveBeenCalledTimes(1)
    })

    it('calls auto-resume immeditetly if paused after an autoresume', function () {
      startPlaybackAndPause(20, false)

      jest.advanceTimersByTime(12 * 1000)

      restartableMediaPlayer.pause()

      jest.advanceTimersByTime(1)

      expect(player.resume).toHaveBeenCalledTimes(2)
    })

    it('auto-resume is not cancelled by a paused event state', function () {
      startPlaybackAndPause(20, false)

      for (var index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED})
      }

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).toHaveBeenCalledTimes(1)
    })

    it('will fake pause if attempting to pause at the start of playback ', function () {
      startPlaybackAndPause(0, false)

      jest.advanceTimersByTime(1)

      expect(player.pause).toHaveBeenCalledTimes(1)
      expect(player.resume).toHaveBeenCalledTimes(1)
    })

    it('does not calls autoresume immeditetly if paused after an auto-resume with disableAutoResume options', function () {
      startPlaybackAndPause(20, true)

      jest.advanceTimersByTime(12 * 1000)

      jest.advanceTimersByTime(1)

      expect(player.resume).not.toHaveBeenCalledTimes(1)
    })

    it('time spend buffering is deducted when considering time to auto-resume', function () {
      startPlaybackAndPause()

      restartableMediaPlayer.beginPlaybackFrom(20)

      for (var index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.BUFFERING, currentTime: 20})
      }

      jest.advanceTimersByTime(11 * 1000)

      for (index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING, currentTime: 20})
      }

      restartableMediaPlayer.pause()

      jest.advanceTimersByTime(3 * 1000)

      expect(player.resume).toHaveBeenCalledTimes(1)
    })

    it('Should not start auto resume timeout if window type is not SLIDING', function () {
      startPlaybackAndPause(20, false, WindowTypes.GROWING)

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).not.toHaveBeenCalled()
    })
  })
})
