import WindowTypes from '../models/windowtypes'
import MediaState from '../models/mediastate'
import LegacyAdaptor from './legacyplayeradapter'

const mockGlitchCurtain = {
  showCurtain: jest.fn(),
  hideCurtain: jest.fn(),
  tearDown: jest.fn()
}

jest.mock('../playbackstrategy/liveglitchcurtain', () => jest.fn(() => mockGlitchCurtain))

const MediaPlayerEvent = {
  STOPPED: 'stopped', // Event fired when playback is stopped
  BUFFERING: 'buffering', // Event fired when playback has to suspend due to buffering
  PLAYING: 'playing', // Event fired when starting (or resuming) playing of the media
  PAUSED: 'paused', // Event fired when media playback pauses
  COMPLETE: 'complete', // Event fired when media playback has reached the end of the media
  ERROR: 'error', // Event fired when an error condition occurs
  STATUS: 'status', // Event fired regularly during play
  SEEK_ATTEMPTED: 'seek-attempted', // Event fired when a device using a seekfinishedemitevent modifier sets the source
  SEEK_FINISHED: 'seek-finished' // Event fired when a device using a seekfinishedemitevent modifier has seeked successfully
}

const MediaPlayerState = {
  EMPTY: 'EMPTY', // No source set
  STOPPED: 'STOPPED', // Source set but no playback
  BUFFERING: 'BUFFERING', // Not enough data to play, waiting to download more
  PLAYING: 'PLAYING', // Media is playing
  PAUSED: 'PAUSED', // Media is paused
  COMPLETE: 'COMPLETE', // Media has reached its end point
  ERROR: 'ERROR' // An error occurred
}

describe('Legacy Playback Adapter', () => {
  let legacyAdaptor
  let mediaPlayer
  let videoContainer
  let eventCallbacks
  let testTimeCorrection = 0
  let cdnArray = []

  beforeEach(() => {
    window.bigscreenPlayer = {
      playbackStrategy: 'stubstrategy'
    }

    mediaPlayer = {
      addEventCallback: jest.fn(),
      initialiseMedia: jest.fn(),
      beginPlayback: jest.fn(),
      getState: jest.fn(),
      resume: jest.fn(),
      getPlayerElement: jest.fn(),
      getSeekableRange: jest.fn(),
      reset: jest.fn(),
      stop: jest.fn(),
      removeAllEventCallbacks: jest.fn(),
      getSource: jest.fn(),
      getMimeType: jest.fn(),
      beginPlaybackFrom: jest.fn(),
      playFrom: jest.fn(),
      pause: jest.fn(),
      setPlaybackRate: jest.fn(),
      getPlaybackRate: jest.fn()
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete window.bigscreenPlayer
    testTimeCorrection = 0
  })

  // Options = windowType, playableDevice, timeCorrection, deviceReplacement, isUHD
  function setUpLegacyAdaptor (opts) {
    const mockMediaSources = {
      time: () => ({correction: testTimeCorrection}),
      currentSource: () => cdnArray[0].url
    }

    const options = opts || {}

    cdnArray.push({url: 'testcdn1/test/', cdn: 'cdn1'})

    const windowType = options.windowType || WindowTypes.STATIC

    mediaPlayer.addEventCallback.mockImplementation((component, callback) => {
      eventCallbacks = (event) => callback.call(component, event)
    })

    videoContainer = document.createElement('div')
    videoContainer.id = 'app'
    document.body.appendChild(videoContainer)
    legacyAdaptor = LegacyAdaptor(mockMediaSources, windowType, videoContainer, options.isUHD, mediaPlayer)
  }

  describe('transitions', () => {
    it('should pass back possible transitions', () => {
      setUpLegacyAdaptor()

      expect(legacyAdaptor.transitions).toEqual(expect.objectContaining({
        canBePaused: expect.any(Function),
        canBeStopped: expect.any(Function),
        canBeginSeek: expect.any(Function),
        canResume: expect.any(Function)
      }))
    })
  })

  describe('load', () => {
    it('should initialise the media player', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.load('video/mp4', 0)

      expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith('video', cdnArray[0].url, 'video/mp4', videoContainer, expect.any(Object))
    })

    it('should begin playback from the passed in start time + time correction if we are watching live on a restartable device', () => {
      testTimeCorrection = 10
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('video/mp4', 50)

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(60)
    })

    it('should begin playback at the live point if no start time is passed in and we are watching live on a playable device', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, playableDevice: true})

      legacyAdaptor.load('video/mp4', undefined)

      expect(mediaPlayer.beginPlayback).toHaveBeenCalledWith()
    })

    it('should begin playback from the passed in start time if we are watching vod', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.load('video/mp4', 50)

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(50)
    })

    it('should begin playback from if no start time is passed in when watching vod', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.load('video/mp4', undefined)

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(0)
    })

    it('should disable sentinels if we are watching UHD and configured to do so', () => {
      window.bigscreenPlayer.overrides = {
        liveUhdDisableSentinels: true
      }

      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, isUHD: true})

      legacyAdaptor.load('video/mp4', undefined)

      const properties = mediaPlayer.initialiseMedia.mock.calls[mediaPlayer.initialiseMedia.mock.calls.length - 1][4]

      expect(properties.disableSentinels).toEqual(true)
    })

    it('should disable seek sentinels if we are configured to do so', () => {
      window.bigscreenPlayer.overrides = {
        disableSeekSentinel: true
      }

      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load(cdnArray, 'video/mp4', undefined)

      const properties = mediaPlayer.initialiseMedia.mock.calls[mediaPlayer.initialiseMedia.mock.calls.length - 1][4]

      expect(properties.disableSeekSentinel).toEqual(true)
    })
  })

  describe('play', () => {
    describe('if the player supports playFrom()', () => {
      it('should play from 0 if the stream has ended', () => {
        setUpLegacyAdaptor()

        eventCallbacks({type: MediaPlayerEvent.COMPLETE})

        legacyAdaptor.play()

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(0)
      })

      it('should play from the current time if we are not ended, paused or buffering', () => {
        setUpLegacyAdaptor()

        eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10})

        legacyAdaptor.play()

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)
      })

      it('should play from the current time on live if we are not ended, paused or buffering', () => {
        testTimeCorrection = 10
        setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

        eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10})

        legacyAdaptor.play()

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)
      })
    })

    describe('if the player does not support playFrom()', () => {
      beforeEach(() => {
        delete mediaPlayer.playFrom
      })

      it('should not throw an error when playback has completed', () => {
        setUpLegacyAdaptor()

        eventCallbacks({type: MediaPlayerEvent.COMPLETE})

        legacyAdaptor.play()
      })

      it('should do nothing if we are not ended, paused or buffering', () => {
        setUpLegacyAdaptor()

        eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10})

        legacyAdaptor.play()
      })

      it('should resume if the player is in a paused or buffering state', () => {
        setUpLegacyAdaptor()

        mediaPlayer.getState.mockReturnValue(MediaPlayerState.PAUSED)

        legacyAdaptor.play()

        expect(mediaPlayer.resume).toHaveBeenCalledWith()
      })
    })
  })

  describe('pause', () => {
    it('should pause when we don\'t need to delay a call to pause', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.pause({disableAutoResume: false})

      expect(mediaPlayer.pause).toHaveBeenCalledWith({disableAutoResume: false})
    })

    it('should not pause when we need to delay a call to pause', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('application/dash+xml', undefined)

      legacyAdaptor.setCurrentTime(10)

      mediaPlayer.getState.mockReturnValue(MediaPlayerState.BUFFERING)

      legacyAdaptor.pause({disableAutoResume: false})

      expect(mediaPlayer.pause).not.toHaveBeenCalledWith({disableAutoResume: false})
    })
  })

  describe('isPaused', () => {
    it('should be set to false once we have loaded', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.load('video/mp4', undefined)

      expect(legacyAdaptor.isPaused()).toEqual(false)
    })

    it('should be set to false when we call play', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.play()

      expect(legacyAdaptor.isPaused()).toEqual(false)
    })

    it('should be set to false when we get a playing event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.PLAYING})

      expect(legacyAdaptor.isPaused()).toEqual(false)
    })

    it('should be set to false when we get a time update event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.STATUS})

      expect(legacyAdaptor.isPaused()).toEqual(false)
    })

    it('should be set to true when we get a paused event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.PAUSED})

      expect(legacyAdaptor.isPaused()).toEqual(true)
    })

    it('should be set to true when we get a ended event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.COMPLETE})

      expect(legacyAdaptor.isPaused()).toEqual(true)
    })
  })

  describe('isEnded', () => {
    it('should be set to false on initialisation of the strategy', () => {
      setUpLegacyAdaptor()

      expect(legacyAdaptor.isEnded()).toEqual(false)
    })

    it('should be set to true when we get an ended event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.COMPLETE})

      expect(legacyAdaptor.isEnded()).toEqual(true)
    })

    it('should be set to false when we a playing event is recieved', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.PLAYING})

      expect(legacyAdaptor.isEnded()).toEqual(false)
    })

    it('should be set to false when we get a waiting event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.BUFFERING})

      expect(legacyAdaptor.isEnded()).toEqual(false)
    })

    it('should be set to true when we get a completed event then false when we start initial buffering from playing', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.COMPLETE})

      expect(legacyAdaptor.isEnded()).toEqual(true)

      eventCallbacks({type: MediaPlayerEvent.BUFFERING})

      expect(legacyAdaptor.isEnded()).toBe(false)
    })
  })

  describe('getDuration', () => {
    it('should be set to 0 on initialisation', () => {
      setUpLegacyAdaptor()

      expect(legacyAdaptor.getDuration()).toEqual(0)
    })

    it('should be updated by the playing event duration when the duration is undefined or 0', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10})

      expect(legacyAdaptor.getDuration()).toEqual(10)
    })

    it('should use the local duration when the value is not undefined or 0', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10})

      expect(legacyAdaptor.getDuration()).toEqual(10)

      eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 20})

      expect(legacyAdaptor.getDuration()).toEqual(10)
    })
  })

  describe('getPlayerElement', () => {
    it('should return the mediaPlayer element', () => {
      setUpLegacyAdaptor()

      const videoElement = document.createElement('video')

      mediaPlayer.getPlayerElement.mockReturnValue(videoElement)

      expect(legacyAdaptor.getPlayerElement()).toEqual(videoElement)
    })
  })

  describe('getSeekableRange', () => {
    it('should return the start as 0 and the end as the duration for vod', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10})

      expect(legacyAdaptor.getSeekableRange()).toEqual({start: 0, end: 10})
    })

    it('should return the start/end from the player - time correction', () => {
      testTimeCorrection = 10
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, playableDevice: false})

      mediaPlayer.getSeekableRange.mockReturnValue({start: 110, end: 1010})

      expect(legacyAdaptor.getSeekableRange()).toEqual({start: 100, end: 1000})
    })

    it('should return the start/end from the player when the time correction is 0', () => {
      testTimeCorrection = 0
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, playableDevice: false})

      mediaPlayer.getSeekableRange.mockReturnValue({start: 100, end: 1000})

      expect(legacyAdaptor.getSeekableRange()).toEqual({start: 100, end: 1000})
    })
  })

  describe('getCurrentTime', () => {
    it('should be set when we get a playing event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.PLAYING, currentTime: 10})

      expect(legacyAdaptor.getCurrentTime()).toEqual(10)
    })

    it('should be set with time correction when we get a playing event', () => {
      testTimeCorrection = 5
      setUpLegacyAdaptor({windowType: WindowTypes.STATIC})

      eventCallbacks({type: MediaPlayerEvent.PLAYING, currentTime: 10})

      expect(legacyAdaptor.getCurrentTime()).toEqual(5)
    })

    it('should be set when we get a time update event', () => {
      setUpLegacyAdaptor()

      eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10})

      expect(legacyAdaptor.getCurrentTime()).toEqual(10)
    })

    it('should be set with time correction when we get a time update event', () => {
      testTimeCorrection = 5
      setUpLegacyAdaptor({windowType: WindowTypes.STATIC})

      eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10})

      expect(legacyAdaptor.getCurrentTime()).toEqual(5)
    })
  })

  describe('setCurrentTime', () => {
    it('should set isEnded to false', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.setCurrentTime(10)

      expect(legacyAdaptor.isEnded()).toEqual(false)
    })

    it('should update currentTime to the time value passed in', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.setCurrentTime(10)

      expect(legacyAdaptor.getCurrentTime()).toEqual(10)
    })

    describe('if the player supports playFrom()', () => {
      it('should seek to the time value passed in', () => {
        setUpLegacyAdaptor()

        legacyAdaptor.setCurrentTime(10)

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)
      })

      it('should seek to the time value passed in + time correction', () => {
        testTimeCorrection = 10
        setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

        legacyAdaptor.setCurrentTime(10)

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(20)
      })

      it('should pause after a seek if we were in a paused state, not watching dash and on a capable device', () => {
        setUpLegacyAdaptor()

        eventCallbacks({type: MediaPlayerEvent.PAUSED})

        legacyAdaptor.setCurrentTime(10)

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)

        expect(mediaPlayer.pause).toHaveBeenCalledWith()
      })

      it('should not pause after a seek if we are not on capable device and watching a dash stream', () => {
        setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

        legacyAdaptor.load('application/dash+xml', undefined)

        eventCallbacks({type: MediaPlayerEvent.PAUSED})

        legacyAdaptor.setCurrentTime(10)

        expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10)

        expect(mediaPlayer.pause).not.toHaveBeenCalledWith()
      })
    })

    describe('if the player does not support playFrom()', () => {
      beforeEach(() => {
        delete mediaPlayer.playFrom
      })

      it('should not throw an Error', () => {
        setUpLegacyAdaptor()

        legacyAdaptor.setCurrentTime(10)
      })

      it('should not throw an error for live', () => {
        testTimeCorrection = 10
        setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

        legacyAdaptor.setCurrentTime(10)
      })

      it('should remain paused if we were in a paused state, not watching dash and on a capable device', () => {
        setUpLegacyAdaptor()

        eventCallbacks({type: MediaPlayerEvent.PAUSED})

        legacyAdaptor.setCurrentTime(10)

        expect(legacyAdaptor.isPaused()).toEqual(true)
      })

      it('should not pause after a no-op seek if we are not on capable device and watching a dash stream', () => {
        setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

        legacyAdaptor.load('application/dash+xml', undefined)

        eventCallbacks({type: MediaPlayerEvent.PAUSED})

        legacyAdaptor.setCurrentTime(10)

        expect(mediaPlayer.pause).not.toHaveBeenCalledWith()
      })
    })
  })

  describe('Playback Rate', () => {
    it('calls through to the mediaPlayers setPlaybackRate function', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.setPlaybackRate(2)

      expect(mediaPlayer.setPlaybackRate).toHaveBeenCalledWith(2)
    })

    it('calls through to the mediaPlayers getPlaybackRate function and returns correct value', () => {
      setUpLegacyAdaptor()
      mediaPlayer.getPlaybackRate.mockReturnValue(1.5)

      const rate = legacyAdaptor.getPlaybackRate()

      expect(mediaPlayer.getPlaybackRate).toHaveBeenCalledWith()
      expect(rate).toEqual(1.5)
    })

    it('getPlaybackRate returns 1.0 if mediaPlayer does not have getPlaybackRate function', () => {
      mediaPlayer = {
        addEventCallback: jest.fn()
      }
      setUpLegacyAdaptor()

      expect(legacyAdaptor.getPlaybackRate()).toEqual(1.0)
    })
  })

  describe('reset', () => {
    it('should reset the player', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.reset()

      expect(mediaPlayer.reset).toHaveBeenCalledWith()
    })

    it('should stop the player if we are not in an unstoppable state', () => {
      setUpLegacyAdaptor()

      legacyAdaptor.reset()

      expect(mediaPlayer.stop).toHaveBeenCalledWith()
    })

    it('should not stop the player if we in an unstoppable state', () => {
      setUpLegacyAdaptor()

      mediaPlayer.getState.mockReturnValue(MediaPlayerState.EMPTY)

      legacyAdaptor.reset()

      expect(mediaPlayer.stop).not.toHaveBeenCalledWith()
    })
  })

  describe('tearDown', () => {
    beforeEach(() => {
      setUpLegacyAdaptor()

      legacyAdaptor.tearDown()
    })

    it('should remove all event callbacks', () => {
      expect(mediaPlayer.removeAllEventCallbacks).toHaveBeenCalledWith()
    })

    it('should set isPaused to true', () => {
      expect(legacyAdaptor.isPaused()).toEqual(true)
    })

    it('should return isEnded as false', () => {
      expect(legacyAdaptor.isEnded()).toEqual(false)
    })
  })

  describe('live glitch curtain', () => {
    beforeEach(() => {
      window.bigscreenPlayer.overrides = {
        showLiveCurtain: true
      }
    })

    it('should show curtain for a live restart and we get a seek-attempted event', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('video/mp4', 10)

      eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED})

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()
    })

    it('should show curtain for a live restart to 0 and we get a seek-attempted event', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('video/mp4', 0)

      eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED})

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()
    })

    it('should not show curtain when playing from the live point and we get a seek-attempted event', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('video/mp4')

      eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED})

      expect(mockGlitchCurtain.showCurtain).not.toHaveBeenCalledWith()
    })

    it('should show curtain when the forceBeginPlaybackToEndOfWindow config is set and the playback type is live', () => {
      window.bigscreenPlayer.overrides.forceBeginPlaybackToEndOfWindow = true

      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED})

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()
    })

    it('should not show curtain when the config overide is not set and we are playing live', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED})

      expect(mockGlitchCurtain.showCurtain).not.toHaveBeenCalledWith()
    })

    it('should hide the curtain when we get a seek-finished event', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('video/mp4', 0)

      eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED})

      expect(mockGlitchCurtain.showCurtain).toHaveBeenCalledWith()

      eventCallbacks({type: MediaPlayerEvent.SEEK_FINISHED})

      expect(mockGlitchCurtain.hideCurtain).toHaveBeenCalledWith()
    })

    it('should tear down the curtain on strategy tearDown if it has been shown', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('video/mp4', 0)

      eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED})

      legacyAdaptor.tearDown()

      expect(mockGlitchCurtain.tearDown).toHaveBeenCalledWith()
    })
  })

  describe('dash live on error after exiting seek', () => {
    it('should have called reset on the player', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      // set up the values handleErrorOnExitingSeek && exitingSeek so they are truthy then fire an error event so we restart.
      legacyAdaptor.load('application/dash+xml', undefined)

      legacyAdaptor.setCurrentTime(10)

      eventCallbacks({type: MediaPlayerEvent.ERROR})

      expect(mediaPlayer.reset).toHaveBeenCalledWith()
    })

    it('should initialise the player', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('application/dash+xml', undefined)

      legacyAdaptor.setCurrentTime(10)

      eventCallbacks({type: MediaPlayerEvent.ERROR})

      expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith('video', cdnArray[0].url, 'application/dash+xml', videoContainer, expect.any(Object))
    })

    it('should begin playback from the currentTime', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('application/dash+xml', undefined)

      legacyAdaptor.setCurrentTime(10)

      eventCallbacks({type: MediaPlayerEvent.ERROR})

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(10)
    })

    it('should begin playback from the currentTime + time correction', () => {
      testTimeCorrection = 10
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('application/dash+xml', undefined)

      legacyAdaptor.setCurrentTime(10)

      eventCallbacks({type: MediaPlayerEvent.ERROR})

      expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(20)
    })
  })

  describe('delay pause until after seek', () => {
    it('should pause the player if we were in a paused state on dash live', () => {
      setUpLegacyAdaptor({windowType: WindowTypes.SLIDING})

      legacyAdaptor.load('application/dash+xml', undefined)

      eventCallbacks({type: MediaPlayerEvent.PAUSED})

      legacyAdaptor.setCurrentTime(10)

      expect(mediaPlayer.pause).not.toHaveBeenCalledWith()

      eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: {start: 5}})

      expect(mediaPlayer.pause).toHaveBeenCalledWith()
    })

    it('should pause the player if we were in a paused state for devices with known issues', () => {
      window.bigscreenPlayer.overrides = {
        pauseOnExitSeek: true
      }

      setUpLegacyAdaptor()

      legacyAdaptor.load('video/mp4', undefined)

      eventCallbacks({type: MediaPlayerEvent.PAUSED})

      legacyAdaptor.setCurrentTime(10)

      expect(mediaPlayer.pause).not.toHaveBeenCalledWith()

      eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: {start: 5}})

      expect(mediaPlayer.pause).toHaveBeenCalledWith()
    })
  })

  describe('events', () => {
    it('should publish a playing event', () => {
      setUpLegacyAdaptor()

      const eventCallbackSpy = jest.fn()
      legacyAdaptor.addEventCallback(this, eventCallbackSpy)

      eventCallbacks({type: MediaPlayerEvent.PLAYING})

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING)
    })

    it('should publish a paused event', () => {
      setUpLegacyAdaptor()

      const eventCallbackSpy = jest.fn()
      legacyAdaptor.addEventCallback(this, eventCallbackSpy)

      eventCallbacks({type: MediaPlayerEvent.PAUSED})

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED)
    })

    it('should publish a buffering event', () => {
      setUpLegacyAdaptor()

      const eventCallbackSpy = jest.fn()
      legacyAdaptor.addEventCallback(this, eventCallbackSpy)

      eventCallbacks({type: MediaPlayerEvent.BUFFERING})

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING)
    })

    it('should publish an ended event', () => {
      setUpLegacyAdaptor()

      const eventCallbackSpy = jest.fn()
      legacyAdaptor.addEventCallback(this, eventCallbackSpy)

      eventCallbacks({type: MediaPlayerEvent.COMPLETE})

      expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED)
    })

    it('should publish a time update event', () => {
      setUpLegacyAdaptor()

      const timeUpdateCallbackSpy = jest.fn()
      legacyAdaptor.addTimeUpdateCallback(this, timeUpdateCallbackSpy)

      eventCallbacks({type: MediaPlayerEvent.STATUS})

      expect(timeUpdateCallbackSpy).toHaveBeenCalledWith()
    })

    it('should publish an error event', () => {
      setUpLegacyAdaptor()

      const errorCallbackSpy = jest.fn()
      
      legacyAdaptor.addErrorCallback(this, errorCallbackSpy)
      eventCallbacks({type: MediaPlayerEvent.ERROR})

      expect(errorCallbackSpy).toHaveBeenCalledWith({code: 0, message: 'unknown'})
    })

    it('should publish an error event passing through correct code and message', () => {
      setUpLegacyAdaptor()

      const errorCallbackSpy = jest.fn()

      legacyAdaptor.addErrorCallback(this, errorCallbackSpy)
      eventCallbacks({type: MediaPlayerEvent.ERROR, code: 1, message: 'This is a test error'})

      expect(errorCallbackSpy).toHaveBeenCalledWith({code: 1, message: 'This is a test error'})
    })
  })
})
