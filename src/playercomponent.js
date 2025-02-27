import LiveSupport from "./models/livesupport"
import MediaState from "./models/mediastate"
import StrategyPicker from "./playbackstrategy/strategypicker"
import {
  presentationTimeToAvailabilityTimeInMilliseconds,
  availabilityTimeToPresentationTimeInSeconds,
} from "./utils/timeutils"
import PluginData from "./plugindata"
import PluginEnums from "./pluginenums"
import Plugins from "./plugins"
import MediaPlayerBase from "./playbackstrategy/modifiers/mediaplayerbase"
import DebugTool from "./debugger/debugtool"

function PlayerComponent(
  playbackElement,
  bigscreenPlayerData,
  mediaSources,
  stateUpdateCallback,
  errorCallback,
  audioDescribedCallback
) {
  let _stateUpdateCallback = stateUpdateCallback

  let mediaKind = bigscreenPlayerData.media.kind
  let isInitialPlay = true
  let errorTimeoutID = null

  let playbackStrategy
  let mediaMetaData
  let fatalErrorTimeout
  let fatalError

  StrategyPicker()
    .then((strategy) => {
      playbackStrategy = strategy(
        mediaSources,
        mediaKind,
        playbackElement,
        bigscreenPlayerData.media.isUHD,
        bigscreenPlayerData.media.playerSettings,
        {
          enable: bigscreenPlayerData.enableAudioDescribed,
          callback: audioDescribedCallback,
        }
      )

      playbackStrategy.addEventCallback(this, eventCallback)
      playbackStrategy.addErrorCallback(this, onError)
      playbackStrategy.addTimeUpdateCallback(this, onTimeUpdate)

      bubbleErrorCleared()

      mediaMetaData = bigscreenPlayerData.media

      loadMedia(bigscreenPlayerData.media.type, bigscreenPlayerData.initialPlaybackTime)
    })
    .catch((error) => {
      errorCallback && errorCallback(error)
    })

  function play() {
    playbackStrategy?.play()
  }

  function isEnded() {
    return playbackStrategy?.isEnded()
  }

  function pause() {
    if (transitions().canBePaused()) {
      playbackStrategy?.pause()
    }
  }

  function getDuration() {
    return playbackStrategy?.getDuration()
  }

  function getPlayerElement() {
    let element = null
    if (playbackStrategy?.getPlayerElement) {
      element = playbackStrategy.getPlayerElement()
    }
    return element
  }

  function getCurrentTime() {
    return playbackStrategy?.getCurrentTime()
  }

  function getSeekableRange() {
    return playbackStrategy?.getSeekableRange()
  }

  function isAudioDescribedAvailable() {
    const genericAD = mediaSources.isAudioDescribedAvailable()
    const playbackStrategyProvidedAD = () => playbackStrategy && playbackStrategy.isAudioDescribedAvailable?.()

    return genericAD || playbackStrategyProvidedAD()
  }

  function isAudioDescribedEnabled() {
    const genericADAvailable = mediaSources.isAudioDescribedAvailable()
    const genericADEnabled = mediaSources.isAudioDescribedEnabled()
    const playbackStrategyProvidedAD = () => playbackStrategy && playbackStrategy.isAudioDescribedEnabled?.()

    return genericADAvailable ? genericADEnabled : playbackStrategyProvidedAD()
  }

  function setupPauseAfterLoad() {
    isPaused() &&
      playbackStrategy.addMediaPlayerEventCallback &&
      playbackStrategy.addMediaPlayerEventCallback(this, function pauseCallback(event) {
        if (event.type === MediaPlayerBase.EVENT.METADATA) {
          playbackStrategy.pause()
          playbackStrategy.removeMediaPlayerEventCallback(pauseCallback)
        }
      })
  }

  function genericAudioDescribedSwitch(to) {
    const sources = to ? mediaSources.getAudioDescribedSources() : mediaSources.getMainSources()

    setupPauseAfterLoad()
    return replaceMediaSources(sources).then(() => {
      DebugTool.info(`Source changed. Audio Described ${to ? "on" : "off"}.`)

      audioDescribedCallback(to)
    })
  }

  function setAudioDescribedOn() {
    if (mediaSources.isAudioDescribedAvailable()) return genericAudioDescribedSwitch(true)
    if (!(playbackStrategy && playbackStrategy.isAudioDescribedAvailable?.())) return

    playbackStrategy && playbackStrategy.setAudioDescribedOn?.()
    return Promise.resolve()
  }

  function setAudioDescribedOff() {
    if (mediaSources.isAudioDescribedAvailable()) return genericAudioDescribedSwitch(false)
    if (!(playbackStrategy && playbackStrategy.isAudioDescribedAvailable?.())) return

    playbackStrategy && playbackStrategy.setAudioDescribedOff?.()
    return Promise.resolve()
  }

  function isPaused() {
    return playbackStrategy?.isPaused()
  }

  function setCurrentTime(presentationTimeInSeconds) {
    if (transitions().canBeginSeek()) {
      playbackStrategy?.setCurrentTime(presentationTimeInSeconds)
    }
  }

  function setPlaybackRate(rate) {
    playbackStrategy?.setPlaybackRate(rate)
  }

  function getPlaybackRate() {
    return playbackStrategy?.getPlaybackRate()
  }

  function transitions() {
    return playbackStrategy?.transitions
  }

  function tearDownMediaElement() {
    clearTimeouts()
    playbackStrategy?.reset()
  }

  function eventCallback(mediaState) {
    switch (mediaState) {
      case MediaState.PLAYING:
        onPlaying()
        break

      case MediaState.PAUSED:
        onPaused()
        break

      case MediaState.WAITING:
        onBuffering()
        break

      case MediaState.ENDED:
        onEnded()
        break

      default:
        break
    }
  }

  function onPlaying() {
    clearTimeouts()
    publishMediaStateUpdate(MediaState.PLAYING, {})
    isInitialPlay = false
  }

  function onPaused() {
    publishMediaStateUpdate(MediaState.PAUSED)
    clearTimeouts()
  }

  function onBuffering() {
    publishMediaStateUpdate(MediaState.WAITING)
    startBufferingErrorTimeout()
    bubbleErrorCleared()
    bubbleBufferingRaised()
  }

  function onEnded() {
    clearTimeouts()
    publishMediaStateUpdate(MediaState.ENDED)
  }

  function onTimeUpdate() {
    publishMediaStateUpdate(undefined, { timeUpdate: true })
  }

  function onError(mediaError) {
    bubbleBufferingCleared()
    raiseError(mediaError)
  }

  function startBufferingErrorTimeout() {
    const bufferingTimeout = isInitialPlay ? 30000 : 20000
    clearBufferingErrorTimeout()
    errorTimeoutID = setTimeout(() => {
      bubbleBufferingCleared()
      attemptCdnFailover({
        code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
        message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
      })
    }, bufferingTimeout)
  }

  function raiseError(mediaError) {
    clearBufferingErrorTimeout()
    publishMediaStateUpdate(MediaState.WAITING)
    bubbleErrorRaised(mediaError)
    startFatalErrorTimeout(mediaError)
  }

  function startFatalErrorTimeout(mediaError) {
    if (!fatalErrorTimeout && !fatalError) {
      fatalErrorTimeout = setTimeout(() => {
        fatalErrorTimeout = null
        fatalError = true
        attemptCdnFailover(mediaError)
      }, 5000)
    }
  }

  function attemptCdnFailover(mediaError) {
    const presentationTimeInSeconds = getCurrentTime()
    const availabilityTimeInMilliseconds = presentationTimeToAvailabilityTimeInMilliseconds(
      presentationTimeInSeconds,
      mediaSources.time().availabilityStartTimeInMilliseconds
    )
    const bufferingTimeoutError = mediaError.code === PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT

    const failoverParams = {
      isBufferingTimeoutError: bufferingTimeoutError,
      currentTime: presentationTimeInSeconds,
      duration: getDuration(),
      code: mediaError.code,
      message: mediaError.message,
    }

    mediaSources
      .failover(failoverParams)
      .then(() => {
        const thenPause = isPaused()
        tearDownMediaElement()
        const presentationTimeInSeconds = availabilityTimeToPresentationTimeInSeconds(
          availabilityTimeInMilliseconds,
          mediaSources.time().availabilityStartTimeInMilliseconds
        )
        loadMedia(mediaMetaData.type, presentationTimeInSeconds, thenPause)
      })
      .catch(() => {
        bubbleFatalError(bufferingTimeoutError, mediaError)
      })
  }

  function clearFatalErrorTimeout() {
    if (fatalErrorTimeout !== null) {
      clearTimeout(fatalErrorTimeout)
      fatalErrorTimeout = null
    }
  }

  function clearBufferingErrorTimeout() {
    if (errorTimeoutID !== null) {
      clearTimeout(errorTimeoutID)
      errorTimeoutID = null
    }
  }

  function clearTimeouts() {
    clearBufferingErrorTimeout()
    clearFatalErrorTimeout()
    fatalError = false
    bubbleBufferingCleared()
    bubbleErrorCleared()
  }

  function bubbleErrorCleared() {
    const evt = new PluginData({ status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR })
    Plugins.interface.onErrorCleared(evt)
  }

  function bubbleErrorRaised(mediaError) {
    const evt = new PluginData({
      status: PluginEnums.STATUS.STARTED,
      stateType: PluginEnums.TYPE.ERROR,
      isBufferingTimeoutError: false,
      code: mediaError.code,
      message: mediaError.message,
    })
    Plugins.interface.onError(evt)
  }

  function bubbleBufferingRaised() {
    const evt = new PluginData({ status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.BUFFERING })
    Plugins.interface.onBuffering(evt)
  }

  function bubbleBufferingCleared() {
    const evt = new PluginData({
      status: PluginEnums.STATUS.DISMISSED,
      stateType: PluginEnums.TYPE.BUFFERING,
      isInitialPlay,
    })
    Plugins.interface.onBufferingCleared(evt)
  }

  function bubbleFatalError(bufferingTimeoutError, mediaError) {
    const evt = new PluginData({
      status: PluginEnums.STATUS.FATAL,
      stateType: PluginEnums.TYPE.ERROR,
      isBufferingTimeoutError: bufferingTimeoutError,
      code: mediaError.code,
      message: mediaError.message,
    })
    Plugins.interface.onFatalError(evt)
    publishMediaStateUpdate(MediaState.FATAL_ERROR, {
      isBufferingTimeoutError: bufferingTimeoutError,
      code: mediaError.code,
      message: mediaError.message,
    })
  }

  function publishMediaStateUpdate(state, opts) {
    const stateUpdateData = {
      data: {
        currentTime: getCurrentTime(),
        seekableRange: getSeekableRange(),
        state,
        duration: getDuration(),
      },
      timeUpdate: opts?.timeUpdate ?? false,
      isBufferingTimeoutError: opts?.isBufferingTimeoutError ?? false,
    }

    if (opts && opts.code > -1 && opts.message) {
      stateUpdateData.code = opts.code
      stateUpdateData.message = opts.message
    }

    // guard against attempting to call _stateUpdateCallback after a tearDown
    // can happen if tearing down whilst an async cdn failover is being attempted

    if (_stateUpdateCallback) {
      _stateUpdateCallback(stateUpdateData)
    }
  }

  function loadMedia(type, presentationTimeInSeconds, thenPause) {
    playbackStrategy?.load(type, presentationTimeInSeconds, !thenPause)
    if (thenPause) {
      pause()
    }

    if (bigscreenPlayerData.enableAudioDescribed && mediaSources.isAudioDescribedAvailable()) {
      DebugTool.info("Source initialised. Audio Described on.")
    } else if (mediaSources.isAudioDescribedAvailable()) {
      DebugTool.info("Source initialised. Audio Described off.")
    }
  }

  function replaceMediaSources(sources) {
    const wasPaused = isPaused()
    const presentationTimeInSeconds = getCurrentTime()
    const availabilityTimeInMilliseconds = presentationTimeToAvailabilityTimeInMilliseconds(
      presentationTimeInSeconds,
      mediaSources.time().availabilityStartTimeInMilliseconds
    )

    return mediaSources
      .replace(sources)
      .then(() => {
        const presentationTimeInSeconds = availabilityTimeToPresentationTimeInSeconds(
          availabilityTimeInMilliseconds,
          mediaSources.time().availabilityStartTimeInMilliseconds
        )

        tearDownMediaElement()
        loadMedia(mediaMetaData.type, presentationTimeInSeconds, wasPaused)
      })
      .catch(() => {
        bubbleFatalError(false, { code: "0000", message: "error replacing sources" })
      })
  }

  function tearDown() {
    tearDownMediaElement()
    playbackStrategy?.tearDown()
    playbackStrategy = null
    isInitialPlay = true
    errorTimeoutID = undefined
    mediaKind = undefined
    _stateUpdateCallback = undefined
    mediaMetaData = undefined
    fatalErrorTimeout = undefined
    fatalError = undefined
  }

  return {
    play,
    pause,
    transitions,
    isEnded,
    setPlaybackRate,
    getPlaybackRate,
    setCurrentTime,
    getCurrentTime,
    getDuration,
    getSeekableRange,
    getPlayerElement,
    isPaused,
    replaceMediaSources,
    tearDown,
    isAudioDescribedAvailable,
    isAudioDescribedEnabled,
    setAudioDescribedOn,
    setAudioDescribedOff,
  }
}

function getLiveSupport() {
  return window.bigscreenPlayer?.liveSupport || LiveSupport.SEEKABLE
}

PlayerComponent.getLiveSupport = getLiveSupport

export default PlayerComponent
