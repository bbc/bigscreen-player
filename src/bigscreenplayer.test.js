import MediaState from './models/mediastate'
import WindowTypes from './models/windowtypes'
import PauseTriggers from './models/pausetriggers'
import Plugins from './plugins'
import TransferFormats from './models/transferformats'
import LiveSupport from './models/livesupport'
import BigscreenPlayer from './bigscreenplayer'

import PlayerComponent from './playercomponent'

var mockMediaSources = {
  init: function (media, serverDate, windowType, liveSupport, callbacks) {
    mediaSourcesCallbackErrorSpy = jest.spyOn(callbacks, 'onError')
    if (forceMediaSourcesConstructionFailure) {
      callbacks.onError()
    } else {
      callbacks.onSuccess()
    }
  },

  time: function () {
    return manifestData.time
  },
  tearDown: jest.fn()
}

var mockSubtitlesInstance = {
  enable: jest.fn(),
  disable: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  enabled: jest.fn(),
  available: jest.fn(),
  setPosition: jest.fn(),
  customise: jest.fn(),
  renderExample: jest.fn(),
  clearExample: jest.fn(),
  tearDown: jest.fn()
}

var mockResizer = {
  resize: jest.fn(),
  clear: jest.fn(),
  isResized: jest.fn()
}

jest.mock('./mediasources', () => jest.fn(() => mockMediaSources))
jest.mock('./playercomponent')
jest.mock('./plugins')
jest.mock('./debugger/debugtool')
jest.mock('./resizer', () => jest.fn(() => mockResizer))
jest.mock('./subtitles/subtitles', () => jest.fn(() => mockSubtitlesInstance))

var bigscreenPlayer
var bigscreenPlayerData
var playbackElement
var manifestData
var successCallback
var errorCallback
var noCallbacks = false
var mockEventHook
var mediaSourcesCallbackErrorSpy
var forceMediaSourcesConstructionFailure = false
var mockPlayerComponentInstance

function setupManifestData (options) {
  manifestData = {
    time: options && options.time || {
      windowStartTime: 724000,
      windowEndTime: 4324000,
      correction: 0
    }
  }
}

function initialiseBigscreenPlayer (options) {
  // options = subtitlesAvailable, windowType, windowStartTime, windowEndTime
  options = options || {}

  var windowType = options.windowType || WindowTypes.STATIC
  var subtitlesEnabled = options.subtitlesEnabled || false

  playbackElement = document.createElement('div')
  playbackElement.id = 'app'

  bigscreenPlayerData = {
    media: {
      codec: 'codec',
      urls: [{url: 'videoUrl', cdn: 'cdn'}],
      kind: options.mediaKind || 'video',
      type: 'mimeType',
      bitrate: 'bitrate',
      transferFormat: options.transferFormat
    },
    serverDate: options.serverDate,
    initialPlaybackTime: options.initialPlaybackTime
  }

  if (options.windowStartTime && options.windowEndTime) {
    manifestData.time = {
      windowStartTime: options.windowStartTime,
      windowEndTime: options.windowEndTime
    }
  }

  if (options.subtitlesAvailable) {
    bigscreenPlayerData.media.captions = [
      {
        url: 'captions1',
        segmentLength: 3.84
      },
      {
        url: 'captions2',
        segmentLength: 3.84
      }
    ]
  }

  var callbacks
  if (!noCallbacks) {
    callbacks = {onSuccess: successCallback, onError: errorCallback}
  }
  bigscreenPlayer.init(playbackElement, bigscreenPlayerData, windowType, subtitlesEnabled, callbacks)
}

describe('Bigscreen Player', () => {
  beforeEach(function () {
    setupManifestData()

    mockPlayerComponentInstance = {
      play: jest.fn(),
      pause: jest.fn(),
      isEnded: jest.fn(),
      isPaused: jest.fn(),
      setCurrentTime: jest.fn(),
      getCurrentTime: jest.fn(),
      getDuration: jest.fn(),
      getSeekableRange: jest.fn(),
      getPlayerElement: jest.fn(),
      tearDown: jest.fn(),
      getWindowStartTime: jest.fn(),
      getWindowEndTime: jest.fn(),
      setPlaybackRate: jest.fn(),
      getPlaybackRate: jest.fn()
    }

    jest.spyOn(PlayerComponent, 'getLiveSupport').mockReturnValue(LiveSupport.SEEKABLE)

    PlayerComponent.mockImplementation(function (playbackElement, bigscreenPlayerData, mediaSources, windowType, callback) {
      mockEventHook = callback
      return mockPlayerComponentInstance
    })

    successCallback = jest.fn()
    errorCallback = jest.fn()
    noCallbacks = false

    bigscreenPlayer = BigscreenPlayer()
  })

  afterEach(function () {
    jest.clearAllMocks()
    forceMediaSourcesConstructionFailure = false
    bigscreenPlayer.tearDown()
    bigscreenPlayer = undefined
  })

  describe('init', () => {
    it('should set endOfStream to true when playing live and no initial playback time is set', () => {
      var callback = jest.fn()

      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})
      bigscreenPlayer.registerForTimeUpdates(callback)

      mockEventHook({data: {currentTime: 30}, timeUpdate: true, isBufferingTimeoutError: false})

      expect(callback).toHaveBeenCalledWith({currentTime: 30, endOfStream: true})
    })

    it('should set endOfStream to false when playing live and initialPlaybackTime is 0', () => {
      var callback = jest.fn()

      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING, initialPlaybackTime: 0})

      bigscreenPlayer.registerForTimeUpdates(callback)

      mockEventHook({data: {currentTime: 0}, timeUpdate: true, isBufferingTimeoutError: false})

      expect(callback).toHaveBeenCalledWith({currentTime: 0, endOfStream: false})
    })

    it('should call the supplied error callback if manifest fails to load', () => {
      forceMediaSourcesConstructionFailure = true
      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

      expect(mediaSourcesCallbackErrorSpy).toHaveBeenCalledTimes(1)
      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(successCallback).not.toHaveBeenCalled()
    })

    it('should not attempt to call onSuccess callback if one is not provided', () => {
      noCallbacks = true
      initialiseBigscreenPlayer()

      expect(successCallback).not.toHaveBeenCalled()
    })

    it('should not attempt to call onError callback if one is not provided', () => {
      noCallbacks = true

      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

      expect(errorCallback).not.toHaveBeenCalled()
    })
  })

  describe('getPlayerElement', () => {
    it('Should call through to getPlayerElement on the playback strategy', () => {
      initialiseBigscreenPlayer()

      var mockedVideo = document.createElement('video')

      mockPlayerComponentInstance.getPlayerElement.mockReturnValue(mockedVideo)

      expect(bigscreenPlayer.getPlayerElement()).toBe(mockedVideo)
    })
  })

  describe('registerForStateChanges', () => {
    var callback
    beforeEach(function () {
      callback = jest.fn()
      initialiseBigscreenPlayer()
      bigscreenPlayer.registerForStateChanges(callback)
    })

    it('should fire the callback when a state event comes back from the strategy', () => {
      mockEventHook({data: {state: MediaState.PLAYING}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false})

      callback.mockClear()

      mockEventHook({data: {state: MediaState.WAITING}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: false, endOfStream: false})
    })

    it('should set the isPaused flag to true when waiting after a setCurrentTime', () => {
      mockEventHook({data: {state: MediaState.PLAYING}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false})

      callback.mockClear()

      bigscreenPlayer.setCurrentTime(60)
      mockEventHook({data: {state: MediaState.WAITING}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: true, endOfStream: false})
    })

    it('should set clear the isPaused flag after a waiting event is fired', () => {
      mockEventHook({data: {state: MediaState.PLAYING}})

      bigscreenPlayer.setCurrentTime(60)
      mockEventHook({data: {state: MediaState.WAITING}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: true, endOfStream: false})

      callback.mockClear()

      mockEventHook({data: {state: MediaState.WAITING}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: false, endOfStream: false})
    })

    it('should set the pause trigger to the one set when a pause event comes back from strategy', () => {
      bigscreenPlayer.pause()

      mockEventHook({data: {state: MediaState.PAUSED}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.PAUSED, trigger: PauseTriggers.USER, endOfStream: false})
    })

    it('should set the pause trigger to device when a pause event comes back from strategy and a trigger is not set', () => {
      mockEventHook({data: {state: MediaState.PAUSED}})

      expect(callback).toHaveBeenCalledWith({state: MediaState.PAUSED, trigger: PauseTriggers.DEVICE, endOfStream: false})
    })

    it('should set isBufferingTimeoutError when a fatal error event comes back from strategy', () => {
      mockEventHook({data: {state: MediaState.FATAL_ERROR}, isBufferingTimeoutError: false})

      expect(callback).toHaveBeenCalledWith({state: MediaState.FATAL_ERROR, isBufferingTimeoutError: false, endOfStream: false})
    })

    it('should return a reference to the callback passed in', () => {
      var reference = bigscreenPlayer.registerForStateChanges(callback)

      expect(reference).toBe(callback)
    })
  })

  describe('unregisterForStateChanges', () => {
    it('should remove callback from stateChangeCallbacks', () => {
      var listener1 = jest.fn()
      var listener2 = jest.fn()
      var listener3 = jest.fn()

      initialiseBigscreenPlayer()

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.registerForStateChanges(listener2)
      bigscreenPlayer.registerForStateChanges(listener3)

      mockEventHook({data: {state: MediaState.PLAYING}})

      bigscreenPlayer.unregisterForStateChanges(listener2)

      mockEventHook({data: {state: MediaState.PLAYING}})

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it('should only remove existing callbacks from stateChangeCallbacks', () => {
      initialiseBigscreenPlayer()

      var listener1 = jest.fn()
      var listener2 = jest.fn()

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.unregisterForStateChanges(listener2)

      mockEventHook({data: {state: MediaState.PLAYING}})

      expect(listener1).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false})
    })
  })

  describe('player ready callback', () => {
    describe('on state change event', () => {
      it('should not be called when it is a fatal error', () => {
        initialiseBigscreenPlayer()
        mockEventHook({data: {state: MediaState.FATAL_ERROR}})

        expect(successCallback).not.toHaveBeenCalled()
      })

      it('should be called if playing VOD and event time is valid', () => {
        initialiseBigscreenPlayer()
        mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}})

        expect(successCallback).toHaveBeenCalledTimes(1)
      })

      it('should be called if playing VOD with an initial start time and event time is valid', () => {
        initialiseBigscreenPlayer({initialPlaybackTime: 20})
        mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}})

        expect(successCallback).not.toHaveBeenCalled()
        mockEventHook({data: {state: MediaState.PLAYING, currentTime: 20}})

        expect(successCallback).toHaveBeenCalledTimes(1)
      })

      it('should be called if playing Live and event time is valid', () => {
        setupManifestData({
          transferFormat: TransferFormats.DASH,
          time: {
            windowStartTime: 10,
            windowEndTime: 100
          }
        })

        initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

        mockEventHook({
          data:
          {
            state: MediaState.PLAYING,
            currentTime: 10,
            seekableRange: {
              start: 10,
              end: 100
            }
          }
        })

        expect(successCallback).toHaveBeenCalledTimes(1)
      })

      it('after a valid state change should not be called on succesive valid state changes', () => {
        initialiseBigscreenPlayer()
        mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}})

        expect(successCallback).toHaveBeenCalledTimes(1)
        successCallback.mockClear()
        mockEventHook({data: {state: MediaState.PLAYING, currentTime: 0}})

        expect(successCallback).not.toHaveBeenCalled()
      })

      it('after a valid state change should not be called on succesive valid time updates', () => {
        initialiseBigscreenPlayer()
        mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}})

        expect(successCallback).toHaveBeenCalledTimes(1)
        successCallback.mockClear()
        mockEventHook({data: {currentTime: 0}, timeUpdate: true})

        expect(successCallback).not.toHaveBeenCalled()
      })
    })

    describe('on time update', () => {
      it('should be called if playing VOD and current time is valid', () => {
        initialiseBigscreenPlayer()
        mockEventHook({data: {currentTime: 0}, timeUpdate: true})

        expect(successCallback).toHaveBeenCalledTimes(1)
      })

      it('should be called if playing VOD with an initial start time and current time is valid', () => {
        initialiseBigscreenPlayer({initialPlaybackTime: 20})
        mockEventHook({data: {currentTime: 0}, timeUpdate: true})

        expect(successCallback).not.toHaveBeenCalled()
        mockEventHook({data: {currentTime: 20}, timeUpdate: true})

        expect(successCallback).toHaveBeenCalledTimes(1)
      })

      it('should be called if playing Live and current time is valid', () => {
        setupManifestData({
          transferFormat: TransferFormats.DASH,
          time: {
            windowStartTime: 10,
            windowEndTime: 100
          }
        })
        initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

        mockEventHook({
          data:
          {
            currentTime: 10,
            seekableRange: {
              start: 10,
              end: 100
            }
          },
          timeUpdate: true
        })

        expect(successCallback).toHaveBeenCalledTimes(1)
      })

      it('after a valid time update should not be called on succesive valid time updates', () => {
        initialiseBigscreenPlayer()
        mockEventHook({data: {currentTime: 0}, timeUpdate: true})

        expect(successCallback).toHaveBeenCalledTimes(1)
        successCallback.mockClear()
        mockEventHook({data: {currentTime: 2}, timeUpdate: true})

        expect(successCallback).not.toHaveBeenCalled()
      })

      it('after a valid time update should not be called on succesive valid state changes', () => {
        initialiseBigscreenPlayer()
        mockEventHook({data: {currentTime: 0}, timeUpdate: true})

        expect(successCallback).toHaveBeenCalledTimes(1)
        successCallback.mockClear()
        mockEventHook({data: {state: MediaState.PLAYING, currentTime: 2}})

        expect(successCallback).not.toHaveBeenCalled()
      })
    })
  })

  describe('registerForTimeUpdates', () => {
    it('should call the callback when we get a timeupdate event from the strategy', () => {
      var callback = jest.fn()
      initialiseBigscreenPlayer()
      bigscreenPlayer.registerForTimeUpdates(callback)

      expect(callback).not.toHaveBeenCalled()

      mockEventHook({data: {currentTime: 60}, timeUpdate: true})

      expect(callback).toHaveBeenCalledWith({currentTime: 60, endOfStream: false})
    })

    it('returns a reference to the callback passed in', () => {
      var callback = jest.fn()
      initialiseBigscreenPlayer()

      var reference = bigscreenPlayer.registerForTimeUpdates(callback)

      expect(reference).toBe(callback)
    })
  })

  describe('unregisterForTimeUpdates', () => {
    it('should remove callback from timeUpdateCallbacks', () => {
      initialiseBigscreenPlayer()

      var listener1 = jest.fn()
      var listener2 = jest.fn()
      var listener3 = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(listener1)
      bigscreenPlayer.registerForTimeUpdates(listener2)
      bigscreenPlayer.registerForTimeUpdates(listener3)

      mockEventHook({data: {currentTime: 0}, timeUpdate: true})

      bigscreenPlayer.unregisterForTimeUpdates(listener2)

      mockEventHook({data: {currentTime: 1}, timeUpdate: true})

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it('should only remove existing callbacks from timeUpdateCallbacks', () => {
      initialiseBigscreenPlayer()

      var listener1 = jest.fn()
      var listener2 = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(listener1)
      bigscreenPlayer.unregisterForTimeUpdates(listener2)

      mockEventHook({data: {currentTime: 60}, timeUpdate: true})

      expect(listener1).toHaveBeenCalledWith({currentTime: 60, endOfStream: false})
    })
  })

  describe('registerForSubtitleChanges', () => {
    it('should call the callback when subtitles are turned on/off', () => {
      var callback = jest.fn()
      initialiseBigscreenPlayer()
      bigscreenPlayer.registerForSubtitleChanges(callback)

      expect(callback).not.toHaveBeenCalled()

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(callback).toHaveBeenCalledWith({enabled: true})

      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(callback).toHaveBeenCalledWith({enabled: false})
    })

    it('returns a reference to the callback supplied', () => {
      var callback = jest.fn()

      initialiseBigscreenPlayer()
      var reference = bigscreenPlayer.registerForSubtitleChanges(callback)

      expect(reference).toBe(callback)
    })
  })

  describe('unregisterForSubtitleChanges', () => {
    it('should remove callback from subtitleCallbacks', () => {
      initialiseBigscreenPlayer()

      var listener1 = jest.fn()
      var listener2 = jest.fn()
      var listener3 = jest.fn()

      bigscreenPlayer.registerForSubtitleChanges(listener1)
      bigscreenPlayer.registerForSubtitleChanges(listener2)
      bigscreenPlayer.registerForSubtitleChanges(listener3)

      bigscreenPlayer.setSubtitlesEnabled(true)

      bigscreenPlayer.unregisterForSubtitleChanges(listener2)

      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it('should only remove existing callbacks from subtitleCallbacks', () => {
      initialiseBigscreenPlayer()

      var listener1 = jest.fn()
      var listener2 = jest.fn()

      bigscreenPlayer.registerForSubtitleChanges(listener1)
      bigscreenPlayer.unregisterForSubtitleChanges(listener2)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(listener1).toHaveBeenCalledWith({enabled: true})
    })
  })

  describe('setCurrentTime', () => {
    it('should setCurrentTime on the strategy/playerComponent', () => {
      initialiseBigscreenPlayer()

      bigscreenPlayer.setCurrentTime(60)

      expect(mockPlayerComponentInstance.setCurrentTime).toHaveBeenCalledWith(60)
    })

    it('should not set current time on the strategy/playerComponent if bigscreen player is not initialised', () => {
      bigscreenPlayer.setCurrentTime(60)

      expect(mockPlayerComponentInstance.setCurrentTime).not.toHaveBeenCalled()
    })

    it('should set endOfStream to true when seeking to the end of a simulcast', () => {
      setupManifestData({
        transferFormat: TransferFormats.DASH,
        time: {
          windowStartTime: 10,
          windowEndTime: 100
        }
      })

      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

      var callback = jest.fn()
      var endOfStreamWindow = bigscreenPlayerData.time.windowEndTime - 2

      bigscreenPlayer.registerForTimeUpdates(callback)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: bigscreenPlayerData.time.windowStartTime, end: bigscreenPlayerData.time.windowEndTime})
      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(endOfStreamWindow)

      bigscreenPlayer.setCurrentTime(endOfStreamWindow)

      mockEventHook({data: {currentTime: endOfStreamWindow}, timeUpdate: true})

      expect(callback).toHaveBeenCalledWith({currentTime: endOfStreamWindow, endOfStream: true})
    })

    it('should set endOfStream to false when seeking into a simulcast', () => {
      setupManifestData({
        transferFormat: TransferFormats.DASH,
        time: {
          windowStartTime: 10,
          windowEndTime: 100
        }
      })

      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

      var callback = jest.fn()
      bigscreenPlayer.registerForTimeUpdates(callback)

      var middleOfStreamWindow = bigscreenPlayerData.time.windowEndTime / 2

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: bigscreenPlayerData.time.windowStartTime, end: bigscreenPlayerData.time.windowEndTime})
      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(middleOfStreamWindow)

      bigscreenPlayer.setCurrentTime(middleOfStreamWindow)

      mockEventHook({data: {currentTime: middleOfStreamWindow}, timeUpdate: true})

      expect(callback).toHaveBeenCalledWith({currentTime: middleOfStreamWindow, endOfStream: false})
    })
  })

  describe('Playback Rate', () => {
    it('should setPlaybackRate on the strategy/playerComponent', () => {
      initialiseBigscreenPlayer()

      bigscreenPlayer.setPlaybackRate(2)

      expect(mockPlayerComponentInstance.setPlaybackRate).toHaveBeenCalledWith(2)
    })

    it('should not set playback rate if playerComponent is not initialised', () => {
      bigscreenPlayer.setPlaybackRate(2)

      expect(mockPlayerComponentInstance.setPlaybackRate).not.toHaveBeenCalled()
    })

    it('should call through to get the playback rate when requested', () => {
      initialiseBigscreenPlayer()
      mockPlayerComponentInstance.getPlaybackRate.mockReturnValue(1.5)

      var rate = bigscreenPlayer.getPlaybackRate()

      expect(mockPlayerComponentInstance.getPlaybackRate).toHaveBeenCalled()
      expect(rate).toEqual(1.5)
    })

    it('should not get playback rate if playerComponent is not initialised', () => {
      bigscreenPlayer.getPlaybackRate()

      expect(mockPlayerComponentInstance.getPlaybackRate).not.toHaveBeenCalled()
    })
  })

  describe('getCurrentTime', () => {
    it('should return the current time from the strategy', () => {
      initialiseBigscreenPlayer()

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(10)

      expect(bigscreenPlayer.getCurrentTime()).toBe(10)
    })

    it('should return 0 if bigscreenPlayer is not initialised', () => {
      expect(bigscreenPlayer.getCurrentTime()).toBe(0)
    })
  })

  describe('getMediaKind', () => {
    it('should return the media kind', () => {
      initialiseBigscreenPlayer({mediaKind: 'audio'})

      expect(bigscreenPlayer.getMediaKind()).toBe('audio')
    })
  })

  describe('getWindowType', () => {
    it('should return the window type', () => {
      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

      expect(bigscreenPlayer.getWindowType()).toBe(WindowTypes.SLIDING)
    })
  })

  describe('getSeekableRange', () => {
    it('should return the seekable range from the strategy', () => {
      initialiseBigscreenPlayer()

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: 0, end: 10})

      expect(bigscreenPlayer.getSeekableRange().start).toEqual(0)
      expect(bigscreenPlayer.getSeekableRange().end).toEqual(10)
    })

    it('should return an empty object when bigscreen player has not been initialised', () => {
      expect(bigscreenPlayer.getSeekableRange()).toEqual({})
    })
  })

  describe('isAtLiveEdge', () => {
    it('should return false when playing on demand content', () => {
      initialiseBigscreenPlayer()

      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(false)
    })

    it('should return false when bigscreen-player has not been initialised', () => {
      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(false)
    })

    it('should return true when playing live and current time is within tolerance of seekable range end', () => {
      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(100)
      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: 0, end: 105})

      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(true)
    })

    it('should return false when playing live and current time is outside the tolerance of seekable range end', () => {
      initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING})

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(95)
      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: 0, end: 105})

      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(false)
    })
  })

  describe('getLiveWindowData', () => {
    it('should return undefined values when windowType is static', () => {
      initialiseBigscreenPlayer({windowType: WindowTypes.STATIC})

      expect(bigscreenPlayer.getLiveWindowData()).toEqual({})
    })

    it('should return liveWindowData when the windowType is sliding and manifest is loaded', () => {
      setupManifestData({
        transferFormat: TransferFormats.DASH,
        time: {
          windowStartTime: 1,
          windowEndTime: 2
        }
      })

      var initialisationData = {windowType: WindowTypes.SLIDING, serverDate: new Date(), initialPlaybackTime: new Date().getTime()}
      initialiseBigscreenPlayer(initialisationData)

      expect(bigscreenPlayer.getLiveWindowData()).toEqual({windowStartTime: 1, windowEndTime: 2, serverDate: initialisationData.serverDate, initialPlaybackTime: initialisationData.initialPlaybackTime})
    })

    it('should return a subset of liveWindowData when the windowType is sliding and time block is provided', () => {
      var initialisationData = {windowType: WindowTypes.SLIDING, windowStartTime: 1, windowEndTime: 2, initialPlaybackTime: new Date().getTime()}
      initialiseBigscreenPlayer(initialisationData)

      expect(bigscreenPlayer.getLiveWindowData()).toEqual({serverDate: undefined, windowStartTime: 1, windowEndTime: 2, initialPlaybackTime: initialisationData.initialPlaybackTime})
    })
  })

  describe('getDuration', () => {
    it('should get the duration from the strategy', () => {
      initialiseBigscreenPlayer()

      mockPlayerComponentInstance.getDuration.mockReturnValue(10)

      expect(bigscreenPlayer.getDuration()).toEqual(10)
    })

    it('should return undefined when not initialised', () => {
      expect(bigscreenPlayer.getDuration()).toBeUndefined()
    })
  })

  describe('isPaused', () => {
    it('should get the paused state from the strategy', () => {
      initialiseBigscreenPlayer()

      mockPlayerComponentInstance.isPaused.mockReturnValue(true)

      expect(bigscreenPlayer.isPaused()).toBe(true)
    })

    it('should return true if bigscreenPlayer has not been initialised', () => {
      expect(bigscreenPlayer.isPaused()).toBe(true)
    })
  })

  describe('isEnded', () => {
    it('should get the ended state from the strategy', () => {
      initialiseBigscreenPlayer()

      mockPlayerComponentInstance.isEnded.mockReturnValue(true)

      expect(bigscreenPlayer.isEnded()).toBe(true)
    })

    it('should return false if bigscreenPlayer has not been initialised', () => {
      expect(bigscreenPlayer.isEnded()).toBe(false)
    })
  })

  describe('play', () => {
    it('should call play on the strategy', () => {
      initialiseBigscreenPlayer()

      bigscreenPlayer.play()

      expect(mockPlayerComponentInstance.play).toHaveBeenCalledWith()
    })
  })

  describe('pause', () => {
    it('should call pause on the strategy', () => {
      var opts = {disableAutoResume: true}

      initialiseBigscreenPlayer()

      bigscreenPlayer.pause(opts)

      expect(mockPlayerComponentInstance.pause).toHaveBeenCalledWith(expect.objectContaining({disableAutoResume: true}))
    })

    it('should set pauseTrigger to an app pause if user pause is false', () => {
      var opts = {userPause: false}

      initialiseBigscreenPlayer()

      var callback = jest.fn()

      bigscreenPlayer.registerForStateChanges(callback)

      bigscreenPlayer.pause(opts)

      mockEventHook({data: {state: MediaState.PAUSED}})

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({trigger: PauseTriggers.APP}))
    })

    it('should set pauseTrigger to a user pause if user pause is true', () => {
      var opts = {userPause: true}

      initialiseBigscreenPlayer()

      var callback = jest.fn()

      bigscreenPlayer.registerForStateChanges(callback)

      bigscreenPlayer.pause(opts)

      mockEventHook({data: {state: MediaState.PAUSED}})

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({trigger: PauseTriggers.USER}))
    })
  })

  describe('setSubtitlesEnabled', () => {
    it('should turn subtitles on/off when a value is passed in', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.enable).toHaveBeenCalledTimes(1)

      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(mockSubtitlesInstance.disable).toHaveBeenCalledTimes(1)
    })

    it('should show subtitles when called with true', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.show).toHaveBeenCalledTimes(1)
    })

    it('should hide subtitleswhen called with false', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1)
    })

    it('should not show subtitles when resized', () => {
      initialiseBigscreenPlayer()
      mockResizer.isResized.mockReturnValue(true)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.show).not.toHaveBeenCalled()
    })

    it('should not hide subtitles when resized', () => {
      initialiseBigscreenPlayer()
      mockResizer.isResized.mockReturnValue(true)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.hide).not.toHaveBeenCalled()
    })
  })

  describe('isSubtitlesEnabled', () => {
    it('calls through to Subtitles enabled when called', () => {
      initialiseBigscreenPlayer()

      bigscreenPlayer.isSubtitlesEnabled()

      expect(mockSubtitlesInstance.enabled).toHaveBeenCalledWith()
    })
  })

  describe('isSubtitlesAvailable', () => {
    it('calls through to Subtitles available when called', () => {
      initialiseBigscreenPlayer()

      bigscreenPlayer.isSubtitlesAvailable()

      expect(mockSubtitlesInstance.available).toHaveBeenCalledWith()
    })
  })

  describe('customiseSubtitles', () => {
    it('passes through custom styles to Subtitles customise', () => {
      initialiseBigscreenPlayer()
      var customStyleObj = { size: 0.7 }
      bigscreenPlayer.customiseSubtitles(customStyleObj)

      expect(mockSubtitlesInstance.customise).toHaveBeenCalledWith(customStyleObj)
    })
  })

  describe('renderSubtitleExample', () => {
    it('calls Subtitles renderExample with correct values', () => {
      initialiseBigscreenPlayer()
      var exampleUrl = ''
      var customStyleObj = { size: 0.7 }
      var safePosititon = { left: 30, top: 0 }
      bigscreenPlayer.renderSubtitleExample(exampleUrl, customStyleObj, safePosititon)

      expect(mockSubtitlesInstance.renderExample).toHaveBeenCalledWith(exampleUrl, customStyleObj, safePosititon)
    })
  })

  describe('clearSubtitleExample', () => {
    it('calls Subtitles clearExample', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.clearSubtitleExample()

      expect(mockSubtitlesInstance.clearExample).toHaveBeenCalledTimes(1)
    })
  })

  describe('setTransportControlsPosition', () => {
    it('should call through to Subtitles setPosition function', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.setTransportControlsPosition()

      expect(mockSubtitlesInstance.setPosition).toHaveBeenCalledTimes(1)
    })
  })

  describe('resize', () => {
    it('calls resizer with correct values', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.resize(10, 10, 160, 90, 100)

      expect(mockResizer.resize).toHaveBeenCalledWith(playbackElement, 10, 10, 160, 90, 100)
    })

    it('hides subtitles when resized', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.resize(10, 10, 160, 90, 100)

      expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1)
    })
  })

  describe('clearResize', () => {
    it('calls resizers clear function', () => {
      initialiseBigscreenPlayer()
      bigscreenPlayer.clearResize()

      expect(mockResizer.clear).toHaveBeenCalledWith(playbackElement)
    })

    it('shows subtitles if subtitles are enabled', () => {
      mockSubtitlesInstance.enabled.mockReturnValue(true)

      initialiseBigscreenPlayer()
      bigscreenPlayer.clearResize()

      expect(mockSubtitlesInstance.show).toHaveBeenCalledTimes(1)
    })

    it('hides subtitles if subtitles are disabled', () => {
      mockSubtitlesInstance.enabled.mockReturnValue(false)

      initialiseBigscreenPlayer()
      bigscreenPlayer.clearResize()

      expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1)
    })
  })

  describe('canSeek', () => {
    it('should return true when in VOD playback', () => {
      initialiseBigscreenPlayer()

      expect(bigscreenPlayer.canSeek()).toBe(true)
    })

    describe('live', () => {
      it('should return true when it can seek', () => {
        mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: 0, end: 60})

        initialiseBigscreenPlayer({
          windowType: WindowTypes.SLIDING
        })

        expect(bigscreenPlayer.canSeek()).toBe(true)
      })

      it('should return false when seekable range is infinite', () => {
        mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: 0, end: Infinity})

        initialiseBigscreenPlayer({
          windowType: WindowTypes.SLIDING
        })

        expect(bigscreenPlayer.canSeek()).toBe(false)
      })

      it('should return false when window length less than four minutes', () => {
        setupManifestData({
          transferFormat: 'dash',
          time: {
            windowStartTime: 0,
            windowEndTime: 239999,
            correction: 0
          }
        })
        mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: 0, end: 60})

        initialiseBigscreenPlayer({
          windowType: WindowTypes.SLIDING
        })

        expect(bigscreenPlayer.canSeek()).toBe(false)
      })

      it('should return false when device does not support seeking', () => {
        mockPlayerComponentInstance.getSeekableRange.mockReturnValue({start: 0, end: 60})

        jest.spyOn(PlayerComponent, 'getLiveSupport').mockReturnValue(LiveSupport.PLAYABLE)

        initialiseBigscreenPlayer({
          windowType: WindowTypes.SLIDING
        })

        expect(bigscreenPlayer.canSeek()).toBe(false)
      })
    })
  })

  describe('canPause', () => {
    it('VOD should return true', () => {
      initialiseBigscreenPlayer()

      expect(bigscreenPlayer.canPause()).toBe(true)
    })

    describe('LIVE', () => {
      it('should return true when it can pause', () => {
        jest.spyOn(PlayerComponent, 'getLiveSupport').mockReturnValue(LiveSupport.RESTARTABLE)

        initialiseBigscreenPlayer({
          windowType: WindowTypes.SLIDING
        })

        expect(bigscreenPlayer.canPause()).toBe(true)
      })

      it('should be false when window length less than four minutes', () => {
        setupManifestData({
          transferFormat: TransferFormats.DASH,
          time: {
            windowStartTime: 0,
            windowEndTime: 239999,
            correction: 0
          }
        })
        jest.spyOn(PlayerComponent, 'getLiveSupport').mockReturnValue(LiveSupport.RESTARTABLE)

        initialiseBigscreenPlayer({
          windowType: WindowTypes.SLIDING
        })

        expect(bigscreenPlayer.canPause()).toBe(false)
      })

      it('should return false when device does not support pausing', () => {
        jest.spyOn(PlayerComponent, 'getLiveSupport').mockReturnValue(LiveSupport.PLAYABLE)

        initialiseBigscreenPlayer({
          windowType: WindowTypes.SLIDING
        })

        expect(bigscreenPlayer.canPause()).toBe(false)
      })
    })
  })

  describe('convertVideoTimeSecondsToEpochMs', () => {
    it('converts video time to epoch time when windowStartTime is supplied', () => {
      setupManifestData({
        time: {
          windowStartTime: 4200,
          windowEndTime: 150000000
        }
      })

      initialiseBigscreenPlayer({
        windowType: WindowTypes.SLIDING
      })

      expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBe(4200 + 1000000)
    })

    it('does not convert video time to epoch time when windowStartTime is not supplied', () => {
      setupManifestData({
        time: {
          windowStartTime: undefined,
          windowEndTime: undefined
        }
      })

      initialiseBigscreenPlayer()

      expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBeUndefined()
    })
  })

  describe('covertEpochMsToVideoTimeSeconds', () => {
    it('converts epoch time to video time when windowStartTime is available', () => {
      // windowStartTime - 16 January 2019 12:00:00
      // windowEndTime - 16 January 2019 14:00:00
      setupManifestData({
        time: {
          windowStartTime: 1547640000000,
          windowEndTime: 1547647200000
        }
      })

      initialiseBigscreenPlayer({
        windowType: WindowTypes.SLIDING
      })

      // Time to convert - 16 January 2019 13:00:00 - one hour (3600 seconds)
      expect(bigscreenPlayer.convertEpochMsToVideoTimeSeconds(1547643600000)).toBe(3600)
    })

    it('does not convert epoch time to video time when windowStartTime is not available', () => {
      setupManifestData({
        time: {
          windowStartTime: undefined,
          windowEndTime: undefined
        }
      })

      initialiseBigscreenPlayer()

      expect(bigscreenPlayer.convertEpochMsToVideoTimeSeconds(1547643600000)).toBeUndefined()
    })
  })

  describe('registerPlugin', () => {
    it('should register a specific plugin', () => {
      var mockPlugin = {
        onError: jest.fn()
      }

      initialiseBigscreenPlayer()
      bigscreenPlayer.registerPlugin(mockPlugin)

      expect(Plugins.registerPlugin).toHaveBeenCalledWith(mockPlugin)
    })
  })

  describe('unregister plugin', () => {
    it('should remove a specific plugin', () => {
      var mockPlugin = {
        onError: jest.fn()
      }

      initialiseBigscreenPlayer()

      bigscreenPlayer.unregisterPlugin(mockPlugin)

      expect(Plugins.unregisterPlugin).toHaveBeenCalledWith(mockPlugin)
    })
  })

  describe('mock', () => {
    afterEach(function () {
      bigscreenPlayer.unmock()
    })

    it('should return a mock object with jasmine spies on the same interface as the main api', () => {
      initialiseBigscreenPlayer()

      var moduleKeys = Object.keys(bigscreenPlayer)
      bigscreenPlayer.mockJasmine()
      var mockKeys = Object.keys(bigscreenPlayer)

      expect(mockKeys).toEqual(expect.objectContaining(moduleKeys))
    })

    it('should return a mock object on the same interface as the main api', () => {
      initialiseBigscreenPlayer()

      var moduleKeys = Object.keys(bigscreenPlayer)
      bigscreenPlayer.mock()
      var mockKeys = Object.keys(bigscreenPlayer)

      expect(mockKeys).toEqual(expect.objectContaining(moduleKeys))
    })
  })
})
