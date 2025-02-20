/**
 * @module bigscreenplayer/bigscreenplayer
 */
import MediaState from "./models/mediastate"
import PlayerComponent from "./playercomponent"
import PauseTriggers from "./models/pausetriggers"
import { canPauseAndSeek } from "./dynamicwindowutils"
import MockBigscreenPlayer from "./mockbigscreenplayer"
import Plugins from "./plugins"
import DebugTool from "./debugger/debugtool"
import {
  presentationTimeToMediaSampleTimeInSeconds,
  mediaSampleTimeToPresentationTimeInSeconds,
  presentationTimeToAvailabilityTimeInMilliseconds,
  availabilityTimeToPresentationTimeInSeconds,
} from "./utils/timeutils"
import callCallbacks from "./utils/callcallbacks"
import MediaSources from "./mediasources"
import Version from "./version"
import Resizer from "./resizer"
import ReadyHelper from "./readyhelper"
import Subtitles from "./subtitles/subtitles"
// TODO: Remove when this becomes a TypeScript file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { InitData, InitCallbacks, SubtitlesCustomisationOptions, PlaybackTime } from "./types"
import { ManifestType } from "./models/manifesttypes"
import { Timeline } from "./models/timeline"

function BigscreenPlayer() {
  let stateChangeCallbacks = []
  let timeUpdateCallbacks = []
  let subtitleCallbacks = []
  let broadcastMixADCallbacks = []

  let playerReadyCallback
  let playerErrorCallback
  let mediaKind
  let initialPlaybackTime
  let playerComponent
  let resizer
  let pauseTrigger
  let isSeeking = false
  let endOfStream
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

    if (
      evt.data.seekableRange &&
      typeof evt.data.seekableRange.start === "number" &&
      typeof evt.data.seekableRange.end === "number"
    ) {
      DebugTool.staticMetric("seekable-range", [evt.data.seekableRange.start, evt.data.seekableRange.end])
    }

    if (evt.data.duration) {
      DebugTool.staticMetric("duration", evt.data.duration)
    }

    if (playerComponent && readyHelper) {
      readyHelper.callbackWhenReady(evt)
    }
  }

  function bigscreenPlayerDataLoaded({ media, enableSubtitles }) {
    const initialPresentationTime =
      initialPlaybackTime == null ? undefined : convertPlaybackTimeToPresentationTimeInSeconds(initialPlaybackTime)

    endOfStream =
      mediaSources.time().manifestType === ManifestType.DYNAMIC &&
      !initialPresentationTime &&
      initialPresentationTime !== 0

    readyHelper = ReadyHelper(
      initialPresentationTime,
      mediaSources.time().manifestType,
      PlayerComponent.getLiveSupport(),
      playerReadyCallback
    )

    playerComponent = PlayerComponent(
      playbackElement,
      { media, initialPlaybackTime: initialPresentationTime },
      mediaSources,
      mediaStateUpdateCallback,
      playerErrorCallback,
      callBroadcastMixADCallbacks
    )

    subtitles = Subtitles(
      playerComponent,
      enableSubtitles,
      playbackElement,
      media.subtitleCustomisation,
      mediaSources,
      callSubtitlesCallbacks
    )
  }

  /**
   * @typedef {Object} PlaybackTimeInit
   * @property {number} seconds
   * @property {Timeline} [timeline]
   */

  /**
   * Normalise time input to the 'PlaybackTime' model, so the unit and timeline is explicit.
   * @param {number | PlaybackTimeInit} init
   * @returns {PlaybackTime}
   */
  function createPlaybackTime(init) {
    if (typeof init === "number") {
      return { seconds: init, timeline: Timeline.PRESENTATION_TIME }
    }

    if (init == null || typeof init !== "object" || typeof init.seconds !== "number") {
      throw new TypeError("A numerical playback time must be provided")
    }

    return { seconds: init.seconds, timeline: init.timeline ?? Timeline.PRESENTATION_TIME }
  }

  function convertPlaybackTimeToPresentationTimeInSeconds(playbackTime) {
    const { seconds, timeline } = playbackTime

    switch (timeline) {
      case Timeline.PRESENTATION_TIME:
        return seconds
      case Timeline.MEDIA_SAMPLE_TIME:
        return convertMediaSampleTimeToPresentationTimeInSeconds(seconds)
      case Timeline.AVAILABILITY_TIME:
        return convertAvailabilityTimeToPresentationTimeInSeconds(seconds * 1000)
      default:
        return seconds
    }
  }

  function convertPresentationTimeToMediaSampleTimeInSeconds(presentationTimeInSeconds) {
    return mediaSources?.time() == null
      ? null
      : presentationTimeToMediaSampleTimeInSeconds(
          presentationTimeInSeconds,
          mediaSources.time().presentationTimeOffsetInMilliseconds
        )
  }

  function convertMediaSampleTimeToPresentationTimeInSeconds(mediaSampleTimeInSeconds) {
    return mediaSources?.time() == null
      ? null
      : mediaSampleTimeToPresentationTimeInSeconds(
          mediaSampleTimeInSeconds,
          mediaSources.time().presentationTimeOffsetInMilliseconds
        )
  }

  function convertPresentationTimeToAvailabilityTimeInMilliseconds(presentationTimeInSeconds) {
    return mediaSources?.time() == null || mediaSources?.time().manifestType === ManifestType.STATIC
      ? null
      : presentationTimeToAvailabilityTimeInMilliseconds(
          presentationTimeInSeconds,
          mediaSources.time().availabilityStartTimeInMilliseconds
        )
  }

  function convertAvailabilityTimeToPresentationTimeInSeconds(availabilityTimeInMilliseconds) {
    return mediaSources?.time() == null || mediaSources?.time().manifestType === ManifestType.STATIC
      ? null
      : availabilityTimeToPresentationTimeInSeconds(
          availabilityTimeInMilliseconds,
          mediaSources.time().availabilityStartTimeInMilliseconds
        )
  }

  function getInitialPlaybackTime() {
    return initialPlaybackTime
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

  function getTimeShiftBufferDepthInMilliseconds() {
    return mediaSources.time()?.timeShiftBufferDepthInMilliseconds ?? null
  }

  function getPresentationTimeOffsetInMilliseconds() {
    return mediaSources.time()?.presentationTimeOffsetInMilliseconds ?? null
  }

  function callBroadcastMixADCallbacks(enabled) {
    callCallbacks(broadcastMixADCallbacks, { enabled })
  }

  return /** @alias module:bigscreenplayer/bigscreenplayer */ {
    /**
     * Call first to initialise bigscreen player for playback.
     * @function
     * @name init
     * @param {HTMLDivElement} playbackElement - The Div element where content elements should be rendered
     * @param {InitData} bigscreenPlayerData
     * @param {InitCallbacks} callbacks
     */
    init: (newPlaybackElement, bigscreenPlayerData, callbacks = {}) => {
      playbackElement = newPlaybackElement
      DebugTool.init()
      DebugTool.setRootElement(playbackElement)
      resizer = Resizer()

      mediaKind = bigscreenPlayerData.media.kind

      if (bigscreenPlayerData.initialPlaybackTime || bigscreenPlayerData.initialPlaybackTime === 0) {
        initialPlaybackTime = createPlaybackTime(bigscreenPlayerData.initialPlaybackTime)
      }

      DebugTool.staticMetric("version", Version)

      if (initialPlaybackTime) {
        const { seconds, timeline } = initialPlaybackTime
        DebugTool.staticMetric("initial-playback-time", [seconds, timeline])
      }

      if (typeof window.bigscreenPlayer?.playbackStrategy === "string") {
        DebugTool.staticMetric("strategy", window.bigscreenPlayer && window.bigscreenPlayer.playbackStrategy)
      }

      playerReadyCallback = callbacks.onSuccess
      playerErrorCallback = callbacks.onError

      mediaSources = MediaSources()

      mediaSources
        .init(bigscreenPlayerData.media)
        .then(() => bigscreenPlayerDataLoaded(bigscreenPlayerData))
        .catch((reason) => {
          if (typeof callbacks?.onError === "function") {
            callbacks.onError(reason)
          }
        })
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
      broadcastMixADCallbacks = []
      endOfStream = undefined
      mediaKind = undefined
      pauseTrigger = undefined
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
     * Pass a function to be called whenever BroadcastMixAD is enabled or disabled.
     * @function
     * @param {Function} callback
     */
    registerForBroadcastMixADChanges: (callback) => {
      broadcastMixADCallbacks.push(callback)
      return callback
    },

    /**
     * Unregisters a previously registered callback for changes to BroadcastMixAD.
     * @function
     * @param {Function} callback
     */
    unregisterForBroadcastMixADChanges: (callback) => {
      const indexOf = broadcastMixADCallbacks.indexOf(callback)
      if (indexOf !== -1) {
        broadcastMixADCallbacks.splice(indexOf, 1)
      }
    },

    /**
     * Sets the current time of the media asset.
     * @function
     * @param {number} seconds
     * @param {Timeline} timeline
     */
    setCurrentTime(seconds, timeline) {
      const playbackTime = createPlaybackTime({ seconds, timeline })

      DebugTool.apicall("setCurrentTime", [playbackTime.seconds.toFixed(3), playbackTime.timeline])

      if (playerComponent) {
        // this flag must be set before calling into playerComponent.setCurrentTime - as this synchronously fires a WAITING event (when native strategy).
        isSeeking = true

        const presentationTimeInSeconds = convertPlaybackTimeToPresentationTimeInSeconds(playbackTime)

        playerComponent.setCurrentTime(presentationTimeInSeconds)

        endOfStream =
          mediaSources.time().manifestType === ManifestType.DYNAMIC &&
          Math.abs(this.getSeekableRange().end - presentationTimeInSeconds) < END_OF_STREAM_TOLERANCE
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
    getCurrentTime: () => (playerComponent && playerComponent.getCurrentTime()) || 0,

    /**
     * Returns the current media kind.
     * 'audio' or 'video'
     * @function
     */
    getMediaKind: () => mediaKind,

    /**
     * Returns an object including the current start and end times.
     * @function
     * @returns {Object | null} {start: Number, end: Number}
     */
    getSeekableRange: () => playerComponent?.getSeekableRange() ?? null,

    /**
     * @function
     * @returns {boolean} Returns true if media is initialised and playing a live stream within a tolerance of the end of the seekable range (10 seconds).
     */
    isPlayingAtLiveEdge() {
      return (
        !!playerComponent &&
        mediaSources.time().manifestType === ManifestType.DYNAMIC &&
        Math.abs(this.getSeekableRange().end - this.getCurrentTime()) < END_OF_STREAM_TOLERANCE
      )
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
     */
    pause: (opts) => {
      DebugTool.apicall("pause")

      pauseTrigger = opts?.userPause || opts?.userPause == null ? PauseTriggers.USER : PauseTriggers.APP

      playerComponent.pause()
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
     * @function
     * @returns {boolean} true if there if an AD track is available
     */
    isBroadcastMixADAvailable: () => playerComponent && playerComponent.isBroadcastMixADAvailable(),

    /**
     * @function
     * @returns {boolean} true if there is an the AD audio track is current being used
     */
    isBroadcastMixADEnabled: () => playerComponent && playerComponent.isBroadcastMixADEnabled(),

    /**
     * @function
     */
    setBroadcastMixADEnabled: (enabled) => {
      enabled ? playerComponent.setBroadcastMixADOn() : playerComponent.setBroadcastMixADOff()
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
        mediaSources.time().manifestType === ManifestType.STATIC ||
        canPauseAndSeek(getLiveSupport(), this.getSeekableRange())
      )
    },

    /**
     * @function
     * @return Returns whether the current media asset is pausable.
     */
    canPause() {
      return (
        mediaSources.time().manifestType === ManifestType.STATIC ||
        canPauseAndSeek(getLiveSupport(), this.getSeekableRange())
      )
    },

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
     * @return The runtime version of the library.
     */
    getFrameworkVersion: () => Version,

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
    convertPresentationTimeToMediaSampleTimeInSeconds,
    convertMediaSampleTimeToPresentationTimeInSeconds,
    convertPresentationTimeToAvailabilityTimeInMilliseconds,
    convertAvailabilityTimeToPresentationTimeInSeconds,
    getInitialPlaybackTime,
    getTimeShiftBufferDepthInMilliseconds,
    getPresentationTimeOffsetInMilliseconds,
  }
}

function getLiveSupport() {
  return PlayerComponent.getLiveSupport()
}

BigscreenPlayer.getLiveSupport = getLiveSupport

BigscreenPlayer.version = Version

export default BigscreenPlayer
