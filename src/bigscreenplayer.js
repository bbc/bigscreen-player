/**
 * @module bigscreenplayer/bigscreenplayer
 */
import MediaState from './models/mediastate'
import PlayerComponent from './playercomponent'
import PauseTriggers from './models/pausetriggers'
import DynamicWindowUtils from './dynamicwindowutils'
import WindowTypes from './models/windowtypes'
import MockBigscreenPlayer from './mockbigscreenplayer'
import Plugins from './plugins'
import Chronicle from './debugger/chronicle'
import DebugTool from './debugger/debugtool'
import SlidingWindowUtils from './utils/timeutils'
import callCallbacks from './utils/callcallbacks'
import MediaSources from './mediasources'
import Version from './version'
import Resizer from './resizer'
import ReadyHelper from './readyhelper'
import Subtitles from './subtitles/subtitles'
import './typedefs'

function BigscreenPlayer () {
  let stateChangeCallbacks = []
  let timeUpdateCallbacks = []
  let subtitleCallbacks = []

  let playerReadyCallback
  let playerErrorCallback
  let mediaKind
  let initialPlaybackTimeEpoch
  let serverDate
  let playerComponent
  let resizer
  let pauseTrigger
  let isSeeking = false
  let endOfStream
  let windowType
  let mediaSources
  let playbackElement
  let readyHelper
  let subtitles

  const END_OF_STREAM_TOLERANCE = 10

  function mediaStateUpdateCallback (evt) {
    if (evt.timeUpdate) {
      DebugTool.time(evt.data.currentTime)
      callCallbacks(timeUpdateCallbacks, {
        currentTime: evt.data.currentTime,
        endOfStream: endOfStream
      })
    } else {
      let stateObject = {state: evt.data.state}

      if (evt.data.state === MediaState.PAUSED) {
        endOfStream = false
        stateObject.trigger = pauseTrigger || PauseTriggers.DEVICE
        pauseTrigger = undefined
      }

      if (evt.data.state === MediaState.FATAL_ERROR) {
        stateObject = {
          state: MediaState.FATAL_ERROR,
          isBufferingTimeoutError: evt.isBufferingTimeoutError,
          code: evt.code,
          message: evt.message
        }
      }

      if (evt.data.state === MediaState.WAITING) {
        stateObject.isSeeking = isSeeking
        isSeeking = false
      }

      stateObject.endOfStream = endOfStream
      DebugTool.event(stateObject)

      callCallbacks(stateChangeCallbacks, stateObject)
    }

    if (evt.data.seekableRange) {
      DebugTool.keyValue({key: 'seekableRangeStart', value: deviceTimeToDate(evt.data.seekableRange.start)})
      DebugTool.keyValue({key: 'seekableRangeEnd', value: deviceTimeToDate(evt.data.seekableRange.end)})
    }

    if (evt.data.duration) {
      DebugTool.keyValue({key: 'duration', value: evt.data.duration})
    }

    if (playerComponent && readyHelper) {
      readyHelper.callbackWhenReady(evt)
    }
  }

  function deviceTimeToDate (time) {
    if (getWindowStartTime()) {
      return new Date(convertVideoTimeSecondsToEpochMs(time))
    } else {
      return new Date(time * 1000)
    }
  }

  function convertVideoTimeSecondsToEpochMs (seconds) {
    return getWindowStartTime() ? getWindowStartTime() + (seconds * 1000) : null
  }

  function bigscreenPlayerDataLoaded (bigscreenPlayerData, enableSubtitles) {
    if (windowType !== WindowTypes.STATIC) {
      bigscreenPlayerData.time = mediaSources.time()
      serverDate = bigscreenPlayerData.serverDate

      initialPlaybackTimeEpoch = bigscreenPlayerData.initialPlaybackTime
      // overwrite initialPlaybackTime with video time (it comes in as epoch time for a sliding/growing window)
      bigscreenPlayerData.initialPlaybackTime = SlidingWindowUtils.convertToSeekableVideoTime(bigscreenPlayerData.initialPlaybackTime, bigscreenPlayerData.time.windowStartTime)
    }

    mediaKind = bigscreenPlayerData.media.kind
    endOfStream = windowType !== WindowTypes.STATIC && (!bigscreenPlayerData.initialPlaybackTime && bigscreenPlayerData.initialPlaybackTime !== 0)

    readyHelper = new ReadyHelper(
      bigscreenPlayerData.initialPlaybackTime,
      windowType,
      PlayerComponent.getLiveSupport(),
      playerReadyCallback
    )
    playerComponent = new PlayerComponent(
      playbackElement,
      bigscreenPlayerData,
      mediaSources,
      windowType,
      mediaStateUpdateCallback,
      playerErrorCallback
    )

    subtitles = Subtitles(
      playerComponent,
      enableSubtitles,
      playbackElement,
      bigscreenPlayerData.media.subtitleCustomisation,
      mediaSources,
      callSubtitlesCallbacks
    )
  }

  function getWindowStartTime () {
    return mediaSources && mediaSources.time().windowStartTime
  }

  function getWindowEndTime () {
    return mediaSources && mediaSources.time().windowEndTime
  }

  function toggleDebug () {
    if (playerComponent) {
      DebugTool.toggleVisibility()
    }
  }

  function callSubtitlesCallbacks (enabled) {
    callCallbacks(subtitleCallbacks, { enabled: enabled })
  }

  function setSubtitlesEnabled (enabled) {
    enabled ? subtitles.enable() : subtitles.disable()
    callSubtitlesCallbacks(enabled)

    if (!resizer.isResized()) {
      enabled ? subtitles.show() : subtitles.hide()
    }
  }

  function isSubtitlesEnabled () {
    return subtitles ? subtitles.enabled() : false
  }

  function isSubtitlesAvailable () {
    return subtitles ? subtitles.available() : false
  }

  return /** @alias module:bigscreenplayer/bigscreenplayer */{

    /**
     * Call first to initialise bigscreen player for playback.
     * @function
     * @name init
     * @param {HTMLDivElement} playbackElement - The Div element where content elements should be rendered
     * @param {BigscreenPlayerData} bigscreenPlayerData
     * @param {WindowTypes} newWindowType
     * @param {boolean} enableSubtitles - Enable subtitles on initialisation
     * @param {InitCallbacks} callbacks
     */
    init: (newPlaybackElement, bigscreenPlayerData, newWindowType, enableSubtitles, callbacks) => {
      playbackElement = newPlaybackElement
      Chronicle.init()
      resizer = Resizer()
      DebugTool.setRootElement(playbackElement)
      DebugTool.keyValue({key: 'framework-version', value: Version})
      windowType = newWindowType
      serverDate = bigscreenPlayerData.serverDate
      if (!callbacks) {
        callbacks = {}
      }

      playerReadyCallback = callbacks.onSuccess
      playerErrorCallback = callbacks.onError

      const mediaSourceCallbacks = {
        onSuccess: () => bigscreenPlayerDataLoaded(bigscreenPlayerData, enableSubtitles),
        onError: (error) => {
          if (callbacks.onError) {
            callbacks.onError(error)
          }
        }
      }

      mediaSources = MediaSources()

      // Backwards compatibility with Old API; to be removed on Major Version Update
      if (bigscreenPlayerData.media && !bigscreenPlayerData.media.captions && bigscreenPlayerData.media.captionsUrl) {
        bigscreenPlayerData.media.captions = [{
          url: bigscreenPlayerData.media.captionsUrl
        }]
      }

      mediaSources.init(bigscreenPlayerData.media, serverDate, windowType, getLiveSupport(), mediaSourceCallbacks)
    },

    /**
     * Should be called at the end of all playback sessions. Resets state and clears any UI.
     * @function
     * @name tearDown
     */
    tearDown: function () {
      if (subtitles) {
        subtitles.tearDown()
        subtitles = undefined
      }

      if (playerComponent) {
        playerComponent.tearDown()
        playerComponent = undefined
      }

      if (mediaSources) {
        mediaSources.tearDown()
        mediaSources = undefined
      }

      stateChangeCallbacks = []
      timeUpdateCallbacks = []
      subtitleCallbacks = []
      endOfStream = undefined
      mediaKind = undefined
      pauseTrigger = undefined
      windowType = undefined
      resizer = undefined
      this.unregisterPlugin()
      DebugTool.tearDown()
      Chronicle.tearDown()
    },

    /**
     * Pass a function to call whenever the player transitions state.
     * @see {@link module:models/mediastate}
     * @function
     * @param {Function} callback
     */
    registerForStateChanges: (callback) => {
      stateChangeCallbacks.push(callback)
      return callback
    },

    /**
     * Unregisters a previously registered callback.
     * @function
     * @param {Function} callback
     */
    unregisterForStateChanges: (callback) => {
      stateChangeCallbacks = stateChangeCallbacks.filter(function (existingCallback) {
        return callback !== existingCallback
      })
    },

    /**
     * Pass a function to call whenever the player issues a time update.
     * @function
     * @param {Function} callback
     */
    registerForTimeUpdates: (callback) => {
      timeUpdateCallbacks.push(callback)
      return callback
    },

    /**
     * Unregisters a previously registered callback.
     * @function
     * @param {Function} callback
     */
    unregisterForTimeUpdates: (callback) => {
      timeUpdateCallbacks = timeUpdateCallbacks.filter(function (existingCallback) {
        return callback !== existingCallback
      })
    },

    /**
     * Pass a function to be called whenever subtitles are enabled or disabled.
     * @function
     * @param {Function} callback
     */
    registerForSubtitleChanges: (callback) => {
      subtitleCallbacks.push(callback)
      return callback
    },

    /**
     * Unregisters a previously registered callback for changes to subtitles.
     * @function
     * @param {Function} callback
     */
    unregisterForSubtitleChanges: (callback) => {
      subtitleCallbacks = subtitleCallbacks.filter(function (existingCallback) {
        return callback !== existingCallback
      })
    },

    /**
     * Sets the current time of the media asset.
     * @function
     * @param {Number} time - In seconds
     */
    setCurrentTime: function (time) {
      DebugTool.apicall('setCurrentTime')
      if (playerComponent) {
        // this flag must be set before calling into playerComponent.setCurrentTime - as this synchronously fires a WAITING event (when native strategy).
        isSeeking = true
        playerComponent.setCurrentTime(time)
        endOfStream = windowType !== WindowTypes.STATIC && Math.abs(this.getSeekableRange().end - time) < END_OF_STREAM_TOLERANCE
      }
    },

    setPlaybackRate: (rate) => {
      if (playerComponent) {
        playerComponent.setPlaybackRate(rate)
      }
    },

    getPlaybackRate: () => playerComponent && playerComponent.getPlaybackRate(),

    /**
     * Returns the media asset's current time in seconds.
     * @function
     */
    getCurrentTime: () => playerComponent && playerComponent.getCurrentTime() || 0,

    /**
     * Returns the current media kind.
     * 'audio' or 'video'
     * @function
     */
    getMediaKind: () => mediaKind,

    /**
     * Returns the current window type.
     * @see {@link module:bigscreenplayer/models/windowtypes}
     * @function
     */
    getWindowType: () => windowType,

    /**
     * Returns an object including the current start and end times.
     * @function
     * @returns {Object} {start: Number, end: Number}
     */
    getSeekableRange: () => playerComponent ? playerComponent.getSeekableRange() : {},

    /**
    * @function
    * @returns {boolean} Returns true if media is initialised and playing a live stream within a tolerance of the end of the seekable range (10 seconds).
    */
    isPlayingAtLiveEdge: function () {
      return !!playerComponent && windowType !== WindowTypes.STATIC && Math.abs(this.getSeekableRange().end - this.getCurrentTime()) < END_OF_STREAM_TOLERANCE
    },

    /**
     * @function
     * @return {Object} An object of the shape {windowStartTime: Number, windowEndTime: Number, initialPlaybackTime: Number, serverDate: Date}
     */
    getLiveWindowData: () => {
      if (windowType === WindowTypes.STATIC) {
        return {}
      }

      return {
        windowStartTime: getWindowStartTime(),
        windowEndTime: getWindowEndTime(),
        initialPlaybackTime: initialPlaybackTimeEpoch,
        serverDate: serverDate
      }
    },

    /**
     * @function
     * @returns the duration of the media asset.
     */
    getDuration: () => playerComponent && playerComponent.getDuration(),

    /**
     * @function
     * @returns if the player is paused.
     */
    isPaused: () => playerComponent ? playerComponent.isPaused() : true,

    /**
     * @function
     * @returns if the media asset has ended.
     */
    isEnded: () => playerComponent ? playerComponent.isEnded() : false,

    /**
     * Play the media assest from the current point in time.
     * @function
     */
    play: () => {
      DebugTool.apicall('play')
      playerComponent.play()
    },
    /**
     * Pause the media asset.
     * @function
     * @param {*} opts
     * @param {boolean} opts.userPause
     * @param {boolean} opts.disableAutoResume
     */
    pause: (opts) => {
      DebugTool.apicall('pause')
      pauseTrigger = opts && opts.userPause === false ? PauseTriggers.APP : PauseTriggers.USER
      playerComponent.pause(opts)
    },

    resize: (top, left, width, height, zIndex) => {
      subtitles.hide()
      resizer.resize(playbackElement, top, left, width, height, zIndex)
    },

    clearResize: () => {
      if (subtitles.enabled()) {
        subtitles.show()
      } else {
        subtitles.hide()
      }
      resizer.clear(playbackElement)
    },

    /**
     * Set whether or not subtitles should be enabled.
     * @function
     * @param {boolean} value
     */
    setSubtitlesEnabled: setSubtitlesEnabled,

    /**
     * @function
     * @return if subtitles are currently enabled.
     */
    isSubtitlesEnabled: isSubtitlesEnabled,

    /**
     * @function
     * @return Returns whether or not subtitles are currently enabled.
     */
    isSubtitlesAvailable: isSubtitlesAvailable,

    areSubtitlesCustomisable: () => {
      return !(window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles)
    },

    customiseSubtitles: (styleOpts) => {
      if (subtitles) {
        subtitles.customise(styleOpts)
      }
    },

    renderSubtitleExample: (xmlString, styleOpts, safePosition) => {
      if (subtitles) {
        subtitles.renderExample(xmlString, styleOpts, safePosition)
      }
    },

    clearSubtitleExample: () => {
      if (subtitles) {
        subtitles.clearExample()
      }
    },

    /**
     *
     * An enum may be used to set the on-screen position of any transport controls
     * (work in progress to remove this - UI concern).
     * @function
     * @param {*} position
     */
    setTransportControlsPosition: (position) => {
      if (subtitles) {
        subtitles.setPosition(position)
      }
    },

    /**
     * @function
     * @return Returns whether the current media asset is seekable.
     */
    canSeek: function () {
      return windowType === WindowTypes.STATIC || DynamicWindowUtils.canSeek(getWindowStartTime(), getWindowEndTime(), getLiveSupport(), this.getSeekableRange())
    },

    /**
     * @function
     * @return Returns whether the current media asset is pausable.
     */
    canPause: () => {
      return windowType === WindowTypes.STATIC || DynamicWindowUtils.canPause(getWindowStartTime(), getWindowEndTime(), getLiveSupport())
    },

    /**
     * Return a mock for in place testing.
     * @function
     * @param {*} opts
     */
    mock: function (opts) { MockBigscreenPlayer.mock(this, opts) },

    /**
     * Unmock the player.
     * @function
     */
    unmock: function () { MockBigscreenPlayer.unmock(this) },

    /**
     * Return a mock for unit tests.
     * @function
     * @param {*} opts
     */
    mockJasmine: function (opts) { MockBigscreenPlayer.mockJasmine(this, opts) },

    /**
     * Register a plugin for extended events.
     * @function
     * @param {*} plugin
     */
    registerPlugin: (plugin) => Plugins.registerPlugin(plugin),

    /**
     * Unregister a previously registered plugin.
     * @function
     * @param {*} plugin
     */
    unregisterPlugin: (plugin) => Plugins.unregisterPlugin(plugin),

    /**
     * Returns an object with a number of functions related to the ability to transition state
     * given the current state and the playback strategy in use.
     * @function
     */
    transitions: () => playerComponent ? playerComponent.transitions() : {},

    /**
     * @function
     * @return The media element currently being used.
     */
    getPlayerElement: () => playerComponent && playerComponent.getPlayerElement(),

    /**
     * @function
     * @param {Number} epochTime - Unix Epoch based time in milliseconds.
     * @return the time in seconds within the current sliding window.
     */
    convertEpochMsToVideoTimeSeconds: (epochTime) => {
      return getWindowStartTime() ? Math.floor((epochTime - getWindowStartTime()) / 1000) : null
    },

    /**
     * @function
     * @return The runtime version of the library.
     */
    getFrameworkVersion: () => {
      return Version
    },

    /**
     * @function
     * @param {Number} time - Seconds
     * @return the time in milliseconds within the current sliding window.
     */
    convertVideoTimeSecondsToEpochMs: convertVideoTimeSecondsToEpochMs,

    /**
     * Toggle the visibility of the debug tool overlay.
     * @function
     */
    toggleDebug: toggleDebug,

    /**
     * @function
     * @return {Object} - Key value pairs of available log levels
     */
    getLogLevels: () => DebugTool.logLevels,

    /**
     * @function
     * @param logLevel -  log level to display @see getLogLevels
     */
    setLogLevel: DebugTool.setLogLevel,
    getDebugLogs: () => Chronicle.retrieve()
  }
}

/**
 * @function
 * @param {TALDevice} device
 * @return the live support of the device.
 */
function getLiveSupport () {
  return PlayerComponent.getLiveSupport()
}

BigscreenPlayer.getLiveSupport = getLiveSupport

BigscreenPlayer.version = Version

export default BigscreenPlayer
