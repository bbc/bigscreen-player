import MediaPlayerBase from "../mediaplayerbase"
import WindowTypes from "../../../models/windowtypes"
import DynamicWindowUtils from "../../../dynamicwindowutils"

function SeekableLivePlayer(mediaPlayer, windowType) {
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

  return {
    initialiseMedia: function initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts) {
      if (mediaType === MediaPlayerBase.TYPE.AUDIO) {
        mediaType = MediaPlayerBase.TYPE.LIVE_AUDIO
      } else {
        mediaType = MediaPlayerBase.TYPE.LIVE_VIDEO
      }

      mediaPlayer.initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts)
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

    beginPlaybackFrom: function beginPlaybackFrom(offset) {
      mediaPlayer.beginPlaybackFrom(offset)
    },

    playFrom: function playFrom(offset) {
      mediaPlayer.playFrom(offset)
    },

    pause: function pause(opts) {
      const secondsUntilStartOfWindow = mediaPlayer.getCurrentTime() - mediaPlayer.getSeekableRange().start
      opts = opts || {}

      if (opts.disableAutoResume) {
        mediaPlayer.pause()
      } else if (secondsUntilStartOfWindow <= AUTO_RESUME_WINDOW_START_CUSHION_SECONDS) {
        mediaPlayer.toPaused()
        mediaPlayer.toPlaying()
      } else {
        mediaPlayer.pause()
        if (windowType === WindowTypes.SLIDING) {
          DynamicWindowUtils.autoResumeAtStartOfRange(
            mediaPlayer.getCurrentTime(),
            mediaPlayer.getSeekableRange(),
            addEventCallback,
            removeEventCallback,
            MediaPlayerBase.unpausedEventCheck,
            resume
          )
        }
      }
    },

    resume: resume,
    stop: () => mediaPlayer.stop(),
    reset: () => mediaPlayer.reset(),
    getState: () => mediaPlayer.getState(),
    getSource: () => mediaPlayer.getSource(),
    getCurrentTime: () => mediaPlayer.getCurrentTime(),
    getSeekableRange: () => mediaPlayer.getSeekableRange(),
    getMimeType: () => mediaPlayer.getMimeType(),
    addEventCallback: addEventCallback,
    removeEventCallback: removeEventCallback,
    removeAllEventCallbacks: removeAllEventCallbacks,
    getPlayerElement: () => mediaPlayer.getPlayerElement(),
    getLiveSupport: () => MediaPlayerBase.LIVE_SUPPORT.SEEKABLE,
  }
}

export default SeekableLivePlayer
