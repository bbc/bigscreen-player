/**
 * @module bigscreenplayer/bigscreenplayer
 */
import MediaState from "./models/mediastate"
import PlayerComponent from "./playercomponent"
import PauseTriggers from "./models/pausetriggers"
import DynamicWindowUtils from "./dynamicwindowutils"
import WindowTypes from "./models/windowtypes"
import MockBigscreenPlayer from "./mockbigscreenplayer"
import Plugins from "./plugins"
import DebugTool from "./debugger/debugtool"
import SlidingWindowUtils from "./utils/timeutils"
import callCallbacks from "./utils/callcallbacks"
import MediaSources from "./mediasources"
import Version from "./version"
import Resizer from "./resizer"
import ReadyHelper from "./readyhelper"
import Subtitles from "./subtitles/subtitles"
// TODO: Remove when this becomes a TypeScript file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { InitData, InitCallbacks, SubtitlesCustomisationOptions } from "./types"

function BigscreenPlayer() {
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

  function mediaStateUpdateCallback(evt) {
    if (evt.timeUpdate) {
      callCallbacks(timeUpdateCallbacks, {
        currentTime: evt.data.currentTime,
        endOfStream,
      })
    } else {
      let stateObject = { state: evt.data.state }

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
          message: evt.message,
        }
      }

      if (evt.data.state === MediaState.WAITING) {
        stateObject.isSeeking = isSeeking
        isSeeking = false
      }

      stateObject.endOfStream = endOfStream
      DebugTool.statechange(evt.data.state)

      callCallbacks(stateChangeCallbacks, stateObject)
    }

    if (evt.data.seekableRange) {
      DebugTool.staticMetric("seekable-range", [
        deviceTimeToDate(evt.data.seekableRange.start).getTime(),
        deviceTimeToDate(evt.data.seekableRange.end).getTime(),
      ])
    }

    if (evt.data.duration) {
      DebugTool.staticMetric("duration", evt.data.duration)
    }

    if (playerComponent && readyHelper) {
      readyHelper.callbackWhenReady(evt)
    }
  }

  function deviceTimeToDate(time) {
    return getWindowStartTime() ? new Date(convertVideoTimeSecondsToEpochMs(time)) : new Date(time * 1000)
  }

  function convertPresentationTimeToMediaTime(presentationTimeInSeconds) {
    return presentationTimeInSeconds + mediaSources.time().presentationTimeOffsetSeconds || 0
  }

  function convertMediaTimeToPresentationTime(presentationTimeInSeconds) {
    return presentationTimeInSeconds - mediaSources.time().presentationTimeOffsetSeconds || 0
  }

  function convertVideoTimeSecondsToEpochMs(seconds) {
    return getWindowStartTime() ? getWindowStartTime() + seconds * 1000 : null
  }

  function bigscreenPlayerDataLoaded(bigscreenPlayerData, enableSubtitles) {
    if (windowType !== WindowTypes.STATIC) {
      serverDate = bigscreenPlayerData.serverDate

      initialPlaybackTimeEpoch = bigscreenPlayerData.initialPlaybackTime
      // overwrite initialPlaybackTime with video time (it comes in as epoch time for a sliding/growing window)
      bigscreenPlayerData.initialPlaybackTime = SlidingWindowUtils.convertToSeekableVideoTime(
        bigscreenPlayerData.initialPlaybackTime,
        mediaSources.time().windowStartTime
      )
    }

    mediaKind = bigscreenPlayerData.media.kind
    endOfStream =
      windowType !== WindowTypes.STATIC &&
      !bigscreenPlayerData.initialPlaybackTime &&
      bigscreenPlayerData.initialPlaybackTime !== 0

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

  function getWindowStartTime() {
    return mediaSources && mediaSources.time().windowStartTime
  }

  function getWindowEndTime() {
    return mediaSources && mediaSources.time().windowEndTime
  }

  function toggleDebug() {
    if (playerComponent) {
      DebugTool.toggleVisibility()
    }
  }

  function callSubtitlesCallbacks(enabled) {
    callCallbacks(subtitleCallbacks, { enabled })
  }

  function setSubtitlesEnabled(enabled) {
    enabled ? subtitles.enable() : subtitles.disable()
    callSubtitlesCallbacks(enabled)

    if (!resizer.isResized()) {
      enabled ? subtitles.show() : subtitles.hide()
    }
  }

  function isSubtitlesEnabled() {
    return subtitles ? subtitles.enabled() : false
  }

  function isSubtitlesAvailable() {
    return subtitles ? subtitles.available() : false
  }

  return /** @alias module:bigscreenplayer/bigscreenplayer */ {
    /**
     * Call first to initialise bigscreen player for playback.
     * @function
     * @name init
     * @param {HTMLDivElement} playbackElement - The Div element where content elements should be rendered
     * @param {InitData} bigscreenPlayerData
     * @param {WindowTypes} newWindowType
     * @param {boolean} enableSubtitles - Enable subtitles on initialisation
     * @param {InitCallbacks} callbacks
     */
    init: (newPlaybackElement, bigscreenPlayerData, newWindowType, enableSubtitles, callbacks = {}) => {
      playbackElement = newPlaybackElement
      resizer = Resizer()
      DebugTool.init()
      DebugTool.setRootElement(playbackElement)

      DebugTool.staticMetric("version", Version)

      if (typeof bigscreenPlayerData.initialPlaybackTime === "number") {
        DebugTool.staticMetric("initial-playback-time", bigscreenPlayerData.initialPlaybackTime)
      }
      if (typeof window.bigscreenPlayer?.playbackStrategy === "string") {
        DebugTool.staticMetric("strategy", window.bigscreenPlayer && window.bigscreenPlayer.playbackStrategy)
      }

      windowType = newWindowType
      serverDate = bigscreenPlayerData.serverDate

      if (serverDate) {
        DebugTool.warn("Passing in server date is deprecated. Use <UTCTiming> on manifest.")
      }

      playerReadyCallback = callbacks.onSuccess
      playerErrorCallback = callbacks.onError

      const mediaSourceCallbacks = {
        onSuccess: () => bigscreenPlayerDataLoaded(bigscreenPlayerData, enableSubtitles),
        onError: (error) => {
          if (callbacks.onError) {
            callbacks.onError(error)
          }
        },
      }

      mediaSources = MediaSources()

      mediaSources.init(bigscreenPlayerData.media, serverDate, windowType, getLiveSupport(), mediaSourceCallbacks)
    },

    /**
     * Should be called at the end of all playback sessions. Resets state and clears any UI.
     * @function
     * @name tearDown
     */
    tearDown() {
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
      const indexOf = stateChangeCallbacks.indexOf(callback)
      if (indexOf !== -1) {
        stateChangeCallbacks.splice(indexOf, 1)
      }
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
      const indexOf = timeUpdateCallbacks.indexOf(callback)
      if (indexOf !== -1) {
        timeUpdateCallbacks.splice(indexOf, 1)
      }
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
      const indexOf = subtitleCallbacks.indexOf(callback)
      if (indexOf !== -1) {
        subtitleCallbacks.splice(indexOf, 1)
      }
    },

    /**
     * Sets the current time of the media asset.
     * @function
     * @param {Number} time - In seconds
     */
    setCurrentTime(time) {
      DebugTool.apicall("setCurrentTime", [time])

      if (playerComponent) {
        // this flag must be set before calling into playerComponent.setCurrentTime - as this synchronously fires a WAITING event (when native strategy).
        isSeeking = true
        playerComponent.setCurrentTime(time)
        endOfStream =
          windowType !== WindowTypes.STATIC && Math.abs(this.getSeekableRange().end - time) < END_OF_STREAM_TOLERANCE
      }
    },

    /**
     * Set the media element playback rate
     *
     * @function
     * @param {Number} rate
     */
    setPlaybackRate: (rate) => {
      if (playerComponent) {
        playerComponent.setPlaybackRate(rate)
      }
    },

    /**
     * Get the current playback rate
     * @function
     * @returns {Number} the current media playback rate
     */
    getPlaybackRate: () => playerComponent && playerComponent.getPlaybackRate(),

    /**
     * Returns the media asset's current time in seconds.
     * @function
     * @returns {Number}
     */
    getCurrentTime: () => playerComponent?.getCurrentTime() ?? 0,

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
    getSeekableRange: () => (playerComponent ? playerComponent.getSeekableRange() : {}),

    /**
     * @function
     * @returns {boolean} Returns true if media is initialised and playing a live stream within a tolerance of the end of the seekable range (10 seconds).
     */
    isPlayingAtLiveEdge() {
      return (
        !!playerComponent &&
        windowType !== WindowTypes.STATIC &&
        Math.abs(this.getSeekableRange().end - this.getCurrentTime()) < END_OF_STREAM_TOLERANCE
      )
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
        serverDate,
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
    isPaused: () => (playerComponent ? playerComponent.isPaused() : true),

    /**
     * @function
     * @returns if the media asset has ended.
     */
    isEnded: () => (playerComponent ? playerComponent.isEnded() : false),

    /**
     * Play the media assest from the current point in time.
     * @function
     */
    play: () => {
      DebugTool.apicall("play")

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
      DebugTool.apicall("pause")

      pauseTrigger = opts && opts.userPause === false ? PauseTriggers.APP : PauseTriggers.USER
      playerComponent.pause({ pauseTrigger, ...opts })
    },

    /**
     * Resize the video container div in the most compatible way
     *
     * @function
     * @param {Number} top - px
     * @param {Number} left -  px
     * @param {Number} width -  px
     * @param {Number} height -  px
     * @param {Number} zIndex
     */
    resize: (top, left, width, height, zIndex) => {
      subtitles.hide()
      resizer.resize(playbackElement, top, left, width, height, zIndex)
    },

    /**
     * Clear any resize properties added with `resize`
     * @function
     */
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
    setSubtitlesEnabled,

    /**
     * @function
     * @return if subtitles are currently enabled.
     */
    isSubtitlesEnabled,

    /**
     * @function
     * @return Returns whether or not subtitles are currently enabled.
     */
    isSubtitlesAvailable,

    /**
     * Returns if a device supports the customisation of subtitles
     *
     * @returns boolean
     */
    areSubtitlesCustomisable: () =>
      !(window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles),

    /**
     * Customise the rendered subitles style
     *
     * @param {SubtitlesCustomisationOptions} styleOpts
     */
    customiseSubtitles: (styleOpts) => {
      if (subtitles) {
        subtitles.customise(styleOpts)
      }
    },

    /**
     * Render an example subtitles string with a given style and location
     *
     * @param {string} xmlString - EBU-TT-D compliant XML String
     * @param {SubtitlesCustomisationOptions} styleOpts
     * @param {DOMRect} safePosition
     */
    renderSubtitleExample: (xmlString, styleOpts, safePosition) => {
      if (subtitles) {
        subtitles.renderExample(xmlString, styleOpts, safePosition)
      }
    },

    /**
     * Clear the example subtitle string
     */
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
    canSeek() {
      return (
        windowType === WindowTypes.STATIC ||
        DynamicWindowUtils.canSeek(getWindowStartTime(), getWindowEndTime(), getLiveSupport(), this.getSeekableRange())
      )
    },

    /**
     * @function
     * @return Returns whether the current media asset is pausable.
     */
    canPause: () =>
      windowType === WindowTypes.STATIC ||
      DynamicWindowUtils.canPause(getWindowStartTime(), getWindowEndTime(), getLiveSupport()),

    /**
     * Return a mock for in place testing.
     * @function
     * @param {*} opts
     */
    mock(opts) {
      MockBigscreenPlayer.mock(this, opts)
    },

    /**
     * Unmock the player.
     * @function
     */
    unmock() {
      MockBigscreenPlayer.unmock(this)
    },

    /**
     * Return a mock for unit tests.
     * @function
     * @param {*} opts
     */
    mockJasmine(opts) {
      MockBigscreenPlayer.mockJasmine(this, opts)
    },

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
    transitions: () => (playerComponent ? playerComponent.transitions() : {}),

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
    convertEpochMsToVideoTimeSeconds: (epochTime) =>
      getWindowStartTime() ? Math.floor((epochTime - getWindowStartTime()) / 1000) : null,

    /**
     * @function
     * @return The runtime version of the library.
     */
    getFrameworkVersion: () => Version,

    /**
     * @function
     * @param {Number} time - Seconds
     * @return the time in milliseconds within the current sliding window.
     */
    convertVideoTimeSecondsToEpochMs,

    /**
     * Toggle the visibility of the debug tool overlay.
     * @function
     */
    toggleDebug,

    /**
     * @function
     * @return {Object} - Key value pairs of available log levels
     */
    getLogLevels: () => DebugTool.logLevels,

    /**
     * @function
     * @param logLevel -  log level to display @see getLogLevels
     */
    setLogLevel: (level) => DebugTool.setLogLevel(level),
    getDebugLogs: () => DebugTool.getDebugLogs(),
    convertMediaTimeToPresentationTime,
    convertPresentationTimeToMediaTime,
  }
}

/**
 * @function
 * @param {TALDevice} device
 * @return the live support of the device.
 */
function getLiveSupport() {
  return PlayerComponent.getLiveSupport()
}

BigscreenPlayer.getLiveSupport = getLiveSupport

BigscreenPlayer.version = Version

export default BigscreenPlayer
