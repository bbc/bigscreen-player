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
import Chronicle from "./debugger/chronicle"
import DebugTool from "./debugger/debugtool"
import SlidingWindowUtils from "./utils/timeutils"
import callCallbacks from "./utils/callcallbacks"
import MediaSources from "./mediasources"
import Version from "./version"
import Resizer from "./resizer"
import ReadyHelper from "./readyhelper"
import Subtitles from "./subtitles/subtitles"
import "./typedefs"

export default class BigscreenPlayer {
  static version = Version

  static END_OF_STREAM_TOLERANCE = 10

  /**
   * @function
   * @param {TALDevice} device
   * @return the live support of the device.
   */
  static getLiveSupport() {
    return PlayerComponent.getLiveSupport()
  }

  #stateChangeCallbacks = []
  #timeUpdateCallbacks = []
  #subtitleCallbacks = []
  #playerReadyCallback
  #playerErrorCallback
  #mediaKind
  #initialPlaybackTimeEpoch
  #serverDate
  #playerComponent
  #resizer
  #pauseTrigger
  #isSeeking = false
  #endOfStream
  #windowType
  #mediaSources
  #playbackElement
  #readyHelper
  #subtitles

  /**
   * Call first to initialise bigscreen player for playback.
   * @function
   * @name init
   * @param {HTMLDivElement} playbackElement - The Div element where content elements should be rendered
   * @param {BigscreenPlayerData} data
   * @param {WindowTypes} windowType
   * @param {boolean} isSubtitlesEnabled - Enable subtitles on initialisation
   * @param {InitCallbacks} callbacks
   */
  constructor(el, data, windowType, isSubtitlesEnabled, callbacks) {
    this.#playbackElement = el
    this.#resizer = Resizer()
    this.#windowType = windowType
    this.#serverDate = data.serverDate
    Chronicle.init()
    DebugTool.setRootElement(this.#playbackElement)
    DebugTool.keyValue({ key: "framework-version", value: Version })

    this.#playerReadyCallback = callbacks?.onSuccess?.bind(this)
    this.#playerErrorCallback = callbacks?.onError?.bind(this)

    const handleDataLoaded = this.#bigscreenPlayerDataLoaded.bind(this)

    const mediaSourceCallbacks = {
      onSuccess: () => handleDataLoaded(data, isSubtitlesEnabled),
      onError: (error) => {
        if (typeof callbacks?.onError === "function") {
          callbacks.onError(error)
        }
      },
    }

    this.#mediaSources = MediaSources()

    // Backwards compatibility with Old API; to be removed on Major Version Update
    if (data.media && !data.media.captions && data.media.captionsUrl) {
      data.media.captions = [
        {
          url: data.media.captionsUrl,
        },
      ]
    }

    this.#mediaSources.init(
      data.media,
      this.#serverDate,
      this.#windowType,
      BigscreenPlayer.getLiveSupport(),
      mediaSourceCallbacks
    )
  }

  #bigscreenPlayerDataLoaded(data, isSubtitlesEnabled) {
    if (this.#windowType !== WindowTypes.STATIC) {
      data.time = this.#mediaSources.time()
      this.#serverDate = data.serverDate

      this.#initialPlaybackTimeEpoch = data.initialPlaybackTime

      // overwrite initialPlaybackTime with video time (it comes in as epoch time for a sliding/growing window)
      data.initialPlaybackTime = SlidingWindowUtils.convertToSeekableVideoTime(
        data.initialPlaybackTime,
        data.time.windowStartTime
      )
    }

    this.#mediaKind = data.media.kind
    this.#endOfStream =
      this.#windowType !== WindowTypes.STATIC && !data.initialPlaybackTime && data.initialPlaybackTime !== 0

    this.#readyHelper = new ReadyHelper(
      data.initialPlaybackTime,
      this.#windowType,
      PlayerComponent.getLiveSupport(),
      this.#playerReadyCallback
    )

    this.#playerComponent = new PlayerComponent(
      this.#playbackElement,
      data,
      this.#mediaSources,
      this.#windowType,
      this.#mediaStateUpdateCallback.bind(this),
      this.#playerErrorCallback
    )

    this.#subtitles = Subtitles(
      this.#playerComponent,
      isSubtitlesEnabled,
      this.#playbackElement,
      data.media.subtitleCustomisation,
      this.#mediaSources,
      this.#callSubtitlesCallbacks.bind(this)
    )
  }

  #mediaStateUpdateCallback(event) {
    if (event.timeUpdate) {
      DebugTool.time(event.data.currentTime)
      callCallbacks(this.#timeUpdateCallbacks, {
        currentTime: event.data.currentTime,
        endOfStream: this.#endOfStream,
      })
    } else {
      let stateObject = { state: event.data.state }

      if (event.data.state === MediaState.PAUSED) {
        this.#endOfStream = false
        stateObject.trigger = this.#pauseTrigger || PauseTriggers.DEVICE
        this.#pauseTrigger = undefined
      }

      if (event.data.state === MediaState.FATAL_ERROR) {
        stateObject = {
          state: MediaState.FATAL_ERROR,
          isBufferingTimeoutError: event.isBufferingTimeoutError,
          code: event.code,
          message: event.message,
        }
      }

      if (event.data.state === MediaState.WAITING) {
        stateObject.isSeeking = this.#isSeeking
        this.#isSeeking = false
      }

      stateObject.endOfStream = this.#endOfStream
      DebugTool.event(stateObject)

      callCallbacks(this.#stateChangeCallbacks, stateObject)
    }

    if (event.data.seekableRange) {
      DebugTool.keyValue({ key: "seekableRangeStart", value: this.#deviceTimeToDate(event.data.seekableRange.start) })
      DebugTool.keyValue({ key: "seekableRangeEnd", value: this.#deviceTimeToDate(event.data.seekableRange.end) })
    }

    if (event.data.duration) {
      DebugTool.keyValue({ key: "duration", value: event.data.duration })
    }

    if (this.#playerComponent && this.#readyHelper) {
      this.#readyHelper.callbackWhenReady(event)
    }
  }

  #deviceTimeToDate(time) {
    return this.#getWindowStartTime() ? new Date(this.convertVideoTimeSecondsToEpochMs(time)) : new Date(time * 1000)
  }

  #getWindowStartTime() {
    return this.#mediaSources && this.#mediaSources.time().windowStartTime
  }

  #getWindowEndTime() {
    return this.#mediaSources && this.#mediaSources.time().windowEndTime
  }

  #callSubtitlesCallbacks(enabled) {
    callCallbacks(this.#subtitleCallbacks, { enabled })
  }

  /**
   * Should be called at the end of all playback sessions. Resets state and clears any UI.
   * @function
   * @name tearDown
   */
  tearDown() {
    if (this.#subtitles) {
      this.#subtitles.tearDown()
      this.#subtitles = undefined
    }

    if (this.#playerComponent) {
      this.#playerComponent.tearDown()
      this.#playerComponent = undefined
    }

    if (this.#mediaSources) {
      this.#mediaSources.tearDown()
      this.#mediaSources = undefined
    }

    this.#stateChangeCallbacks = []
    this.#timeUpdateCallbacks = []
    this.#subtitleCallbacks = []
    this.#endOfStream = undefined
    this.#mediaKind = undefined
    this.#pauseTrigger = undefined
    this.#windowType = undefined
    this.#resizer = undefined
    this.unregisterPlugin()
    DebugTool.tearDown()
    Chronicle.tearDown()
  }

  /**
   * Pass a function to call whenever the player transitions state.
   * @see {@link module:models/mediastate}
   * @function
   * @param {Function} callback
   */
  registerForStateChanges(callback) {
    this.#stateChangeCallbacks.push(callback)
    return callback
  }

  /**
   * Unregisters a previously registered callback.
   * @function
   * @param {Function} callback
   */
  unregisterForStateChanges(callback) {
    const indexOf = this.#stateChangeCallbacks.indexOf(callback)
    if (indexOf !== -1) {
      this.#stateChangeCallbacks.splice(indexOf, 1)
    }
  }

  /**
   * Pass a function to call whenever the player issues a time update.
   * @function
   * @param {Function} callback
   */
  registerForTimeUpdates(callback) {
    this.#timeUpdateCallbacks.push(callback)
    return callback
  }

  /**
   * Unregisters a previously registered callback.
   * @function
   * @param {Function} callback
   */
  unregisterForTimeUpdates(callback) {
    const indexOf = this.#timeUpdateCallbacks.indexOf(callback)
    if (indexOf !== -1) {
      this.#timeUpdateCallbacks.splice(indexOf, 1)
    }
  }

  /**
   * Pass a function to be called whenever subtitles are enabled or disabled.
   * @function
   * @param {Function} callback
   */
  registerForSubtitleChanges(callback) {
    this.#subtitleCallbacks.push(callback)
    return callback
  }

  /**
   * Unregisters a previously registered callback for changes to subtitles.
   * @function
   * @param {Function} callback
   */
  unregisterForSubtitleChanges(callback) {
    const indexOf = this.#subtitleCallbacks.indexOf(callback)
    if (indexOf !== -1) {
      this.#subtitleCallbacks.splice(indexOf, 1)
    }
  }

  /**
   * Sets the current time of the media asset.
   * @function
   * @param {Number} time - In seconds
   */
  setCurrentTime(time) {
    DebugTool.apicall("setCurrentTime")
    if (this.#playerComponent) {
      // this flag must be set before calling into playerComponent.setCurrentTime
      // as this synchronously fires a WAITING event (when native strategy).
      this.#isSeeking = true
      this.#playerComponent.setCurrentTime(time)
      this.#endOfStream =
        this.#windowType !== WindowTypes.STATIC &&
        Math.abs(this.getSeekableRange().end - time) < BigscreenPlayer.END_OF_STREAM_TOLERANCE
    }
  }

  setPlaybackRate(rate) {
    this.#playerComponent?.setPlaybackRate(rate)
  }

  getPlaybackRate() {
    return this.#playerComponent?.getPlaybackRate()
  }

  /**
   * Returns the media asset's current time in seconds.
   * @function
   */
  getCurrentTime() {
    return this.#playerComponent?.getCurrentTime() ?? 0
  }

  /**
   * Returns the current media kind.
   * 'audio' or 'video'
   * @function
   */
  getMediaKind() {
    return this.#mediaKind
  }

  /**
   * Returns the current window type.
   * @see {@link module:bigscreenplayer/models/windowtypes}
   * @function
   */
  getWindowType() {
    return this.#windowType
  }

  /**
   * Returns an object including the current start and end times.
   * @function
   * @returns {Object} {start: Number, end: Number}
   */
  getSeekableRange() {
    return this.#playerComponent?.getSeekableRange() ?? {}
  }

  /**
   * @function
   * @returns {boolean} Returns true if media is initialised and playing a live stream within a tolerance of the end of the seekable range (10 seconds).
   */
  isPlayingAtLiveEdge() {
    return !!(
      this.#playerComponent &&
      this.#windowType !== WindowTypes.STATIC &&
      Math.abs(this.getSeekableRange().end - this.getCurrentTime()) < BigscreenPlayer.END_OF_STREAM_TOLERANCE
    )
  }

  /**
   * @function
   * @return {Object} An object of the shape {windowStartTime: Number, windowEndTime: Number, initialPlaybackTime: Number, serverDate: Date}
   */
  getLiveWindowData() {
    if (this.#windowType === WindowTypes.STATIC) {
      return {}
    }

    return {
      windowStartTime: this.#getWindowStartTime(),
      windowEndTime: this.#getWindowEndTime(),
      initialPlaybackTime: this.#initialPlaybackTimeEpoch,
      serverDate: this.#serverDate,
    }
  }

  /**
   * @function
   * @returns the duration of the media asset.
   */
  getDuration() {
    return this.#playerComponent?.getDuration()
  }

  /**
   * @function
   * @returns if the player is paused.
   */
  isPaused() {
    return this.#playerComponent?.isPaused() ?? true
  }

  /**
   * @function
   * @returns if the media asset has ended.
   */
  isEnded() {
    return this.#playerComponent?.isEnded() ?? false
  }

  /**
   * Play the media assest from the current point in time.
   * @function
   */
  play() {
    DebugTool.apicall("play")
    this.#playerComponent.play()
  }

  /**
   * Pause the media asset.
   * @function
   * @param {*} opts
   * @param {boolean} opts.userPause
   * @param {boolean} opts.disableAutoResume
   */
  pause(opts) {
    DebugTool.apicall("pause")
    this.#pauseTrigger = opts?.userPause === false ? PauseTriggers.APP : PauseTriggers.USER
    this.#playerComponent.pause(opts)
  }

  resize(top, left, width, height, zIndex) {
    this.#subtitles.hide()
    this.#resizer.resize(this.#playbackElement, top, left, width, height, zIndex)
  }

  clearResize() {
    if (this.#subtitles.enabled()) this.#subtitles.show()
    else this.#subtitles.hide()

    this.#resizer.clear(this.#playbackElement)
  }

  /**
   * Set whether or not subtitles should be enabled.
   * @function
   * @param {boolean} value
   */
  setSubtitlesEnabled(enabled) {
    if (enabled) this.#subtitles.enable()
    else this.#subtitles.disable()

    this.#callSubtitlesCallbacks(enabled)

    if (this.#resizer.isResized()) {
      return
    }

    if (enabled) this.#subtitles.show()
    else this.#subtitles.hide()
  }

  /**
   * @function
   * @return if subtitles are currently enabled.
   */
  isSubtitlesEnabled() {
    return this.#subtitles ? this.#subtitles.enabled() : false
  }

  /**
   * @function
   * @return Returns whether or not subtitles are currently enabled.
   */
  isSubtitlesAvailable() {
    return this.#subtitles ? this.#subtitles.available() : false
  }

  areSubtitlesCustomisable() {
    return !window.bigscreenPlayer?.overrides?.legacySubtitles
  }

  customiseSubtitles(styleOpts) {
    if (this.#subtitles) {
      this.#subtitles.customise(styleOpts)
    }
  }

  renderSubtitleExample(xmlString, styleOpts, safePosition) {
    if (this.#subtitles) {
      this.#subtitles.renderExample(xmlString, styleOpts, safePosition)
    }
  }

  clearSubtitleExample() {
    if (this.#subtitles) {
      this.#subtitles.clearExample()
    }
  }

  /**
   *
   * An enum may be used to set the on-screen position of any transport controls
   * (work in progress to remove this - UI concern).
   * @function
   * @param {*} position
   */
  setTransportControlsPosition(position) {
    if (this.#subtitles) {
      this.#subtitles.setPosition(position)
    }
  }

  /**
   * @function
   * @return Returns whether the current media asset is seekable.
   */
  canSeek() {
    return (
      this.#windowType === WindowTypes.STATIC ||
      DynamicWindowUtils.canSeek(
        this.#getWindowStartTime(),
        this.#getWindowEndTime(),
        BigscreenPlayer.getLiveSupport(),
        this.getSeekableRange()
      )
    )
  }

  /**
   * @function
   * @return Returns whether the current media asset is pausable.
   */
  canPause() {
    return (
      this.#windowType === WindowTypes.STATIC ||
      DynamicWindowUtils.canPause(
        this.#getWindowStartTime(),
        this.#getWindowEndTime(),
        BigscreenPlayer.getLiveSupport()
      )
    )
  }

  /**
   * Return a mock for in place testing.
   * @function
   * @param {*} opts
   */
  mock(opts) {
    MockBigscreenPlayer.mock(this, opts)
  }

  /**
   * Unmock the player.
   * @function
   */
  unmock() {
    MockBigscreenPlayer.unmock(this)
  }

  /**
   * Return a mock for unit tests.
   * @function
   * @param {*} opts
   */
  mockJasmine(opts) {
    MockBigscreenPlayer.mockJasmine(this, opts)
  }

  /**
   * Register a plugin for extended events.
   * @function
   * @param {*} plugin
   */
  registerPlugin(plugin) {
    Plugins.registerPlugin(plugin)
  }

  /**
   * Unregister a previously registered plugin.
   * @function
   * @param {*} plugin
   */
  unregisterPlugin(plugin) {
    Plugins.unregisterPlugin(plugin)
  }

  /**
   * Returns an object with a number of functions related to the ability to transition state
   * given the current state and the playback strategy in use.
   * @function
   */
  transitions() {
    return this.#playerComponent?.transitions() ?? {}
  }

  /**
   * @function
   * @return The media element currently being used.
   */
  getPlayerElement() {
    return this.#playerComponent?.getPlayerElement()
  }

  /**
   * @function
   * @param {Number} epochTime - Unix Epoch based time in milliseconds.
   * @return the time in seconds within the current sliding window.
   */
  convertEpochMsToVideoTimeSeconds(epochTime) {
    return this.#getWindowStartTime() ? Math.floor((epochTime - this.#getWindowStartTime()) / 1000) : null
  }

  /**
   * @function
   * @return The runtime version of the library.
   */
  getFrameworkVersion() {
    return Version
  }

  /**
   * @function
   * @param {Number} time - Seconds
   * @return the time in milliseconds within the current sliding window.
   */
  convertVideoTimeSecondsToEpochMs(seconds) {
    return this.#getWindowStartTime() ? this.#getWindowStartTime() + seconds * 1000 : null
  }

  /**
   * Toggle the visibility of the debug tool overlay.
   * @function
   */
  toggleDebug() {
    if (this.#playerComponent) {
      DebugTool.toggleVisibility()
    }
  }

  /**
   * @function
   * @return {Object} - Key value pairs of available log levels
   */
  static getLogLevels() {
    return DebugTool.logLevels
  }

  /**
   * @borrows setLogLevel as setLogLevel
   * @param logLevel -  log level to display @see getLogLevels
   */
  static setLogLevel = DebugTool.setLogLevel

  static getDebugLogs() {
    return Chronicle.retrieve()
  }
}
