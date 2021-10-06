import MediaPlayerBase from '../mediaplayerbase'
import SeekableMediaPlayer from './seekable'
import WindowTypes from '../../../models/windowtypes'

describe('Seekable HMTL5 Live Player', () => {
  const callback = () => { }
  const sourceContainer = document.createElement('div')

  let player
  let seekableMediaPlayer

  function wrapperTests (action, expectedReturn) {
    if (expectedReturn) {
      player[action].mockReturnValue(expectedReturn)

      expect(seekableMediaPlayer[action]()).toBe(expectedReturn)
    } else {
      seekableMediaPlayer[action]()

      expect(player[action]).toHaveBeenCalledTimes(1)
    }
  }

  function initialiseSeekableMediaPlayer (windowType) {
    seekableMediaPlayer = SeekableMediaPlayer(player, windowType)
  }

  beforeEach(() => {
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
      'beginPlaybackFrom': jest.fn(),
      'playFrom': jest.fn(),
      'getCurrentTime': jest.fn(),
      'getSeekableRange': jest.fn(),
      'toPaused': jest.fn(),
      'toPlaying': jest.fn()
    }
  })

  describe('methods call the appropriate media player methods', () => {
    beforeEach(() => {
      initialiseSeekableMediaPlayer()
    })

    it('calls beginPlayback on the media player', () => {
      wrapperTests('beginPlayback')
    })

    it('calls initialiseMedia on the media player', () => {
      wrapperTests('initialiseMedia')
    })

    it('calls beginPlayingFrom on the media player', () => {
      const arg = 0
      seekableMediaPlayer.beginPlaybackFrom(arg)

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(arg)
    })

    it('calls playFrom on the media player', () => {
      const arg = 0
      seekableMediaPlayer.playFrom(arg)

      expect(player.playFrom).toHaveBeenCalledWith(arg)
    })

    it('calls stop on the media player', () => {
      wrapperTests('stop')
    })

    it('calls reset on the media player', () => {
      wrapperTests('reset')
    })

    it('calls getState on the media player', () => {
      wrapperTests('getState', 'thisState')
    })

    it('calls getSource on the media player', () => {
      wrapperTests('getSource', 'thisSource')
    })

    it('calls getMimeType on the media player', () => {
      wrapperTests('getMimeType', 'thisMimeType')
    })

    it('calls addEventCallback on the media player', () => {
      const thisArg = 'arg'
      seekableMediaPlayer.addEventCallback(thisArg, callback)

      expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback)
    })

    it('calls removeEventCallback on the media player', () => {
      const thisArg = 'arg'
      seekableMediaPlayer.removeEventCallback(thisArg, callback)

      expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback)
    })

    it('calls removeAllEventCallbacks on the media player', () => {
      wrapperTests('removeAllEventCallbacks')
    })

    it('calls getPlayerElement on the media player', () => {
      wrapperTests('getPlayerElement')
    })

    it('calls pause on the media player', () => {
      player.getSeekableRange.mockReturnValue({start: 0})

      wrapperTests('pause')
    })

    it('calls getCurrentTime on media player', () => {
      wrapperTests('getCurrentTime', 'thisTime')
    })

    it('calls getSeekableRange on media player', () => {
      wrapperTests('getSeekableRange', 'thisRange')
    })
  })

  describe('Seekable features', () => {
    afterEach(() => {
      delete window.bigscreenPlayer
    })

    it('should respect config forcing playback from the end of the window', () => {
      window.bigscreenPlayer = {
        overrides: {
          forceBeginPlaybackToEndOfWindow: true
        }
      }

      initialiseSeekableMediaPlayer()

      seekableMediaPlayer.beginPlayback()

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(Infinity)
    })
  })

  describe('calls the mediaplayer with the correct media Type', () => {
    beforeEach(() => {
      initialiseSeekableMediaPlayer()
    })

    it('for static video', () => {
      seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, '', '', sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined)
    })

    it('for live video', () => {
      seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined)
    })

    it('for static audio', () => {
      seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, '', '', sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_AUDIO, '', '', sourceContainer, undefined)
    })
  })

  describe('Pausing and Auto-Resume', () => {
    let mockCallback = []

    function startPlaybackAndPause (startTime, disableAutoResume) {
      seekableMediaPlayer.beginPlaybackFrom(startTime || 0)
      seekableMediaPlayer.pause({disableAutoResume: disableAutoResume})
    }

    beforeEach(() => {
      jest.useFakeTimers()

      initialiseSeekableMediaPlayer(WindowTypes.SLIDING)

      player.getSeekableRange.mockReturnValue({start: 0})
      player.getCurrentTime.mockReturnValue(20)

      player.addEventCallback.mockImplementation((self, callback) => {
        mockCallback.push(callback)
      })
    })

    afterEach(() => {
      jest.useRealTimers()
      mockCallback = []
    })

    it('calls resume when approaching the start of the buffer', () => {
      startPlaybackAndPause(20, false)

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).toHaveBeenCalledWith()
    })

    it('does not call resume when approaching the start of the buffer with the disableAutoResume option', () => {
      startPlaybackAndPause(20, true)

      jest.advanceTimersByTime(11 * 1000)

      expect(player.resume).not.toHaveBeenCalledWith()
    })

    it('does not call resume if paused after the auto resume point', () => {
      startPlaybackAndPause(20, false)

      jest.advanceTimersByTime(11 * 1000)

      expect(player.resume).not.toHaveBeenCalledWith()
    })

    it('does not auto-resume if the video is no longer paused', () => {
      startPlaybackAndPause(20, false)

      for (let index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING})
      }

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).not.toHaveBeenCalled()
    })

    it('Calls resume when paused is called multiple times', () => {
      startPlaybackAndPause(0, false)

      const event = {state: MediaPlayerBase.STATE.PLAYING, currentTime: 25}
      for (let index = 0; index < mockCallback.length; index++) {
        mockCallback[index](event)
      }

      seekableMediaPlayer.pause()

      event.currentTime = 30
      for (let index = 0; index < mockCallback.length; index++) {
        mockCallback[index](event)
      }

      seekableMediaPlayer.pause()
      // uses real time to determine pause intervals
      // if debugging the time to the buffer will be decreased by the time spent.
      jest.advanceTimersByTime(22 * 1000)

      expect(player.resume).toHaveBeenCalledTimes(1)
    })

    it('calls auto-resume immeditetly if paused after an autoresume', () => {
      startPlaybackAndPause(20, false)

      jest.advanceTimersByTime(12 * 1000)

      player.getSeekableRange.mockReturnValue({start: 12})

      seekableMediaPlayer.pause()

      jest.advanceTimersByTime(1)

      expect(player.resume).toHaveBeenCalledTimes(1)
      expect(player.toPaused).toHaveBeenCalledTimes(1)
      expect(player.toPlaying).toHaveBeenCalledTimes(1)
    })

    it('does not calls autoresume immeditetly if paused after an auto-resume with disableAutoResume options', () => {
      startPlaybackAndPause(20, true)

      jest.advanceTimersByTime(12 * 1000)
      player.getSeekableRange.mockReturnValue({start: 12})

      jest.advanceTimersByTime(1)

      expect(player.resume).not.toHaveBeenCalledTimes(1)
    })

    it('auto-resume is not cancelled by a paused event state', () => {
      startPlaybackAndPause(20, false)

      for (let index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED})
      }

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).toHaveBeenCalledTimes(1)
    })

    it('auto-resume is not cancelled by a status event', () => {
      startPlaybackAndPause(20, false)

      for (let index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({type: MediaPlayerBase.EVENT.STATUS})
      }

      jest.advanceTimersByTime(12 * 1000)

      expect(player.resume).toHaveBeenCalledTimes(1)
    })

    it('will fake pause if attempting to pause at the start of playback ', () => {
      player.getCurrentTime.mockReturnValue(0)
      startPlaybackAndPause(0, false)

      expect(player.toPaused).toHaveBeenCalledTimes(1)
      expect(player.toPlaying).toHaveBeenCalledTimes(1)
    })

    it('time spend buffering is deducted when considering time to auto-resume', () => {
      startPlaybackAndPause(0, false)

      seekableMediaPlayer.resume()
      player.resume.mockClear()

      for (let index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.BUFFERING, currentTime: 20})
      }

      jest.advanceTimersByTime(11 * 1000)

      for (let index = 0; index < mockCallback.length; index++) {
        mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING, currentTime: 20})
      }
      player.getSeekableRange.mockReturnValue({start: 20})

      seekableMediaPlayer.pause()

      jest.advanceTimersByTime(3 * 1000)

      expect(player.toPlaying).toHaveBeenCalledTimes(1)
    })

    it('should not call autoresume immeditetly if paused after an auto-resume with disableAutoResume options', () => {
      startPlaybackAndPause(20, true)

      jest.advanceTimersByTime(12 * 1000)

      jest.advanceTimersByTime(1)

      expect(player.resume).not.toHaveBeenCalledTimes(1)
    })

    it('Should auto resume when paused after a seek', () => {
      player.getSeekableRange.mockReturnValue({start: 0})
      player.getCurrentTime.mockReturnValue(100)

      startPlaybackAndPause(100, false)

      player.getCurrentTime.mockReturnValue(50)
      player.getState.mockReturnValue(MediaPlayerBase.STATE.PAUSED)

      seekableMediaPlayer.playFrom(50)

      seekableMediaPlayer.pause()

      jest.advanceTimersByTime(42 * 1000)

      expect(player.resume).toHaveBeenCalledTimes(1)
    })
  })
})

