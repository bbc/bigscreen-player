import MediaPlayerBase from "../mediaplayerbase"
import DynamicWindowUtils from "../../../dynamicwindowutils"
import { TransferFormat } from "../../../main"

function SeekableLivePlayer(mediaPlayer, mediaSources) {
  const AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8

  function addEventCallback(thisArg, callback) {
    mediaPlayer.addEventCallback(thisArg, callback)
  }

  function removeEventCallback(thisArg, callback) {
    mediaPlayer.removeEventCallback(thisArg, callback)
  }

  function removeAllEventCallbacks() {
    mediaPlayer.removeAllEventCallbacks()
  }

  function resume() {
    mediaPlayer.resume()
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

  return {
    initialiseMedia: function initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts) {
      const _mediaType =
        mediaType === MediaPlayerBase.TYPE.AUDIO ? MediaPlayerBase.TYPE.LIVE_AUDIO : MediaPlayerBase.TYPE.LIVE_VIDEO

      mediaPlayer.initialiseMedia(_mediaType, sourceUrl, mimeType, sourceContainer, opts)
    },

    beginPlayback: function beginPlayback() {
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

    beginPlaybackFrom: function beginPlaybackFrom(presentationTimeInSeconds) {
      mediaPlayer.beginPlaybackFrom(presentationTimeInSeconds)
    },

    playFrom: function playFrom(presentationTimeInSeconds) {
      mediaPlayer.playFrom(presentationTimeInSeconds)
    },

    pause: function pause({ disableAutoResume } = {}) {
      if (disableAutoResume || !isSliding()) {
        mediaPlayer.pause()

        return
      }

      const secondsUntilStartOfWindow = mediaPlayer.getCurrentTime() - mediaPlayer.getSeekableRange().start

      if (secondsUntilStartOfWindow <= AUTO_RESUME_WINDOW_START_CUSHION_SECONDS) {
        mediaPlayer.toPaused()
        mediaPlayer.toPlaying()

        return
      }

      mediaPlayer.pause()

      startAutoResumeTimeOut()
    },

    resume,
    stop: () => mediaPlayer.stop(),
    reset: () => mediaPlayer.reset(),
    getState: () => mediaPlayer.getState(),
    getSource: () => mediaPlayer.getSource(),
    getCurrentTime: () => mediaPlayer.getCurrentTime(),
    getSeekableRange: () => mediaPlayer.getSeekableRange(),
    getMimeType: () => mediaPlayer.getMimeType(),
    addEventCallback,
    removeEventCallback,
    removeAllEventCallbacks,
    getPlayerElement: () => mediaPlayer.getPlayerElement(),
    getLiveSupport: () => MediaPlayerBase.LIVE_SUPPORT.SEEKABLE,
  }
}

export default SeekableLivePlayer
