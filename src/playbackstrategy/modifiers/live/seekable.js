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

  mediaPlayer.addEventCallback(null, (event) => {
    // Avoid observing the seekable range before metadata loads
    if (event.type !== MediaPlayerBase.EVENT.METADATA) {
      return
    }

    timeShiftDetector.observe(getSeekableRange)
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
    initialiseMedia: function initialiseMedia(mediaKind, sourceUrl, mimeType, sourceContainer, opts) {
      const mediaType =
        mediaKind === MediaPlayerBase.TYPE.AUDIO ? MediaPlayerBase.TYPE.LIVE_AUDIO : MediaPlayerBase.TYPE.LIVE_VIDEO

      mediaPlayer.initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts)
    },

    beginPlayback: function beginPlayback() {
      if (window.bigscreenPlayer?.overrides?.forceBeginPlaybackToEndOfWindow) {
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
