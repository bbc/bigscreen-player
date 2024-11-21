import DebugTool from "../debugger/debugtool"
import MediaState from "../models/mediastate"
import { ManifestType } from "../models/manifesttypes"
import AllowedMediaTransitions from "../allowedmediatransitions"
import LiveGlitchCurtain from "./liveglitchcurtain"

function LegacyPlayerAdapter(mediaSources, playbackElement, isUHD, player) {
  const manifestType = mediaSources.time().manifestType
  const EVENT_HISTORY_LENGTH = 2

  const setSourceOpts = {
    disableSentinels:
      !!isUHD && manifestType === ManifestType.DYNAMIC && window.bigscreenPlayer?.overrides?.liveUhdDisableSentinels,
    disableSeekSentinel: !!window.bigscreenPlayer?.overrides?.disableSeekSentinel,
  }

  const timeCorrection = mediaSources.time()?.timeCorrectionSeconds || 0
  const mediaPlayer = player
  const eventHistory = []

  const transitions = new AllowedMediaTransitions(mediaPlayer)

  let isEnded = false
  let duration = 0

  let eventCallback
  let errorCallback
  let timeUpdateCallback
  let currentTime
  let isPaused
  let hasStartTime

  let handleErrorOnExitingSeek
  let delayPauseOnExitSeek

  let pauseOnExitSeek
  let exitingSeek
  let targetSeekToTime

  let liveGlitchCurtain

  let strategy = window.bigscreenPlayer && window.bigscreenPlayer.playbackStrategy

  mediaPlayer.addEventCallback(this, eventHandler)

  strategy = strategy.match(/.+(?=strategy)/g)[0]

  function eventHandler(event) {
    const handleEvent = {
      "playing": onPlaying,
      "paused": onPaused,
      "buffering": onBuffering,
      "seek-attempted": onSeekAttempted,
      "seek-finished": onSeekFinished,
      "status": onTimeUpdate,
      "complete": onEnded,
      "error": onError,
    }

    if (handleEvent.hasOwnProperty(event.type)) {
      handleEvent[event.type].call(this, event)
    } else {
      DebugTool.info(`${getSelection()} Event:${event.type}`)
    }

    if (event.type !== "status") {
      if (eventHistory.length >= EVENT_HISTORY_LENGTH) {
        eventHistory.pop()
      }

      eventHistory.unshift({ type: event.type, time: Date.now() })
    }
  }

  function onPlaying(event) {
    currentTime = event.currentTime
    isPaused = false
    isEnded = false
    duration = duration || event.duration
    publishMediaState(MediaState.PLAYING)
  }

  function onPaused(_event) {
    isPaused = true
    publishMediaState(MediaState.PAUSED)
  }

  function onBuffering(_event) {
    isEnded = false
    publishMediaState(MediaState.WAITING)
  }

  function onTimeUpdate(event) {
    DebugTool.updateElementTime(event.currentTime)

    isPaused = false

    // Note: Multiple consecutive CDN failover logic
    // A newly loaded video element will always report a 0 time update
    // This is slightly unhelpful if we want to continue from a later point but consult currentTime as the source of truth.
    if (parseInt(event.currentTime) !== 0) {
      currentTime = event.currentTime
    }

    // Must publish this time update before checkSeekSucceded - which could cause a pause event
    // This is a device specific event ordering issue.
    publishTimeUpdate()

    if ((handleErrorOnExitingSeek || delayPauseOnExitSeek) && exitingSeek) {
      checkSeekSucceeded(event.seekableRange.start, event.currentTime)
    }
  }

  function onEnded() {
    isPaused = true
    isEnded = true
    publishMediaState(MediaState.ENDED)
  }

  function onError(error) {
    if (handleErrorOnExitingSeek && exitingSeek) {
      restartMediaPlayer()
    } else {
      const mediaError = {
        code: error.code || 0,
        message: error.message || "unknown",
      }
      publishError(mediaError)
    }
  }

  function onSeekAttempted() {
    if (requiresLiveCurtain()) {
      const doNotForceBeginPlaybackToEndOfWindow = {
        forceBeginPlaybackToEndOfWindow: false,
      }

      const streaming = window.bigscreenPlayer || {
        overrides: doNotForceBeginPlaybackToEndOfWindow,
      }

      const overrides = streaming.overrides || doNotForceBeginPlaybackToEndOfWindow
      const shouldShowCurtain =
        manifestType === ManifestType.DYNAMIC && (hasStartTime || overrides.forceBeginPlaybackToEndOfWindow)

      if (shouldShowCurtain) {
        liveGlitchCurtain = new LiveGlitchCurtain(playbackElement)
        liveGlitchCurtain.showCurtain()
      }
    }
  }

  function onSeekFinished() {
    if (requiresLiveCurtain() && liveGlitchCurtain) {
      liveGlitchCurtain.hideCurtain()
    }
  }

  function publishMediaState(mediaState) {
    if (eventCallback) {
      eventCallback(mediaState)
    }
  }

  function publishError(mediaError) {
    if (errorCallback) {
      errorCallback(mediaError)
    }
  }

  function publishTimeUpdate() {
    if (timeUpdateCallback) {
      timeUpdateCallback()
    }
  }

  function getStrategy() {
    return strategy.toUpperCase()
  }

  function setupExitSeekWorkarounds(mimeType) {
    handleErrorOnExitingSeek = manifestType === ManifestType.DYNAMIC && mimeType === "application/dash+xml"

    const deviceFailsPlayAfterPauseOnExitSeek =
      window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.pauseOnExitSeek
    delayPauseOnExitSeek = handleErrorOnExitingSeek || deviceFailsPlayAfterPauseOnExitSeek
  }

  function checkSeekSucceeded(seekableRangeStart, currentTime) {
    const SEEK_TOLERANCE = 30

    const clampedSeekToTime = Math.max(seekableRangeStart, targetSeekToTime)
    const successfullySeeked = Math.abs(currentTime - clampedSeekToTime) < SEEK_TOLERANCE

    if (successfullySeeked) {
      if (pauseOnExitSeek) {
        // Delay call to pause until seek has completed
        // successfully for scenarios which can error upon exiting seek.
        mediaPlayer.pause()
        pauseOnExitSeek = false
      }

      exitingSeek = false
    }
  }

  // Dash live streams can error on exiting seek when the start of the
  // seekable range has overtaken the point where the stream was paused
  // Workaround - reset the media player then do a fresh beginPlaybackFrom()
  function restartMediaPlayer() {
    exitingSeek = false
    pauseOnExitSeek = false

    const source = mediaPlayer.getSource()
    const mimeType = mediaPlayer.getMimeType()

    reset()
    mediaPlayer.initialiseMedia("video", source, mimeType, playbackElement, setSourceOpts)
    mediaPlayer.beginPlaybackFrom(currentTime || 0)
  }

  function requiresLiveCurtain() {
    return !!window.bigscreenPlayer?.overrides?.showLiveCurtain
  }

  function reset() {
    if (transitions.canBeStopped()) {
      mediaPlayer.stop()
    }

    mediaPlayer.reset()
  }

  return {
    transitions,
    addEventCallback: (thisArg, newCallback) => {
      eventCallback = (event) => newCallback.call(thisArg, event)
    },
    addErrorCallback: (thisArg, newErrorCallback) => {
      errorCallback = (event) => newErrorCallback.call(thisArg, event)
    },
    addTimeUpdateCallback: (thisArg, newTimeUpdateCallback) => {
      timeUpdateCallback = () => newTimeUpdateCallback.call(thisArg)
    },
    load: (mimeType, startTime) => {
      setupExitSeekWorkarounds(mimeType)
      isPaused = false

      hasStartTime = startTime || startTime === 0
      const isPlaybackFromLivePoint = manifestType === ManifestType.DYNAMIC && !hasStartTime

      mediaPlayer.initialiseMedia("video", mediaSources.currentSource(), mimeType, playbackElement, setSourceOpts)

      if (!isPlaybackFromLivePoint && typeof mediaPlayer.beginPlaybackFrom === "function") {
        currentTime = startTime
        mediaPlayer.beginPlaybackFrom(startTime || 0)
      } else {
        mediaPlayer.beginPlayback()
      }
    },
    play: () => {
      isPaused = false
      if (delayPauseOnExitSeek && exitingSeek) {
        pauseOnExitSeek = false
      } else {
        if (isEnded) {
          mediaPlayer.playFrom && mediaPlayer.playFrom(0)
        } else if (transitions.canResume()) {
          mediaPlayer.resume && mediaPlayer.resume()
        } else {
          mediaPlayer.playFrom && mediaPlayer.playFrom(currentTime)
        }
      }
    },
    pause: () => {
      // TODO - transitions is checked in playerComponent. The check can be removed here.
      if (delayPauseOnExitSeek && exitingSeek && transitions.canBePaused()) {
        pauseOnExitSeek = true
      } else {
        mediaPlayer.pause()
      }
    },
    isPaused: () => isPaused,
    isEnded: () => isEnded,
    getDuration: () => duration,
    getPlayerElement: () => mediaPlayer.getPlayerElement && mediaPlayer.getPlayerElement(),
    getSeekableRange: () => {
      if (manifestType === ManifestType.STATIC) {
        return {
          start: 0,
          end: duration,
        }
      }

      return typeof mediaPlayer.getSeekableRange === "function" ? mediaPlayer.getSeekableRange() : {}
    },
    setPlaybackRate: (rate) => {
      if (typeof mediaPlayer.setPlaybackRate === "function") {
        mediaPlayer.setPlaybackRate(rate)
      }
    },
    getPlaybackRate: () => {
      if (typeof mediaPlayer.getPlaybackRate === "function") {
        return mediaPlayer.getPlaybackRate()
      }
      return 1
    },
    getCurrentTime: () => currentTime,
    setCurrentTime: (seekToTime) => {
      isEnded = false
      currentTime = seekToTime
      const correctedSeekToTime = seekToTime + timeCorrection

      if (handleErrorOnExitingSeek || delayPauseOnExitSeek) {
        targetSeekToTime = correctedSeekToTime
        exitingSeek = true
        pauseOnExitSeek = isPaused
      }

      mediaPlayer.playFrom && mediaPlayer.playFrom(correctedSeekToTime)

      if (isPaused && !delayPauseOnExitSeek && typeof mediaPlayer.pause === "function") {
        mediaPlayer.pause()
      }
    },
    getStrategy: getStrategy(),
    reset,
    tearDown: () => {
      mediaPlayer.removeAllEventCallbacks()
      pauseOnExitSeek = false
      exitingSeek = false
      pauseOnExitSeek = false
      delayPauseOnExitSeek = false
      isPaused = true
      isEnded = false
      if (liveGlitchCurtain) {
        liveGlitchCurtain.tearDown()
        liveGlitchCurtain = undefined
      }
      eventCallback = undefined
      errorCallback = undefined
      timeUpdateCallback = undefined
    },
  }
}

export default LegacyPlayerAdapter
