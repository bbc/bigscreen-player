import MediaPlayerBase from '../modifiers/mediaplayerbase'
import DOMHelpers from '../../domhelpers'
import handlePlayPromise from '../../utils/handleplaypromise'
import DebugTool from '../../debugger/debugtool'

function Html5 () {
  const sentinelLimits = {
    pause: {
      maximumAttempts: 2,
      successEvent: MediaPlayerBase.EVENT.SENTINEL_PAUSE,
      failureEvent: MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE,
      currentAttemptCount: 0
    },
    seek: {
      maximumAttempts: 2,
      successEvent: MediaPlayerBase.EVENT.SENTINEL_SEEK,
      failureEvent: MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE,
      currentAttemptCount: 0
    }
  }

  let eventCallback
  let eventCallbacks = []
  let state = MediaPlayerBase.STATE.EMPTY

  let mediaElement
  let sourceElement

  let trustZeroes = false
  let ignoreNextPauseEvent = false
  let nearEndOfMedia
  let readyToPlayFrom

  let mediaType
  let source
  let mimeType

  let postBufferingState
  let targetSeekTime
  let seekFinished

  let count
  let timeoutHappened

  let disableSentinels
  let disableSeekSentinel
  let hasSentinelTimeChangedWithinTolerance
  let enterBufferingSentinelAttemptCount
  let sentinelSeekTime
  let seekSentinelTolerance
  let sentinelInterval
  let sentinelIntervalNumber
  let lastSentinelTime

  let cachedSeekableRange
  let readyToCache = true

  function emitEvent (eventType, eventLabels) {
    const event = {
      type: eventType,
      currentTime: getCurrentTime(),
      seekableRange: getSeekableRange(),
      duration: getDuration(),
      url: getSource(),
      mimeType: getMimeType(),
      state: getState()
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

  function getDuration () {
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

  function getSource () {
    return source
  }

  function getMimeType () {
    return mimeType
  }

  function getState () {
    return state
  }

  function isLiveMedia () {
    return (mediaType === MediaPlayerBase.TYPE.LIVE_VIDEO) || (mediaType === MediaPlayerBase.TYPE.LIVE_AUDIO)
  }

  function setSeekSentinelTolerance () {
    const ON_DEMAND_SEEK_SENTINEL_TOLERANCE = 15
    const LIVE_SEEK_SENTINEL_TOLERANCE = 30

    seekSentinelTolerance = ON_DEMAND_SEEK_SENTINEL_TOLERANCE

    if (isLiveMedia()) {
      seekSentinelTolerance = LIVE_SEEK_SENTINEL_TOLERANCE
    }
  }

  function generateSourceElement (url, mimeType) {
    const sourceElement = document.createElement('source')

    sourceElement.src = url
    sourceElement.type = mimeType
    return sourceElement
  }

  function appendChildElement (to, el) {
    to.appendChild(el)
  }

  function prependChildElement (to, el) {
    if (to.childNodes.length > 0) {
      to.insertBefore(el, to.childNodes[0])
    } else {
      to.appendChild(el)
    }
  }

  function toStopped () {
    state = MediaPlayerBase.STATE.STOPPED
    emitEvent(MediaPlayerBase.EVENT.STOPPED)
    setSentinels([])
  }

  function enterBufferingSentinel () {
    let sentinelShouldFire = !hasSentinelTimeChangedWithinTolerance && !nearEndOfMedia

    if (getCurrentTime() === 0) {
      sentinelShouldFire = trustZeroes && sentinelShouldFire
    }

    if (enterBufferingSentinelAttemptCount === undefined) {
      enterBufferingSentinelAttemptCount = 0
    }

    if (sentinelShouldFire) {
      enterBufferingSentinelAttemptCount++
    } else {
      enterBufferingSentinelAttemptCount = 0
    }

    if (enterBufferingSentinelAttemptCount === 1) {
      sentinelShouldFire = false
    }

    if (sentinelShouldFire) {
      emitEvent(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
      toBuffering()
      /* Resetting the sentinel attempt count to zero means that the sentinel will only fire once
       even if multiple iterations result in the same conditions.
       This should not be needed as the second iteration, when the enter buffering sentinel is fired
       will cause the media player to go into the buffering state. The enter buffering sentinel is not fired
       when in buffering state
       */
      enterBufferingSentinelAttemptCount = 0
      return true
    }

    return false
  }

  function exitBufferingSentinel () {
    function fireExitBufferingSentinel () {
      emitEvent(MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING)
      exitBuffering()
      return true
    }

    if (readyToPlayFrom && mediaElement.paused) {
      return fireExitBufferingSentinel()
    }

    if (hasSentinelTimeChangedWithinTolerance) {
      return fireExitBufferingSentinel()
    }

    return false
  }

  function shouldBeSeekedSentinel () {
    if (sentinelSeekTime === undefined || disableSeekSentinel) {
      return false
    }

    const currentTime = getCurrentTime()
    let sentinelActionTaken = false

    if (Math.abs(currentTime - sentinelSeekTime) > seekSentinelTolerance) {
      sentinelActionTaken = nextSentinelAttempt(sentinelLimits.seek, () => {
        mediaElement.currentTime = sentinelSeekTime
      })
    } else if (sentinelIntervalNumber < 3) {
      sentinelSeekTime = currentTime
    } else {
      sentinelSeekTime = undefined
    }

    return sentinelActionTaken
  }

  function shouldBePausedSentinel () {
    let sentinelActionTaken = false

    if (hasSentinelTimeChangedWithinTolerance) {
      sentinelActionTaken = nextSentinelAttempt(sentinelLimits.pause, () => {
        pauseMediaElement()
      })
    }

    return sentinelActionTaken
  }

  function nextSentinelAttempt (sentinelInfo, attemptFn) {
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

  function endOfMediaSentinel () {
    if (!hasSentinelTimeChangedWithinTolerance && nearEndOfMedia) {
      emitEvent(MediaPlayerBase.EVENT.SENTINEL_COMPLETE)
      onEndOfMedia()
      return true
    }
    return false
  }

  function clearSentinels () {
    clearInterval(sentinelInterval)
  }

  function setSentinels (sentinels) {
    if (disableSentinels) { return }

    clearSentinels()
    sentinelIntervalNumber = 0
    lastSentinelTime = getCurrentTime()
    sentinelInterval = setInterval(() => {
      sentinelIntervalNumber += 1
      const newTime = getCurrentTime()

      hasSentinelTimeChangedWithinTolerance = (Math.abs(newTime - lastSentinelTime) > 0.2)
      nearEndOfMedia = (getDuration() - (newTime || lastSentinelTime)) <= 1
      lastSentinelTime = newTime

      for (let i = 0; i < sentinels.length; i++) {
        const sentinelActivated = sentinels[i].call()

        if (getCurrentTime() > 0) {
          trustZeroes = false
        }

        if (sentinelActivated) {
          break
        }
      }
    }, 1100)
  }

  function reportError (_errorMessage) {
    emitEvent(MediaPlayerBase.EVENT.ERROR)
  }

  function toBuffering () {
    state = MediaPlayerBase.STATE.BUFFERING
    emitEvent(MediaPlayerBase.EVENT.BUFFERING)
    setSentinels([exitBufferingSentinel])
  }

  function toComplete () {
    state = MediaPlayerBase.STATE.COMPLETE
    emitEvent(MediaPlayerBase.EVENT.COMPLETE)
    setSentinels([])
  }

  function toEmpty () {
    wipe()
    state = MediaPlayerBase.STATE.EMPTY
  }

  function toError (errorMessage) {
    wipe()
    state = MediaPlayerBase.STATE.ERROR
    reportError(errorMessage)
  }

  function isReadyToPlayFrom () {
    if (readyToPlayFrom !== undefined) {
      return readyToPlayFrom
    }
    return false
  }

  function getMediaDuration () {
    if (mediaElement && isReadyToPlayFrom()) {
      return mediaElement.duration
    }

    return undefined
  }

  function getCachedSeekableRange () {
    if (readyToCache) {
      cacheSeekableRange()
    }

    return cachedSeekableRange
  }

  function cacheSeekableRange () {
    DebugTool.info('cacheSeekableRange')
    readyToCache = false
    setTimeout(function () {
      readyToCache = true
    }, 1100)

    cachedSeekableRange = {
      start: mediaElement.seekable.start(0),
      end: mediaElement.seekable.end(0)
    }
  }

  function getSeekableRange () {
    if (mediaElement) {
      if (isReadyToPlayFrom() && mediaElement.seekable && mediaElement.seekable.length > 0) {
        if (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.cacheSeekableRange) {
          return getCachedSeekableRange()
        } else {
          return {
            start: mediaElement.seekable.start(0),
            end: mediaElement.seekable.end(0)
          }
        }
      } else if (mediaElement.duration !== undefined) {
        return {
          start: 0,
          end: mediaElement.duration
        }
      }
    }
    return undefined
  }

  function onFinishedBuffering () {
    exitBuffering()
  }

  function pauseMediaElement () {
    mediaElement.pause()
    ignoreNextPauseEvent = true
  }

  function onPause () {
    if (ignoreNextPauseEvent) {
      ignoreNextPauseEvent = false
      return
    }

    if (getState() !== MediaPlayerBase.STATE.PAUSED) {
      toPaused()
    }
  }

  function onError () {
    reportError('Media element error code: ' + mediaElement.error.code)
  }

  function onSourceError () {
    reportError('Media source element error')
  }

  function onDeviceBuffering () {
    if (getState() === MediaPlayerBase.STATE.PLAYING) {
      toBuffering()
    }
  }

  function onEndOfMedia () {
    toComplete()
  }

  function emitSeekAttempted () {
    if (getState() === MediaPlayerBase.STATE.EMPTY) {
      emitEvent(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)
      seekFinished = false
    }

    count = 0
    timeoutHappened = false
    if (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.restartTimeout) {
      setTimeout(() => { timeoutHappened = true }, window.bigscreenPlayer.overrides.restartTimeout)
    } else {
      timeoutHappened = true
    }
  }

  function emitSeekFinishedAtCorrectStartingPoint () {
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

  function onStatus () {
    if (getState() === MediaPlayerBase.STATE.PLAYING) {
      emitEvent(MediaPlayerBase.EVENT.STATUS)
    }

    emitSeekFinishedAtCorrectStartingPoint()
  }

  function onMetadata () {
    metadataLoaded()
  }

  function exitBuffering () {
    metadataLoaded()

    if (getState() !== MediaPlayerBase.STATE.BUFFERING) {
      return
    } else if (postBufferingState === MediaPlayerBase.STATE.PAUSED) {
      toPaused()
    } else {
      toPlaying()
    }
  }

  function metadataLoaded () {
    readyToPlayFrom = true

    if (waitingToPlayFrom()) {
      deferredPlayFrom()
    }
  }

  function playFromIfReady () {
    if (isReadyToPlayFrom()) {
      if (waitingToPlayFrom()) {
        deferredPlayFrom()
      }
    }
  }

  function waitingToPlayFrom () {
    return targetSeekTime !== undefined
  }

  function deferredPlayFrom () {
    if (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.deferredPlayback) {
      handlePlayPromise(mediaElement.play())
      seekTo(targetSeekTime)
    } else {
      seekTo(targetSeekTime)
      handlePlayPromise(mediaElement.play())
    }

    if (postBufferingState === MediaPlayerBase.STATE.PAUSED) {
      pauseMediaElement()
    }
    targetSeekTime = undefined
  }

  function seekTo (seconds) {
    const clampedTime = getClampedTimeForPlayFrom(seconds)

    mediaElement.currentTime = clampedTime
    sentinelSeekTime = clampedTime
  }

  function getCurrentTime () {
    switch (getState()) {
      case MediaPlayerBase.STATE.STOPPED:
      case MediaPlayerBase.STATE.ERROR:
        return
      default:
        if (mediaElement) {
          return mediaElement.currentTime
        }
    }
  }

  /**
    * Time (in seconds) compared to current time within which seeking has no effect.
    * @constant {Number}
  */
  const CURRENT_TIME_TOLERANCE = 1

  /**
    * Check whether a time value is near to the current media play time.
    * @param {Number} seconds The time value to test, in seconds from the start of the media
    * @protected
  */
  function isNearToCurrentTime (seconds) {
    const currentTime = getCurrentTime()
    const targetTime = getClampedTime(seconds)

    return Math.abs(currentTime - targetTime) <= CURRENT_TIME_TOLERANCE
  }

  /**
    * Clamp a time value so it does not exceed the current range.
    * Clamps to near the end instead of the end itself to allow for devices that cannot seek to the very end of the media.
    * @param {Number} seconds The time value to clamp in seconds from the start of the media
    * @protected
  */
  function getClampedTime (seconds) {
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

  function getClampedTimeForPlayFrom (seconds) {
    return getClampedTime(seconds)
  }

  function wipe () {
    mediaType = undefined
    source = undefined
    mimeType = undefined
    targetSeekTime = undefined
    sentinelSeekTime = undefined

    clearSentinels()
    destroyMediaElement()

    readyToPlayFrom = false
  }

  function destroyMediaElement () {
    if (mediaElement) {
      mediaElement.removeEventListener('canplay', onFinishedBuffering, false)
      mediaElement.removeEventListener('seeked', onFinishedBuffering, false)
      mediaElement.removeEventListener('playing', onFinishedBuffering, false)
      mediaElement.removeEventListener('error', onError, false)
      mediaElement.removeEventListener('ended', onEndOfMedia, false)
      mediaElement.removeEventListener('waiting', onDeviceBuffering, false)
      mediaElement.removeEventListener('timeupdate', onStatus, false)
      mediaElement.removeEventListener('loadedmetadata', onMetadata, false)
      mediaElement.removeEventListener('pause', onPause, false)
      sourceElement.removeEventListener('error', onSourceError, false)

      DOMHelpers.safeRemoveElement(sourceElement)
      unloadMediaSrc()
      DOMHelpers.safeRemoveElement(mediaElement)

      mediaElement = null
      sourceElement = null
    }
  }

  function unloadMediaSrc () {
    if (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.disableMediaSourceUnload) {
      return
    }
    // Reset source as advised by HTML5 video spec, section 4.8.10.15:
    // http://www.w3.org/TR/2011/WD-html5-20110405/video.html#best-practices-for-authors-using-media-elements
    mediaElement.removeAttribute('src')
    mediaElement.load()
  }

  function toPaused () {
    state = MediaPlayerBase.STATE.PAUSED
    emitEvent(MediaPlayerBase.EVENT.PAUSED)
    setSentinels([shouldBeSeekedSentinel, shouldBePausedSentinel])
  }

  function toPlaying () {
    state = MediaPlayerBase.STATE.PLAYING
    emitEvent(MediaPlayerBase.EVENT.PLAYING)
    setSentinels([endOfMediaSentinel, shouldBeSeekedSentinel, enterBufferingSentinel])
  }

  return {
    addEventCallback: (thisArg, newCallback) => {
      eventCallback = (event) => newCallback.call(thisArg, event)
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

    initialiseMedia: (type, url, mediaMimeType, sourceContainer, opts) => {
      opts = opts || { }
      disableSentinels = opts.disableSentinels
      disableSeekSentinel = opts.disableSeekSentinel
      mediaType = type
      source = url
      mimeType = mediaMimeType

      emitSeekAttempted()

      if (getState() === MediaPlayerBase.STATE.EMPTY) {
        let idSuffix = 'Video'

        if (mediaType === MediaPlayerBase.TYPE.AUDIO || mediaType === MediaPlayerBase.TYPE.LIVE_AUDIO) {
          idSuffix = 'Audio'
        }

        setSeekSentinelTolerance()

        mediaElement = document.createElement(idSuffix.toLowerCase(), 'mediaPlayer' + idSuffix)
        mediaElement.autoplay = false
        mediaElement.style.position = 'absolute'
        mediaElement.style.top = '0px'
        mediaElement.style.left = '0px'
        mediaElement.style.width = '100%'
        mediaElement.style.height = '100%'

        mediaElement.addEventListener('canplay', onFinishedBuffering, false)
        mediaElement.addEventListener('seeked', onFinishedBuffering, false)
        mediaElement.addEventListener('playing', onFinishedBuffering, false)
        mediaElement.addEventListener('error', onError, false)
        mediaElement.addEventListener('ended', onEndOfMedia, false)
        mediaElement.addEventListener('waiting', onDeviceBuffering, false)
        mediaElement.addEventListener('timeupdate', onStatus, false)
        mediaElement.addEventListener('loadedmetadata', onMetadata, false)
        mediaElement.addEventListener('pause', onPause, false)

        prependChildElement(sourceContainer, mediaElement)

        sourceElement = generateSourceElement(url, mimeType)
        sourceElement.addEventListener('error', onSourceError, false)

        mediaElement.preload = 'auto'
        appendChildElement(mediaElement, sourceElement)

        mediaElement.load()

        toStopped()
      } else {
        toError('Cannot set source unless in the \'' + MediaPlayerBase.STATE.EMPTY + '\' state')
      }
    },

    setPlaybackRate: (rate) => {
      mediaElement.playbackRate = rate
    },

    getPlaybackRate: () => mediaElement.playbackRate,

    playFrom: (seconds) => {
      postBufferingState = MediaPlayerBase.STATE.PLAYING
      targetSeekTime = seconds
      sentinelLimits.seek.currentAttemptCount = 0

      switch (getState()) {
        case MediaPlayerBase.STATE.PAUSED:
        case MediaPlayerBase.STATE.COMPLETE:
          trustZeroes = true
          toBuffering()
          playFromIfReady()
          break

        case MediaPlayerBase.STATE.BUFFERING:
          playFromIfReady()
          break

        case MediaPlayerBase.STATE.PLAYING:
          trustZeroes = true
          toBuffering()
          targetSeekTime = getClampedTimeForPlayFrom(seconds)
          if (isNearToCurrentTime(targetSeekTime)) {
            targetSeekTime = undefined
            toPlaying()
          } else {
            playFromIfReady()
          }
          break

        default:
          toError('Cannot playFrom while in the \'' + getState() + '\' state')
          break
      }
    },

    beginPlayback: () => {
      postBufferingState = MediaPlayerBase.STATE.PLAYING
      sentinelSeekTime = undefined

      switch (getState()) {
        case MediaPlayerBase.STATE.STOPPED:
          trustZeroes = true
          toBuffering()
          handlePlayPromise(mediaElement.play())
          break

        default:
          toError('Cannot beginPlayback while in the \'' + getState() + '\' state')
          break
      }
    },

    beginPlaybackFrom: (seconds) => {
      postBufferingState = MediaPlayerBase.STATE.PLAYING
      targetSeekTime = seconds
      sentinelLimits.seek.currentAttemptCount = 0

      switch (getState()) {
        case MediaPlayerBase.STATE.STOPPED:
          trustZeroes = true
          toBuffering()
          playFromIfReady()
          break

        default:
          toError('Cannot beginPlaybackFrom while in the \'' + getState() + '\' state')
          break
      }
    },

    pause: () => {
      postBufferingState = MediaPlayerBase.STATE.PAUSED
      switch (getState()) {
        case MediaPlayerBase.STATE.PAUSED:
          break

        case MediaPlayerBase.STATE.BUFFERING:
          sentinelLimits.pause.currentAttemptCount = 0
          if (isReadyToPlayFrom()) {
            // If we are not ready to playFrom, then calling pause would seek to the start of media, which we might not want.
            pauseMediaElement()
          }
          break

        case MediaPlayerBase.STATE.PLAYING:
          sentinelLimits.pause.currentAttemptCount = 0
          pauseMediaElement()
          toPaused()
          break

        default:
          toError('Cannot pause while in the \'' + getState() + '\' state')
          break
      }
    },

    resume: () => {
      postBufferingState = MediaPlayerBase.STATE.PLAYING
      switch (getState()) {
        case MediaPlayerBase.STATE.PLAYING:
          break

        case MediaPlayerBase.STATE.BUFFERING:
          if (isReadyToPlayFrom()) {
            // If we are not ready to playFrom, then calling play would seek to the start of media, which we might not want.
            handlePlayPromise(mediaElement.play())
          }
          break

        case MediaPlayerBase.STATE.PAUSED:
          handlePlayPromise(mediaElement.play())
          toPlaying()
          break

        default:
          toError('Cannot resume while in the \'' + getState() + '\' state')
          break
      }
    },

    stop: () => {
      switch (getState()) {
        case MediaPlayerBase.STATE.STOPPED:
          break

        case MediaPlayerBase.STATE.BUFFERING:
        case MediaPlayerBase.STATE.PLAYING:
        case MediaPlayerBase.STATE.PAUSED:
        case MediaPlayerBase.STATE.COMPLETE:
          pauseMediaElement()
          toStopped()
          break

        default:
          toError('Cannot stop while in the \'' + getState() + '\' state')
          break
      }
    },

    reset: () => {
      switch (getState()) {
        case MediaPlayerBase.STATE.EMPTY:
          break

        case MediaPlayerBase.STATE.STOPPED:
        case MediaPlayerBase.STATE.ERROR:
          toEmpty()
          break

        default:
          toError('Cannot reset while in the \'' + getState() + '\' state')
          break
      }
    },

    getSeekableRange: () => {
      switch (getState()) {
        case MediaPlayerBase.STATE.STOPPED:
        case MediaPlayerBase.STATE.ERROR:
          break

        default:
          return getSeekableRange()
      }
      return undefined
    },

    getState: () => state,
    getPlayerElement: () => mediaElement,
    getSource: getSource,
    getMimeType: getMimeType,
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    toPaused: toPaused,
    toPlaying: toPlaying
  }
}

export default Html5
