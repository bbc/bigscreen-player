import MediaState from "../models/mediastate"
import WindowTypes from "../models/windowtypes"
import MediaKinds from "../models/mediakinds"
import LiveSupport from "../models/livesupport"
import DynamicWindowUtils from "../dynamicwindowutils"
import DOMHelpers from "../domhelpers"
import handlePlayPromise from "../utils/handleplaypromise"

function BasicStrategy(mediaSources, windowType, mediaKind, playbackElement, isUHD, device) {
  const CLAMP_OFFSET_SECONDS = 1.1

  let eventCallbacks = []
  let errorCallback
  let timeUpdateCallback

  let mediaElement
  let metaDataLoaded
  let timeCorrection = (mediaSources.time() && mediaSources.time().correction) || 0

  function publishMediaState(mediaState) {
    for (let index = 0; index < eventCallbacks.length; index++) {
      eventCallbacks[index](mediaState)
    }
  }

  function publishTimeUpdate() {
    if (timeUpdateCallback) {
      timeUpdateCallback()
    }
  }

  function publishError(mediaError) {
    if (errorCallback) {
      errorCallback(mediaError)
    }
  }

  function load(_mimeType, startTime) {
    if (!mediaElement) {
      setUpMediaElement(startTime)
      setUpMediaListeners()
    } else {
      mediaElement.src = mediaSources.currentSource()
      setStartTime(startTime)
      mediaElement.load()
    }
  }

  function setUpMediaElement(startTime) {
    if (mediaKind === MediaKinds.AUDIO) {
      mediaElement = document.createElement("audio")
    } else {
      mediaElement = document.createElement("video")
    }

    mediaElement.style.position = "absolute"
    mediaElement.style.width = "100%"
    mediaElement.style.height = "100%"
    mediaElement.autoplay = true
    mediaElement.preload = "auto"
    mediaElement.src = mediaSources.currentSource()

    playbackElement.insertBefore(mediaElement, playbackElement.firstChild)

    setStartTime(startTime)
    mediaElement.load()
  }

  function setUpMediaListeners() {
    mediaElement.addEventListener("timeupdate", onTimeUpdate)
    mediaElement.addEventListener("playing", onPlaying)
    mediaElement.addEventListener("pause", onPaused)
    mediaElement.addEventListener("waiting", onWaiting)
    mediaElement.addEventListener("seeking", onSeeking)
    mediaElement.addEventListener("seeked", onSeeked)
    mediaElement.addEventListener("ended", onEnded)
    mediaElement.addEventListener("error", onError)
    mediaElement.addEventListener("loadedmetadata", onLoadedMetadata)
  }

  function setStartTime(startTime) {
    if (startTime) {
      mediaElement.currentTime = startTime + timeCorrection
    }
  }

  function onPlaying() {
    publishMediaState(MediaState.PLAYING)
  }

  function onPaused() {
    publishMediaState(MediaState.PAUSED)
  }

  function onSeeking() {
    publishMediaState(MediaState.WAITING)
  }

  function onWaiting() {
    publishMediaState(MediaState.WAITING)
  }

  function onSeeked() {
    if (isPaused()) {
      if (windowType === WindowTypes.SLIDING) {
        startAutoResumeTimeout()
      }

      publishMediaState(MediaState.PAUSED)
    } else {
      publishMediaState(MediaState.PLAYING)
    }
  }

  function onEnded() {
    publishMediaState(MediaState.ENDED)
  }

  function onTimeUpdate() {
    publishTimeUpdate()
  }

  function onError(_event) {
    let mediaError = {
      code: (mediaElement && mediaElement.error && mediaElement.error.code) || 0,
      message: (mediaElement && mediaElement.error && mediaElement.error.message) || "unknown",
    }
    publishError(mediaError)
  }

  function onLoadedMetadata() {
    metaDataLoaded = true
  }

  function isPaused() {
    return mediaElement.paused
  }

  function getSeekableRange() {
    if (mediaElement && mediaElement.seekable && mediaElement.seekable.length > 0 && metaDataLoaded) {
      return {
        start: mediaElement.seekable.start(0) - timeCorrection,
        end: mediaElement.seekable.end(0) - timeCorrection,
      }
    } else {
      return {
        start: 0,
        end: 0,
      }
    }
  }

  function getDuration() {
    if (mediaElement && metaDataLoaded) {
      return mediaElement.duration
    }

    return 0
  }

  function getCurrentTime() {
    return mediaElement ? mediaElement.currentTime - timeCorrection : 0
  }

  function addEventCallback(thisArg, newCallback) {
    const eventCallback = (event) => newCallback.call(thisArg, event)
    eventCallbacks.push(eventCallback)
  }

  function removeEventCallback(callback) {
    const index = eventCallbacks.indexOf(callback)

    if (index !== -1) {
      eventCallbacks.splice(index, 1)
    }
  }

  function startAutoResumeTimeout() {
    DynamicWindowUtils.autoResumeAtStartOfRange(
      getCurrentTime(),
      getSeekableRange(),
      addEventCallback,
      removeEventCallback,
      (event) => event !== MediaState.PAUSED,
      play
    )
  }

  function play() {
    handlePlayPromise(mediaElement.play())
  }

  function setCurrentTime(time) {
    // Without metadata we cannot clamp to seekableRange
    if (metaDataLoaded) {
      mediaElement.currentTime = getClampedTime(time, getSeekableRange()) + timeCorrection
    } else {
      mediaElement.currentTime = time + timeCorrection
    }
  }

  function setPlaybackRate(rate) {
    mediaElement.playbackRate = rate
  }

  function getPlaybackRate() {
    return mediaElement.playbackRate
  }

  function getClampedTime(time, range) {
    return Math.min(Math.max(time, range.start), range.end - CLAMP_OFFSET_SECONDS)
  }

  function addErrorCallback(thisArg, newErrorCallback) {
    errorCallback = (event) => newErrorCallback.call(thisArg, event)
  }

  function addTimeUpdateCallback(thisArg, newTimeUpdateCallback) {
    timeUpdateCallback = () => newTimeUpdateCallback.call(thisArg)
  }

  function tearDown() {
    if (mediaElement) {
      mediaElement.removeEventListener("timeupdate", onTimeUpdate)
      mediaElement.removeEventListener("playing", onPlaying)
      mediaElement.removeEventListener("pause", onPaused)
      mediaElement.removeEventListener("waiting", onWaiting)
      mediaElement.removeEventListener("seeking", onSeeking)
      mediaElement.removeEventListener("seeked", onSeeked)
      mediaElement.removeEventListener("ended", onEnded)
      mediaElement.removeEventListener("error", onError)
      mediaElement.removeEventListener("loadedmetadata", onLoadedMetadata)
      mediaElement.removeAttribute("src")
      mediaElement.load()
      DOMHelpers.safeRemoveElement(mediaElement)
    }

    eventCallbacks = []
    errorCallback = undefined
    timeUpdateCallback = undefined

    mediaElement = undefined
    metaDataLoaded = undefined
    timeCorrection = undefined
  }

  function reset() {
    return
  }

  function isEnded() {
    return mediaElement.ended
  }

  function pause(opts) {
    opts = opts || {}

    mediaElement.pause()
    if (opts.disableAutoResume !== true && windowType === WindowTypes.SLIDING) {
      startAutoResumeTimeout()
    }
  }

  function getPlayerElement() {
    return mediaElement || undefined
  }

  return {
    transitions: {
      canBePaused: () => true,
      canBeginSeek: () => true,
    },
    addEventCallback: addEventCallback,
    removeEventCallback: removeEventCallback,
    addErrorCallback: addErrorCallback,
    addTimeUpdateCallback: addTimeUpdateCallback,
    load: load,
    getSeekableRange: getSeekableRange,
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    tearDown: tearDown,
    reset: reset,
    isEnded: isEnded,
    isPaused: isPaused,
    pause: pause,
    play: play,
    setCurrentTime: setCurrentTime,
    setPlaybackRate: setPlaybackRate,
    getPlaybackRate: getPlaybackRate,
    getPlayerElement: getPlayerElement,
  }
}

BasicStrategy.getLiveSupport = () => LiveSupport.SEEKABLE

export default BasicStrategy
