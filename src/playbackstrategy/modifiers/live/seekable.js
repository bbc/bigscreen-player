import MediaPlayerBase from "../mediaplayerbase"
import DynamicWindowUtils from "../../../dynamicwindowutils"
import TimeShiftDetector from "../../../utils/timeshiftdetector"

function SeekableLivePlayer(mediaPlayer) {
  const AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8

  const timeShiftDetector = TimeShiftDetector(() => {
    if (getState() !== MediaPlayerBase.STATE.PAUSED) {
      return
    }

    startAutoResumeTimeout()
  })

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

  function getState() {
    return mediaPlayer.getState()
  }

  function getSeekableRange() {
    return mediaPlayer.getSeekableRange()
  }

  function reset() {
    timeShiftDetector.disconnect()
    mediaPlayer.reset()
  }

  function stop() {
    timeShiftDetector.disconnect()
    mediaPlayer.stop()
  }

  function startAutoResumeTimeout() {
    DynamicWindowUtils.autoResumeAtStartOfRange(
      mediaPlayer.getCurrentTime(),
      mediaPlayer.getSeekableRange(),
      addEventCallback,
      removeEventCallback,
      MediaPlayerBase.unpausedEventCheck,
      resume
    )
  }

  return {
    initialiseMedia: function initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts) {
      const _mediaType =
        mediaType === MediaPlayerBase.TYPE.AUDIO ? MediaPlayerBase.TYPE.LIVE_AUDIO : MediaPlayerBase.TYPE.LIVE_VIDEO

      mediaPlayer.initialiseMedia(_mediaType, sourceUrl, mimeType, sourceContainer, opts)

      timeShiftDetector.observe(getSeekableRange)
    },

    beginPlayback: function beginPlayback() {
      if (window.bigscreenPlayer?.overrides?.forceBeginPlaybackToEndOfWindow) {
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

    pause: function pause() {
      const secondsUntilStartOfWindow = mediaPlayer.getCurrentTime() - mediaPlayer.getSeekableRange().start

      if (secondsUntilStartOfWindow <= AUTO_RESUME_WINDOW_START_CUSHION_SECONDS) {
        mediaPlayer.toPaused()
        mediaPlayer.toPlaying()
      } else {
        mediaPlayer.pause()

        if (timeShiftDetector.isSeekableRangeSliding()) {
          startAutoResumeTimeout()
        }
      }
    },

    resume,
    stop,
    reset,
    getState,
    getSource: () => mediaPlayer.getSource(),
    getCurrentTime: () => mediaPlayer.getCurrentTime(),
    getSeekableRange,
    getMimeType: () => mediaPlayer.getMimeType(),
    addEventCallback,
    removeEventCallback,
    removeAllEventCallbacks,
    getPlayerElement: () => mediaPlayer.getPlayerElement(),
    getLiveSupport: () => MediaPlayerBase.LIVE_SUPPORT.SEEKABLE,
  }
}

export default SeekableLivePlayer
