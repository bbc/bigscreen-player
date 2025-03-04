import MediaPlayerBase from "../modifiers/mediaplayerbase"
import DebugTool from "../../debugger/debugtool"

function SamsungMaple() {
  const playerPlugin = document.getElementById("playerPlugin")

  let state = MediaPlayerBase.STATE.EMPTY
  let deferSeekingTo = null
  let postBufferingState = null
  let tryingToPause = false
  let currentTimeKnown = false

  let mediaType
  let source
  let mimeType

  let range
  let currentTime

  let eventCallbacks = []
  let eventCallback

  function initialiseMedia(type, url, mediaMimeType) {
    if (getState() === MediaPlayerBase.STATE.EMPTY) {
      mediaType = type
      source = url
      mimeType = mediaMimeType
      _registerEventHandlers()
      _toStopped()
    } else {
      _toError("Cannot set source unless in the '" + MediaPlayerBase.STATE.EMPTY + "' state")
    }
  }

  function resume() {
    postBufferingState = MediaPlayerBase.STATE.PLAYING
    switch (getState()) {
      case MediaPlayerBase.STATE.PLAYING:
        break

      case MediaPlayerBase.STATE.BUFFERING:
        if (tryingToPause) {
          tryingToPause = false
          toPlaying()
        }
        break

      case MediaPlayerBase.STATE.PAUSED:
        playerPlugin.Resume()
        toPlaying()
        break

      default:
        _toError("Cannot resume while in the '" + getState() + "' state")
        break
    }
  }

  function playFrom(seconds) {
    postBufferingState = MediaPlayerBase.STATE.PLAYING

    const seekingTo = range ? _getClampedTimeForPlayFrom(seconds) : seconds

    switch (getState()) {
      case MediaPlayerBase.STATE.BUFFERING:
        deferSeekingTo = seekingTo
        break

      case MediaPlayerBase.STATE.PLAYING:
        _toBuffering()
        if (!currentTimeKnown) {
          deferSeekingTo = seekingTo
        } else if (_isNearToCurrentTime(seekingTo)) {
          toPlaying()
        } else {
          _seekToWithFailureStateTransition(seekingTo)
        }
        break

      case MediaPlayerBase.STATE.PAUSED:
        _toBuffering()
        if (!currentTimeKnown) {
          deferSeekingTo = seekingTo
        } else if (_isNearToCurrentTime(seekingTo)) {
          playerPlugin.Resume()
          toPlaying()
        } else {
          _seekToWithFailureStateTransition(seekingTo)
          playerPlugin.Resume()
        }
        break

      case MediaPlayerBase.STATE.COMPLETE:
        playerPlugin.Stop()
        _setDisplayFullScreenForVideo()
        playerPlugin.ResumePlay(_wrappedSource(), seekingTo)
        _toBuffering()
        break

      default:
        _toError("Cannot playFrom while in the '" + getState() + "' state")
        break
    }
  }

  function beginPlayback() {
    postBufferingState = MediaPlayerBase.STATE.PLAYING
    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
        _toBuffering()
        _setDisplayFullScreenForVideo()
        playerPlugin.Play(_wrappedSource())
        break

      default:
        _toError("Cannot beginPlayback while in the '" + getState() + "' state")
        break
    }
  }

  function beginPlaybackFrom(seconds) {
    postBufferingState = MediaPlayerBase.STATE.PLAYING

    const seekingTo = range ? _getClampedTimeForPlayFrom(seconds) : seconds

    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
        _setDisplayFullScreenForVideo()
        playerPlugin.ResumePlay(_wrappedSource(), seekingTo)
        _toBuffering()
        break

      default:
        _toError("Cannot beginPlayback while in the '" + getState() + "' state")
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
        _tryPauseWithStateTransition()
        break

      default:
        _toError("Cannot pause while in the '" + getState() + "' state")
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
        _stopPlayer()
        _toStopped()
        break

      default:
        _toError("Cannot stop while in the '" + getState() + "' state")
        break
    }
  }

  function reset() {
    switch (getState()) {
      case MediaPlayerBase.STATE.EMPTY:
        break

      case MediaPlayerBase.STATE.STOPPED:
      case MediaPlayerBase.STATE.ERROR:
        _toEmpty()
        break

      default:
        _toError("Cannot reset while in the '" + getState() + "' state")
        break
    }
  }

  function getSource() {
    return source
  }

  function getMimeType() {
    return mimeType
  }

  function getCurrentTime() {
    if (getState() === MediaPlayerBase.STATE.STOPPED) {
      return undefined
    } else {
      return currentTime
    }
  }

  function getSeekableRange() {
    return range
  }

  function getDuration() {
    if (range) {
      return range.end
    }
    return undefined
  }

  function getState() {
    return state
  }

  function getPlayerElement() {
    return playerPlugin
  }

  function toPlaying() {
    state = MediaPlayerBase.STATE.PLAYING
    _emitEvent(MediaPlayerBase.EVENT.PLAYING)
  }

  function toPaused() {
    state = MediaPlayerBase.STATE.PAUSED
    _emitEvent(MediaPlayerBase.EVENT.PAUSED)
  }

  function _toStopped() {
    currentTime = 0
    range = undefined
    state = MediaPlayerBase.STATE.STOPPED
    _emitEvent(MediaPlayerBase.EVENT.STOPPED)
  }

  function _toBuffering() {
    state = MediaPlayerBase.STATE.BUFFERING
    _emitEvent(MediaPlayerBase.EVENT.BUFFERING)
  }

  function _toComplete() {
    state = MediaPlayerBase.STATE.COMPLETE
    _emitEvent(MediaPlayerBase.EVENT.COMPLETE)
  }

  function _toEmpty() {
    _wipe()
    state = MediaPlayerBase.STATE.EMPTY
  }

  function _toError(errorMessage) {
    _wipe()
    state = MediaPlayerBase.STATE.ERROR
    _reportError(errorMessage)
    throw new Error("ApiError: " + errorMessage)
  }

  function _onFinishedBuffering() {
    if (getState() !== MediaPlayerBase.STATE.BUFFERING) {
      return
    }

    if (deferSeekingTo === null) {
      if (postBufferingState === MediaPlayerBase.STATE.PAUSED) {
        _tryPauseWithStateTransition()
      } else {
        toPlaying()
      }
    }
  }

  function _onDeviceError(message) {
    _reportError(message)
  }

  function _onDeviceBuffering() {
    if (getState() === MediaPlayerBase.STATE.PLAYING) {
      _toBuffering()
    }
  }

  function _onEndOfMedia() {
    _toComplete()
  }

  function _stopPlayer() {
    playerPlugin.Stop()
    currentTimeKnown = false
  }

  function _tryPauseWithStateTransition() {
    let success = _isSuccessCode(playerPlugin.Pause())
    if (success) {
      toPaused()
    }

    tryingToPause = !success
  }

  function _onStatus() {
    let state = getState()
    if (state === MediaPlayerBase.STATE.PLAYING) {
      _emitEvent(MediaPlayerBase.EVENT.STATUS)
    }
  }

  function _onMetadata() {
    range = {
      start: 0,
      end: playerPlugin.GetDuration() / 1000,
    }

    _emitEvent(MediaPlayerBase.EVENT.METADATA)
  }

  function _onCurrentTime(timeInMillis) {
    currentTime = timeInMillis / 1000
    _onStatus()
    currentTimeKnown = true

    if (deferSeekingTo !== null) {
      _deferredSeek()
    }

    if (tryingToPause) {
      _tryPauseWithStateTransition()
    }
  }

  function _deferredSeek() {
    const clampedTime = _getClampedTimeForPlayFrom(deferSeekingTo)
    const isNearCurrentTime = _isNearToCurrentTime(clampedTime)

    if (isNearCurrentTime) {
      toPlaying()
      deferSeekingTo = null
    } else {
      const seekResult = _seekTo(clampedTime)

      if (seekResult) {
        deferSeekingTo = null
      }
    }
  }

  function _getClampedTimeForPlayFrom(seconds) {
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
    return clampedTime
  }

  function _onWindowHide() {
    stop()
  }

  function _registerEventHandlers() {
    window.SamsungMapleOnRenderError = () => _onDeviceError("Media element emitted OnRenderError")
    playerPlugin.OnRenderError = "SamsungMapleOnRenderError"

    window.SamsungMapleOnConnectionFailed = () => _onDeviceError("Media element emitted OnConnectionFailed")
    playerPlugin.OnConnectionFailed = "SamsungMapleOnConnectionFailed"

    window.SamsungMapleOnNetworkDisconnected = () => _onDeviceError("Media element emitted OnNetworkDisconnected")
    playerPlugin.OnNetworkDisconnected = "SamsungMapleOnNetworkDisconnected"

    window.SamsungMapleOnStreamNotFound = () => _onDeviceError("Media element emitted OnStreamNotFound")
    playerPlugin.OnStreamNotFound = "SamsungMapleOnStreamNotFound"

    window.SamsungMapleOnAuthenticationFailed = () => _onDeviceError("Media element emitted OnAuthenticationFailed")
    playerPlugin.OnAuthenticationFailed = "SamsungMapleOnAuthenticationFailed"

    window.SamsungMapleOnRenderingComplete = () => _onEndOfMedia()
    playerPlugin.OnRenderingComplete = "SamsungMapleOnRenderingComplete"

    window.SamsungMapleOnBufferingStart = () => _onDeviceBuffering()
    playerPlugin.OnBufferingStart = "SamsungMapleOnBufferingStart"

    window.SamsungMapleOnBufferingComplete = () => _onFinishedBuffering()
    playerPlugin.OnBufferingComplete = "SamsungMapleOnBufferingComplete"

    window.SamsungMapleOnStreamInfoReady = () => _onMetadata()
    playerPlugin.OnStreamInfoReady = "SamsungMapleOnStreamInfoReady"

    window.SamsungMapleOnCurrentPlayTime = (timeInMillis) => _onCurrentTime(timeInMillis)
    playerPlugin.OnCurrentPlayTime = "SamsungMapleOnCurrentPlayTime"

    window.addEventListener("hide", _onWindowHide, false)
    window.addEventListener("unload", _onWindowHide, false)
  }

  function _unregisterEventHandlers() {
    const eventHandlers = [
      "SamsungMapleOnRenderError",
      "SamsungMapleOnRenderingComplete",
      "SamsungMapleOnBufferingStart",
      "SamsungMapleOnBufferingComplete",
      "SamsungMapleOnStreamInfoReady",
      "SamsungMapleOnCurrentPlayTime",
      "SamsungMapleOnConnectionFailed",
      "SamsungMapleOnNetworkDisconnected",
      "SamsungMapleOnStreamNotFound",
      "SamsungMapleOnAuthenticationFailed",
    ]

    for (let i = 0; i < eventHandlers.length; i++) {
      const handler = eventHandlers[i]
      const hook = handler.substring("SamsungMaple".length)

      playerPlugin[hook] = undefined
      delete window[handler]
    }

    window.removeEventListener("hide", _onWindowHide, false)
    window.removeEventListener("unload", _onWindowHide, false)
  }

  function _wipe() {
    _stopPlayer()
    mediaType = undefined
    source = undefined
    mimeType = undefined
    currentTime = undefined
    range = undefined
    deferSeekingTo = null
    tryingToPause = false
    currentTimeKnown = false
    _unregisterEventHandlers()
  }

  function _seekTo(seconds) {
    const offset = seconds - getCurrentTime()
    const success = _isSuccessCode(_jump(offset))

    if (success) {
      currentTime = seconds
    }

    return success
  }

  function _seekToWithFailureStateTransition(seconds) {
    const success = _seekTo(seconds)

    if (!success) {
      toPlaying()
    }
  }

  function _jump(offsetSeconds) {
    if (offsetSeconds > 0) {
      return playerPlugin.JumpForward(offsetSeconds)
    } else {
      return playerPlugin.JumpBackward(Math.abs(offsetSeconds))
    }
  }

  function _isHlsMimeType() {
    const mime = mimeType.toLowerCase()
    return mime === "application/vnd.apple.mpegurl" || mime === "application/x-mpegurl"
  }

  function _wrappedSource() {
    let wrappedSource = source

    if (_isHlsMimeType()) {
      wrappedSource += "|COMPONENT=HLS"
    }

    return wrappedSource
  }

  function _reportError(errorMessage) {
    DebugTool.info(errorMessage)
    _emitEvent(MediaPlayerBase.EVENT.ERROR, { errorMessage: errorMessage })
  }

  function _setDisplayFullScreenForVideo() {
    if (mediaType === MediaPlayerBase.TYPE.VIDEO) {
      const dimensions = _getScreenSize()
      playerPlugin.SetDisplayArea(0, 0, dimensions.width, dimensions.height)
    }
  }

  function _getScreenSize() {
    let w, h

    if (typeof window.innerWidth === "number") {
      w = window.innerWidth
      h = window.innerHeight
    } else {
      const d = document.documentElement || document.body

      h = d.clientHeight || d.offsetHeight
      w = d.clientWidth || d.offsetWidth
    }

    return {
      width: w,
      height: h,
    }
  }

  function _isSuccessCode(code) {
    const samsung2010ErrorCode = -1
    return code && code !== samsung2010ErrorCode
  }

  /**
   * @constant {Number} Time (in seconds) compared to current time within which seeking has no effect.
   * On a sample device (Samsung FoxP 2013), seeking by two seconds worked 90% of the time, but seeking
   * by 2.5 seconds was always seen to work.
   */
  const CURRENT_TIME_TOLERANCE = 2.5

  function _isNearToCurrentTime(seconds) {
    const currentTime = getCurrentTime()
    const targetTime = getClampedTime(seconds)

    return Math.abs(currentTime - targetTime) <= CURRENT_TIME_TOLERANCE
  }

  function getClampedTime(seconds) {
    const range = getSeekableRange()
    const CLAMP_OFFSET_FROM_END_OF_RANGE = 1.1
    const nearToEnd = Math.max(range.end - CLAMP_OFFSET_FROM_END_OF_RANGE, range.start)

    if (seconds < range.start) {
      return range.start
    } else if (seconds > nearToEnd) {
      return nearToEnd
    } else {
      return seconds
    }
  }

  function _emitEvent(eventType, eventLabels) {
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

    for (let index = 0; index < eventCallbacks.length; index++) {
      eventCallbacks[index](event)
    }
  }

  return {
    addEventCallback: (thisArg, newCallback) => {
      eventCallback = (event) => {
        newCallback.call(thisArg, event)
      }

      eventCallbacks.push(eventCallback)
    },

    removeEventCallback: (callback) => {
      const index = eventCallbacks.indexOf(callback)

      if (index !== -1) {
        eventCallbacks.splice(index, 1)
      }
    },

    removeAllEventCallbacks: () => {
      eventCallbacks = []
    },
    initialiseMedia: initialiseMedia,
    playFrom: playFrom,
    beginPlayback: beginPlayback,
    beginPlaybackFrom: beginPlaybackFrom,
    resume: resume,
    pause: pause,
    stop: stop,
    reset: reset,
    getSeekableRange: getSeekableRange,
    getState: getState,
    getPlayerElement: getPlayerElement,
    getSource: getSource,
    getMimeType: getMimeType,
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    toPaused: toPaused,
    toPlaying: toPlaying,
  }
}

export default SamsungMaple
