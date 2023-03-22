import MediaPlayerBase from "../mediaplayerbase"

function PlayableLivePlayer(mediaPlayer) {
  return {
    initialiseMedia: (mediaType, sourceUrl, mimeType, sourceContainer, opts) => {
      if (mediaType === MediaPlayerBase.TYPE.AUDIO) {
        mediaType = MediaPlayerBase.TYPE.LIVE_AUDIO
      } else {
        mediaType = MediaPlayerBase.TYPE.LIVE_VIDEO
      }

      mediaPlayer.initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts)
    },

    beginPlayback: () => mediaPlayer.beginPlayback(),
    stop: () => mediaPlayer.stop(),
    reset: () => mediaPlayer.reset(),
    getState: () => mediaPlayer.getState(),
    getSource: () => mediaPlayer.getSource(),
    getMimeType: () => mediaPlayer.getMimeType(),

    addEventCallback: (thisArg, callback) => mediaPlayer.addEventCallback(thisArg, callback),

    removeEventCallback: (thisArg, callback) => mediaPlayer.removeEventCallback(thisArg, callback),

    removeAllEventCallbacks: () => mediaPlayer.removeAllEventCallbacks(),

    getPlayerElement: () => mediaPlayer.getPlayerElement(),
  }
}

export default PlayableLivePlayer
