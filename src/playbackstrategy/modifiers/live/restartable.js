import MediaPlayerBase from "../mediaplayerbase"

function RestartableLivePlayer(mediaPlayer) {
  return {
    beginPlayback: () => {
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
      mediaPlayer.beginPlaybackFrom(presentationTimeInSeconds)
    },

    initialiseMedia: (mediaType, sourceUrl, mimeType, sourceContainer, opts) => {
      const mediaSubType =
        mediaType === MediaPlayerBase.TYPE.AUDIO ? MediaPlayerBase.TYPE.LIVE_AUDIO : MediaPlayerBase.TYPE.LIVE_VIDEO

      mediaPlayer.initialiseMedia(mediaSubType, sourceUrl, mimeType, sourceContainer, opts)
    },
    stop: () => mediaPlayer.stop(),
    reset: () => mediaPlayer.reset(),
    getState: () => mediaPlayer.getState(),
    getSource: () => mediaPlayer.getSource(),
    getMimeType: () => mediaPlayer.getMimeType(),
    getPlayerElement: () => mediaPlayer.getPlayerElement(),
    addEventCallback: (thisArg, callback) => mediaPlayer.addEventCallback(thisArg, callback),
    removeEventCallback: (callback) => mediaPlayer.removeEventCallback(callback),
    removeAllEventCallbacks: () => mediaPlayer.removeAllEventCallbacks(),
  }
}

export default RestartableLivePlayer
