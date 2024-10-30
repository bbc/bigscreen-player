import MediaPlayerBase from "../mediaplayerbase"
import DynamicWindowUtils from "../../../dynamicwindowutils"
import TransferFormat from "../../../models/transferformats"

function RestartableLivePlayer(mediaPlayer, mediaSources) {
  const fakeTimer = {}

  let streamStartDateTimeInMilliseconds
  let callbacksMap = []

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

  function isSliding() {
    const { timeShiftBufferDepthInMilliseconds } = mediaSources.time()

    return (
      typeof timeShiftBufferDepthInMilliseconds === "number" &&
      isFinite(timeShiftBufferDepthInMilliseconds) &&
      timeShiftBufferDepthInMilliseconds > 0
    )
  }

  function startAutoResumeTimeOut() {
    switch (mediaSources.transferFormat()) {
      case TransferFormat.DASH:
        DynamicWindowUtils.autoResumeAtStartOfRange(
          mediaPlayer.getCurrentTime(),
          mediaPlayer.getSeekableRange(),
          addEventCallback,
          removeEventCallback,
          MediaPlayerBase.unpausedEventCheck,
          resume
        )
        break

      case TransferFormat.HLS:
        // refresh manifest then auto resume
        mediaSources.refresh(
          () =>
            DynamicWindowUtils.autoResumeAtStartOfRange(
              mediaPlayer.getCurrentTime(),
              mediaPlayer.getSeekableRange(),
              addEventCallback,
              removeEventCallback,
              MediaPlayerBase.unpausedEventCheck,
              resume
            ) // fatal error if we can't load the manifest?
        )
        break
    }
  }

  function pause({ disableAutoResume } = {}) {
    mediaPlayer.pause()

    if (disableAutoResume || !isSliding()) {
      return
    }

    startAutoResumeTimeOut()
  }

  function resume() {
    mediaPlayer.resume()
  }

  function getCurrentTime() {
    return fakeTimer.currentTime
  }

  function getSeekableRange() {
    const timeSinceStreamStartInMilliseconds = Date.now() - streamStartDateTimeInMilliseconds

    const { joinTimeInMilliseconds, availabilityStartTimeInMilliseconds, timeShiftBufferDepthInMilliseconds } =
      mediaSources.time()

    // TODO:
    //   Can we replace joinTimeInMilliseconds (derived from serverDate or the manifest
    //   with passing in the drift between the client and the server?
    // Motivation:
    //   Instead of joinTimeInMilliseconds + curr Date.now - prev Date.now, use
    //   ServerDate.now() which returns Date.now() + drift between client and server
    //
    // ...or should we support both?
    const endInMilliseconds =
      timeSinceStreamStartInMilliseconds + joinTimeInMilliseconds - availabilityStartTimeInMilliseconds

    const startInMilliseconds =
      typeof timeShiftBufferDepthInMilliseconds === "number" && timeShiftBufferDepthInMilliseconds > 0
        ? Math.max(0, endInMilliseconds - timeShiftBufferDepthInMilliseconds)
        : 0

    return {
      start: startInMilliseconds / 1000,
      end: endInMilliseconds / 1000,
    }
  }

  return {
    beginPlayback: () => {
      streamStartDateTimeInMilliseconds = Date.now()

      const { joinTimeInMilliseconds, availabilityStartTimeInMilliseconds } = mediaSources.time()

      // TODO: Same as above – replace joinTime with ServerDate.now()?
      fakeTimer.currentTime = (joinTimeInMilliseconds - availabilityStartTimeInMilliseconds) / 1000

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

    beginPlaybackFrom: (presentationTimeInSeconds) => {
      streamStartDateTimeInMilliseconds = Date.now()

      fakeTimer.currentTime = presentationTimeInSeconds

      mediaPlayer.beginPlaybackFrom(presentationTimeInSeconds)
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
