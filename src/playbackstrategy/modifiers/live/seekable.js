import MediaPlayerBase from "../mediaplayerbase"
import DynamicWindowUtils from "../../../dynamicwindowutils"
import SlidingChecker from "../../../manifest/slidingchecker"

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

    pause: function pause(opts) {
      const secondsUntilStartOfWindow = mediaPlayer.getCurrentTime() - mediaPlayer.getSeekableRange().start
      const _opts = opts || {}

      if (_opts.disableAutoResume) {
        mediaPlayer.pause()
      } else if (secondsUntilStartOfWindow <= AUTO_RESUME_WINDOW_START_CUSHION_SECONDS) {
        mediaPlayer.toPaused()
        mediaPlayer.toPlaying()
      } else {
        mediaPlayer.pause()

        SlidingChecker.isSliding(mediaSources.currentSource(), mediaSources.time())
          .then((isSliding) => {
            if (isSliding) {
              DynamicWindowUtils.autoResumeAtStartOfRange(
                mediaPlayer.getCurrentTime(),
                mediaPlayer.getSeekableRange(),
                addEventCallback,
                removeEventCallback,
                MediaPlayerBase.unpausedEventCheck,
                resume
              )
            }
          })
          .catch(() => {
            // do nothing, so don't set auto resume if unable to obtain sliding window information
          })
      }
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
