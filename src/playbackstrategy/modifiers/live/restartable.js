import MediaPlayerBase from "../mediaplayerbase"
import WindowTypes from "../../../models/windowtypes"
import DynamicWindowUtils from "../../../dynamicwindowutils"

function RestartableLivePlayer(mediaPlayer, windowType, mediaSources) {
  const fakeTimer = {}
  const timeCorrection = mediaSources.time()?.timeCorrectionSeconds || 0

  let callbacksMap = []
  let startTime

  addEventCallback(this, updateFakeTimer)

  function updateFakeTimer(event) {
    if (fakeTimer.wasPlaying && fakeTimer.runningTime) {
      fakeTimer.currentTime += (Date.now() - fakeTimer.runningTime) / 1000
    }

    fakeTimer.runningTime = Date.now()
    fakeTimer.wasPlaying = event.state === MediaPlayerBase.STATE.PLAYING
  }

  function addEventCallback(thisArg, callback) {
    function newCallback(event) {
      event.currentTime = getCurrentTime()
      event.seekableRange = getSeekableRange()
      callback(event)
    }

    callbacksMap.push({ from: callback, to: newCallback })
    mediaPlayer.addEventCallback(thisArg, newCallback)
  }

  function removeEventCallback(thisArg, callback) {
    const filteredCallbacks = callbacksMap.filter((cb) => cb.from === callback)

    if (filteredCallbacks.length > 0) {
      callbacksMap = callbacksMap.splice(callbacksMap.indexOf(filteredCallbacks[0]))

      mediaPlayer.removeEventCallback(thisArg, filteredCallbacks[0].to)
    }
  }

  function removeAllEventCallbacks() {
    mediaPlayer.removeAllEventCallbacks()
  }

  function pause(opts = {}) {
    mediaPlayer.pause()

    if (opts.disableAutoResume !== true && windowType === WindowTypes.SLIDING) {
      DynamicWindowUtils.autoResumeAtStartOfRange(
        getCurrentTime(),
        getSeekableRange(),
        addEventCallback,
        removeEventCallback,
        MediaPlayerBase.unpausedEventCheck,
        resume
      )
    }
  }

  function resume() {
    mediaPlayer.resume()
  }

  function getCurrentTime() {
    return fakeTimer.currentTime + timeCorrection
  }

  function getSeekableRange() {
    const windowLength = (mediaSources.time().windowEndTime - mediaSources.time().windowStartTime) / 1000
    const delta = (Date.now() - startTime) / 1000

    return {
      start: (windowType === WindowTypes.SLIDING ? delta : 0) + timeCorrection,
      end: windowLength + delta + timeCorrection,
    }
  }

  return {
    beginPlayback: () => {
      startTime = Date.now()
      fakeTimer.currentTime = (mediaSources.time().windowEndTime - mediaSources.time().windowStartTime) / 1000

      if (
        window.bigscreenPlayer &&
        window.bigscreenPlayer.overrides &&
        window.bigscreenPlayer.overrides.forceBeginPlaybackToEndOfWindow
      ) {
        mediaPlayer.beginPlaybackFrom(Infinity)
      } else {
        mediaPlayer.beginPlayback()
      }
    },

    beginPlaybackFrom: (offset) => {
      startTime = Date.now()
      fakeTimer.currentTime = offset
      mediaPlayer.beginPlaybackFrom(offset)
    },

    initialiseMedia: (mediaType, sourceUrl, mimeType, sourceContainer, opts) => {
      const mediaSubType =
        mediaType === MediaPlayerBase.TYPE.AUDIO ? MediaPlayerBase.TYPE.LIVE_AUDIO : MediaPlayerBase.TYPE.LIVE_VIDEO

      mediaPlayer.initialiseMedia(mediaSubType, sourceUrl, mimeType, sourceContainer, opts)
    },

    pause,
    resume,
    stop: () => mediaPlayer.stop(),
    reset: () => mediaPlayer.reset(),
    getState: () => mediaPlayer.getState(),
    getSource: () => mediaPlayer.getSource(),
    getMimeType: () => mediaPlayer.getMimeType(),
    addEventCallback,
    removeEventCallback,
    removeAllEventCallbacks,
    getPlayerElement: () => mediaPlayer.getPlayerElement(),
    getCurrentTime,
    getSeekableRange,
  }
}

export default RestartableLivePlayer
