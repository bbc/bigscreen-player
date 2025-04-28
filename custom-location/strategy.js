
// A copy of basic strategy with no imports from the codebase - Useful for an external example.
function CustomStrategy(mediaSources, mediaKind, playbackElement) {
    const CLAMP_OFFSET_SECONDS = 1.1
    const manifestType = mediaSources.time().manifestType
  
    let eventCallbacks = []
    let errorCallback
    let timeUpdateCallback
  
    let mediaElement
    let metaDataLoaded
  
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
      if (mediaElement == null) {
        setUpMediaElement(startTime)
        setUpMediaListeners()
  
        return
      }
  
      mediaElement.src = mediaSources.currentSource()
      setStartTime(startTime)
      mediaElement.load()
    }
  
    function setUpMediaElement(startTime) {
      mediaElement = mediaKind === 'audio' ? document.createElement("audio") : document.createElement("video")
  
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
  
    function setStartTime(presentationTimeInSeconds) {
      if (presentationTimeInSeconds || presentationTimeInSeconds === 0) {
        // currentTime = 0 is interpreted as play from live point by many devices
        const startTimeInSeconds =
          manifestType === 'dynamic' && presentationTimeInSeconds === 0 ? 0.1 : presentationTimeInSeconds
  
        mediaElement.currentTime = startTimeInSeconds
      }
    }
  
    function onPlaying() {
      publishMediaState(2)
    }
  
    function onPaused() {
      publishMediaState(1)
    }
  
    function onSeeking() {
      publishMediaState(4)
    }
  
    function onWaiting() {
      publishMediaState(4)
    }
  
    function onSeeked() {
      if (isPaused()) {
        publishMediaState(1)
      } else {
        publishMediaState(2)
      }
    }
  
    function onEnded() {
      publishMediaState(5)
    }
  
    function onTimeUpdate() {
      publishTimeUpdate()
    }
  
    function onError(_event) {
      const mediaError = {
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
          start: mediaElement.seekable.start(0),
          end: mediaElement.seekable.end(0),
        }
      }
      return {
        start: 0,
        end: 0,
      }
    }
  
    function getDuration() {
      if (mediaElement && metaDataLoaded) {
        return mediaElement.duration
      }
  
      return 0
    }
  
    function getCurrentTime() {
      return mediaElement ? mediaElement.currentTime : 0
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
  
    function play() {
      handlePlayPromise(mediaElement.play())
    }
  
    function setCurrentTime(presentationTimeInSeconds) {
      // Without metadata we cannot clamp to seekableRange
      mediaElement.currentTime = metaDataLoaded
        ? getClampedTime(presentationTimeInSeconds, getSeekableRange())
        : presentationTimeInSeconds
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
        mediaElement.parentNode.remove(mediaElement)
      }
  
      eventCallbacks = []
      errorCallback = undefined
      timeUpdateCallback = undefined
  
      mediaElement = undefined
      metaDataLoaded = undefined
    }
  
    function reset() {}
  
    function isEnded() {
      return mediaElement.ended
    }
  
    function pause() {
      mediaElement.pause()
    }
  
    function getPlayerElement() {
      return mediaElement || undefined
    }
  
    return {
      transitions: {
        canBePaused: () => true,
        canBeginSeek: () => true,
      },
      addEventCallback,
      removeEventCallback,
      addErrorCallback,
      addTimeUpdateCallback,
      load,
      getSeekableRange,
      getCurrentTime,
      getDuration,
      tearDown,
      reset,
      isEnded,
      isPaused,
      pause,
      play,
      setCurrentTime,
      setPlaybackRate,
      getPlaybackRate,
      getPlayerElement,
    }
  }
  
  CustomStrategy.getLiveSupport = () => LiveSupport.SEEKABLE
  
  export default CustomStrategy