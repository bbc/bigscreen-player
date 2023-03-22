import MediaPlayerBase from "../modifiers/mediaplayerbase"
import DebugTool from "../../debugger/debugtool"
import DOMHelpers from "../../domhelpers"

const STATE = {
  STOPPED: 0,
  PLAYING: 1,
  PAUSED: 2,
  CONNECTING: 3,
  BUFFERING: 4,
  FINISHED: 5,
  ERROR: 6,
}

function Cehtml() {
  let eventCallbacks = []
  let state = MediaPlayerBase.STATE.EMPTY

  let mediaElement
  let updateInterval

  let mediaType
  let source
  let mimeType

  let deferSeekingTo
  let range

  let postBufferingState
  let seekFinished
  let count
  let timeoutHappened

  let disableSentinels

  let sentinelSeekTime
  let seekSentinelTolerance
  let sentinelInterval
  let sentinelIntervalNumber
  let timeAtLastSentinelInterval

  let sentinelTimeIsNearEnd
  let timeHasAdvanced

  const sentinelLimits = {
    pause: {
      maximumAttempts: 2,
      successEvent: MediaPlayerBase.EVENT.SENTINEL_PAUSE,
      failureEvent: MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE,
      currentAttemptCount: 0,
    },
    seek: {
      maximumAttempts: 2,
      successEvent: MediaPlayerBase.EVENT.SENTINEL_SEEK,
      failureEvent: MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE,
      currentAttemptCount: 0,
    },
  }

  function addEventCallback(thisArg, callback) {
    const eventCallback = (event) => callback.call(thisArg, event)

    eventCallbacks.push({ from: callback, to: eventCallback })
  }

  function removeEventCallback(_thisArg, callback) {
    eventCallbacks = eventCallbacks.filter((cb) => cb.from !== callback)
  }

  function removeAllEventCallbacks() {
    eventCallbacks = []
  }

  function emitEvent(eventType, eventLabels) {
    const event = {
      type: eventType,
      currentTime: getCurrentTime(),
      seekableRange: getSeekableRange(),
      duration: getDuration(),
      url: getSource(),
      mimeType: getMimeType(),
      state: getState(),
    }

    if (eventLabels) {
      for (const key in eventLabels) {
        if (eventLabels.hasOwnProperty(key)) {
          event[key] = eventLabels[key]
        }
      }
    }

    eventCallbacks.forEach((callback) => callback.to(event))
  }

  function getClampedTime(seconds) {
    const CLAMP_OFFSET_FROM_END_OF_RANGE = 1.1
    const range = getSeekableRange()
    const nearToEnd = Math.max(range.end - CLAMP_OFFSET_FROM_END_OF_RANGE, range.start)

    if (seconds < range.start) {
      return range.start
    } else if (seconds > nearToEnd) {
      return nearToEnd
    } else {
      return seconds
    }
  }

  function isLiveMedia() {
    return mediaType === MediaPlayerBase.TYPE.LIVE_VIDEO || mediaType === MediaPlayerBase.TYPE.LIVE_AUDIO
  }

  function getSource() {
    return source
  }

  function getMimeType() {
    return mimeType
  }

  function getState() {
    return state
  }

  function setSeekSentinelTolerance() {
    const ON_DEMAND_SEEK_SENTINEL_TOLERANCE = 15
    const LIVE_SEEK_SENTINEL_TOLERANCE = 30

    seekSentinelTolerance = ON_DEMAND_SEEK_SENTINEL_TOLERANCE
    if (isLiveMedia()) {
      seekSentinelTolerance = LIVE_SEEK_SENTINEL_TOLERANCE
    }
  }

  function initialiseMedia(type, url, mediaMimeType, sourceContainer, opts) {
    opts = opts || {}
    disableSentinels = opts.disableSentinels
    mediaType = type
    source = url
    mimeType = mediaMimeType

    emitSeekAttempted()

    if (getState() === MediaPlayerBase.STATE.EMPTY) {
      timeAtLastSentinelInterval = 0
      setSeekSentinelTolerance()
      createElement()
      addElementToDOM()
      mediaElement.data = source
      registerEventHandlers()
      toStopped()
    } else {
      toError("Cannot set source unless in the '" + MediaPlayerBase.STATE.EMPTY + "' state")
    }
  }

  function resume() {
    postBufferingState = MediaPlayerBase.STATE.PLAYING
    switch (getState()) {
      case MediaPlayerBase.STATE.PLAYING:
      case MediaPlayerBase.STATE.BUFFERING:
        break

      case MediaPlayerBase.STATE.PAUSED:
        mediaElement.play(1)
        toPlaying()
        break

      default:
        toError("Cannot resume while in the '" + getState() + "' state")
        break
    }
  }

  function playFrom(seconds) {
    postBufferingState = MediaPlayerBase.STATE.PLAYING
    sentinelLimits.seek.currentAttemptCount = 0
    switch (getState()) {
      case MediaPlayerBase.STATE.BUFFERING:
        deferSeekingTo = seconds
        break

      case MediaPlayerBase.STATE.COMPLETE:
        toBuffering()
        mediaElement.stop()
        playAndSetDeferredSeek(seconds)
        break

      case MediaPlayerBase.STATE.PLAYING:
        toBuffering()
        const seekResult = seekTo(seconds)
        if (seekResult === false) {
          toPlaying()
        }
        break

      case MediaPlayerBase.STATE.PAUSED:
        toBuffering()
        seekTo(seconds)
        mediaElement.play(1)
        break

      default:
        toError("Cannot playFrom while in the '" + getState() + "' state")
        break
    }
  }

  function getDuration() {
    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
      case MediaPlayerBase.STATE.ERROR:
        return undefined
      default:
        if (isLiveMedia()) {
          return Infinity
        }
        return getMediaDuration()
    }
  }

  function beginPlayback() {
    postBufferingState = MediaPlayerBase.STATE.PLAYING
    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
        toBuffering()
        mediaElement.play(1)
        break

      default:
        toError("Cannot beginPlayback while in the '" + getState() + "' state")
        break
    }
  }

  function beginPlaybackFrom(seconds) {
    postBufferingState = MediaPlayerBase.STATE.PLAYING
    sentinelLimits.seek.currentAttemptCount = 0

    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
        // Seeking past 0 requires calling play first when media has not been loaded
        toBuffering()
        playAndSetDeferredSeek(seconds)
        break

      default:
        toError("Cannot beginPlayback while in the '" + getState() + "' state")
        break
    }
  }

  function pause() {
    postBufferingState = MediaPlayerBase.STATE.PAUSED
    switch (getState()) {
      case MediaPlayerBase.STATE.BUFFERING:
      case MediaPlayerBase.STATE.PAUSED:
        break

      case MediaPlayerBase.STATE.PLAYING:
        mediaElement.play(0)
        toPaused()
        break

      default:
        toError("Cannot pause while in the '" + getState() + "' state")
        break
    }
  }

  function stop() {
    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
        break

      case MediaPlayerBase.STATE.BUFFERING:
      case MediaPlayerBase.STATE.PLAYING:
      case MediaPlayerBase.STATE.PAUSED:
      case MediaPlayerBase.STATE.COMPLETE:
        sentinelSeekTime = undefined
        if (mediaElement.stop) {
          mediaElement.stop()
          toStopped()
        } else {
          toError("mediaElement.stop is not a function : failed to stop the media player")
        }
        break

      default:
        toError("Cannot stop while in the '" + getState() + "' state")
        break
    }
  }

  function reset() {
    switch (getState()) {
      case MediaPlayerBase.STATE.EMPTY:
        break

      case MediaPlayerBase.STATE.STOPPED:
      case MediaPlayerBase.STATE.ERROR:
        toEmpty()
        break

      default:
        toError("Cannot reset while in the '" + getState() + "' state")
        break
    }
  }

  function getCurrentTime() {
    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
      case MediaPlayerBase.STATE.ERROR:
        break

      case MediaPlayerBase.STATE.COMPLETE:
        if (range) {
          return range.end
        }
        break

      default:
        if (mediaElement) {
          return mediaElement.playPosition / 1000
        }
        break
    }
    return undefined
  }

  function getSeekableRange() {
    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
      case MediaPlayerBase.STATE.ERROR:
        break

      default:
        return range
    }
    return undefined
  }

  function getMediaDuration() {
    if (range) {
      return range.end
    }
    return undefined
  }

  function getPlayerElement() {
    return mediaElement
  }

  function onFinishedBuffering() {
    cacheRange()

    if (getState() !== MediaPlayerBase.STATE.BUFFERING) {
      return
    }

    if (waitingToSeek()) {
      toBuffering()
      performDeferredSeek()
    } else if (waitingToPause()) {
      toPaused()
      mediaElement.play(0)
    } else {
      toPlaying()
    }
  }

  function onDeviceError() {
    reportError("Media element error code: " + mediaElement.error)
  }

  function onDeviceBuffering() {
    if (getState() === MediaPlayerBase.STATE.PLAYING) {
      toBuffering()
    }
  }

  function onEndOfMedia() {
    if (getState() !== MediaPlayerBase.STATE.COMPLETE) {
      toComplete()
    }
  }

  function emitSeekAttempted() {
    if (getState() === MediaPlayerBase.STATE.EMPTY) {
      emitEvent(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)
      seekFinished = false
    }

    count = 0
    timeoutHappened = false
    if (window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.restartTimeout) {
      setTimeout(() => {
        timeoutHappened = true
      }, window.bigscreenPlayer.overrides.restartTimeout)
    } else {
      timeoutHappened = true
    }
  }

  function emitSeekFinishedAtCorrectStartingPoint() {
    let isAtCorrectStartingPoint = Math.abs(getCurrentTime() - sentinelSeekTime) <= seekSentinelTolerance

    if (sentinelSeekTime === undefined) {
      isAtCorrectStartingPoint = true
    }

    const isPlayingAtCorrectTime = getState() === MediaPlayerBase.STATE.PLAYING && isAtCorrectStartingPoint

    if (isPlayingAtCorrectTime && count >= 5 && timeoutHappened && !seekFinished) {
      emitEvent(MediaPlayerBase.EVENT.SEEK_FINISHED)
      seekFinished = true
    } else if (isPlayingAtCorrectTime) {
      count++
    } else {
      count = 0
    }
  }

  function onStatus() {
    if (getState() === MediaPlayerBase.STATE.PLAYING) {
      emitEvent(MediaPlayerBase.EVENT.STATUS)
    }

    emitSeekFinishedAtCorrectStartingPoint()
  }

  function createElement() {
    mediaElement = document.createElement("object", "mediaPlayer")
    mediaElement.type = mimeType
    mediaElement.style.position = "absolute"
    mediaElement.style.top = "0px"
    mediaElement.style.left = "0px"
    mediaElement.style.width = "100%"
    mediaElement.style.height = "100%"
  }

  function registerEventHandlers() {
    const DEVICE_UPDATE_PERIOD_MS = 500

    mediaElement.onPlayStateChange = () => {
      switch (mediaElement.playState) {
        case STATE.STOPPED:
          break
        case STATE.PLAYING:
          onFinishedBuffering()
          break
        case STATE.PAUSED:
          break
        case STATE.CONNECTING:
          break
        case STATE.BUFFERING:
          onDeviceBuffering()
          break
        case STATE.FINISHED:
          onEndOfMedia()
          break
        case STATE.ERROR:
          onDeviceError()
          break
        default:
          // do nothing
          break
      }
    }

    updateInterval = setInterval(() => onStatus(), DEVICE_UPDATE_PERIOD_MS)
  }

  function addElementToDOM() {
    const body = document.getElementsByTagName("body")[0]
    body.insertBefore(mediaElement, body.firstChild)
  }

  function cacheRange() {
    if (mediaElement) {
      range = {
        start: 0,
        end: mediaElement.playTime / 1000,
      }
    }
  }

  function playAndSetDeferredSeek(seconds) {
    mediaElement.play(1)
    if (seconds > 0) {
      deferSeekingTo = seconds
    }
  }

  function waitingToSeek() {
    return deferSeekingTo !== undefined
  }

  function performDeferredSeek() {
    seekTo(deferSeekingTo)
    deferSeekingTo = undefined
  }

  function seekTo(seconds) {
    const clampedTime = getClampedTime(seconds)

    if (clampedTime !== seconds) {
      DebugTool.info(
        "playFrom " +
          seconds +
          " clamped to " +
          clampedTime +
          " - seekable range is { start: " +
          range.start +
          ", end: " +
          range.end +
          " }"
      )
    }

    sentinelSeekTime = clampedTime
    return mediaElement.seek(clampedTime * 1000)
  }

  function waitingToPause() {
    return postBufferingState === MediaPlayerBase.STATE.PAUSED
  }

  function wipe() {
    mediaType = undefined
    source = undefined
    mimeType = undefined
    sentinelSeekTime = undefined
    range = undefined

    if (mediaElement) {
      clearInterval(updateInterval)
      clearSentinels()
      destroyMediaElement()
    }
  }

  function destroyMediaElement() {
    delete mediaElement.onPlayStateChange
    DOMHelpers.safeRemoveElement(mediaElement)
    mediaElement = undefined
  }

  function reportError(errorMessage) {
    DebugTool.info(errorMessage)
    emitEvent(MediaPlayerBase.EVENT.ERROR, { errorMessage: errorMessage })
  }

  function toStopped() {
    state = MediaPlayerBase.STATE.STOPPED
    emitEvent(MediaPlayerBase.EVENT.STOPPED)
    if (sentinelInterval) {
      clearSentinels()
    }
  }

  function toBuffering() {
    state = MediaPlayerBase.STATE.BUFFERING
    emitEvent(MediaPlayerBase.EVENT.BUFFERING)
    setSentinels([exitBufferingSentinel])
  }

  function toPlaying() {
    state = MediaPlayerBase.STATE.PLAYING
    emitEvent(MediaPlayerBase.EVENT.PLAYING)
    setSentinels([shouldBeSeekedSentinel, enterCompleteSentinel, enterBufferingSentinel])
  }

  function toPaused() {
    state = MediaPlayerBase.STATE.PAUSED
    emitEvent(MediaPlayerBase.EVENT.PAUSED)
    setSentinels([shouldBePausedSentinel, shouldBeSeekedSentinel])
  }

  function toComplete() {
    state = MediaPlayerBase.STATE.COMPLETE
    emitEvent(MediaPlayerBase.EVENT.COMPLETE)
    clearSentinels()
  }

  function toEmpty() {
    wipe()
    state = MediaPlayerBase.STATE.EMPTY
  }

  function toError(errorMessage) {
    wipe()
    state = MediaPlayerBase.STATE.ERROR
    reportError(errorMessage)
  }

  function isNearToEnd(seconds) {
    return getDuration() - seconds <= 1
  }

  function setSentinels(sentinels) {
    if (disableSentinels) {
      return
    }

    sentinelLimits.pause.currentAttemptCount = 0
    timeAtLastSentinelInterval = getCurrentTime()
    clearSentinels()
    sentinelIntervalNumber = 0
    sentinelInterval = setInterval(() => {
      const newTime = getCurrentTime()
      sentinelIntervalNumber++

      timeHasAdvanced = newTime ? newTime > timeAtLastSentinelInterval + 0.2 : false
      sentinelTimeIsNearEnd = isNearToEnd(newTime || timeAtLastSentinelInterval)

      for (let i = 0; i < sentinels.length; i++) {
        const sentinelActionPerformed = sentinels[i].call(this)
        if (sentinelActionPerformed) {
          break
        }
      }

      timeAtLastSentinelInterval = newTime
    }, 1100)
  }

  function clearSentinels() {
    clearInterval(sentinelInterval)
  }

  function enterBufferingSentinel() {
    const sentinelBufferingRequired = !timeHasAdvanced && !sentinelTimeIsNearEnd && sentinelIntervalNumber > 1

    if (sentinelBufferingRequired) {
      emitEvent(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
      toBuffering()
    }

    return sentinelBufferingRequired
  }

  function exitBufferingSentinel() {
    const sentinelExitBufferingRequired = timeHasAdvanced

    if (sentinelExitBufferingRequired) {
      emitEvent(MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING)
      onFinishedBuffering()
    }

    return sentinelExitBufferingRequired
  }

  function shouldBeSeekedSentinel() {
    if (sentinelSeekTime === undefined) {
      return false
    }

    const currentTime = getCurrentTime()
    const clampedSentinelSeekTime = getClampedTime(sentinelSeekTime)
    const sentinelSeekRequired = Math.abs(clampedSentinelSeekTime - currentTime) > seekSentinelTolerance

    let sentinelActionTaken = false

    if (sentinelSeekRequired) {
      const mediaElement = mediaElement

      sentinelActionTaken = nextSentinelAttempt(sentinelLimits.seek, () => {
        mediaElement.seek(clampedSentinelSeekTime * 1000)
      })
    } else if (sentinelIntervalNumber < 3) {
      sentinelSeekTime = currentTime
    } else {
      sentinelSeekTime = undefined
    }
    return sentinelActionTaken
  }

  function shouldBePausedSentinel() {
    const sentinelPauseRequired = timeHasAdvanced
    let sentinelActionTaken = false

    if (sentinelPauseRequired) {
      const mediaElement = mediaElement

      sentinelActionTaken = nextSentinelAttempt(sentinelLimits.pause, () => {
        mediaElement.play(0)
      })
    }
    return sentinelActionTaken
  }

  function enterCompleteSentinel() {
    const sentinelCompleteRequired = !timeHasAdvanced && sentinelTimeIsNearEnd

    if (sentinelCompleteRequired) {
      emitEvent(MediaPlayerBase.EVENT.SENTINEL_COMPLETE)
      onEndOfMedia()
    }

    return sentinelCompleteRequired
  }

  function nextSentinelAttempt(sentinelInfo, attemptFn) {
    let currentAttemptCount, maxAttemptCount

    sentinelInfo.currentAttemptCount += 1
    currentAttemptCount = sentinelInfo.currentAttemptCount
    maxAttemptCount = sentinelInfo.maximumAttempts

    if (currentAttemptCount === maxAttemptCount + 1) {
      emitEvent(sentinelInfo.failureEvent)
    }

    if (currentAttemptCount <= maxAttemptCount) {
      attemptFn()
      emitEvent(sentinelInfo.successEvent)
      return true
    }

    return false
  }

  return {
    addEventCallback: addEventCallback,
    removeEventCallback: removeEventCallback,
    removeAllEventCallbacks: removeAllEventCallbacks,
    initialiseMedia: initialiseMedia,
    resume: resume,
    playFrom: playFrom,
    beginPlayback: beginPlayback,
    beginPlaybackFrom: beginPlaybackFrom,
    pause: pause,
    stop: stop,
    reset: reset,
    getSource: getSource,
    getMimeType: getMimeType,
    getSeekableRange: getSeekableRange,
    getMediaDuration: getMediaDuration,
    getState: getState,
    getPlayerElement: getPlayerElement,
    getDuration: getDuration,
  }
}

export default Cehtml
