import MediaPlayerBase from "../mediaplayerbase"

function PlayableLivePlayer(mediaPlayer) {
  return {
    initialiseMedia: (mediaType, sourceUrl, mimeType, sourceContainer, opts) => {
      const liveMediaType =
        mediaType === MediaPlayerBase.TYPE.AUDIO ? MediaPlayerBase.TYPE.LIVE_AUDIO : MediaPlayerBase.TYPE.LIVE_VIDEO

      mediaPlayer.initialiseMedia(liveMediaType, sourceUrl, mimeType, sourceContainer, opts)
    },

    beginPlayback: () => mediaPlayer.beginPlayback(),
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

export default PlayableLivePlayer
