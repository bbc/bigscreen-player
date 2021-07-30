import MediaPlayerBase from '../mediaplayerbase'

function PlayableLivePlayer (mediaPlayer) {
  return {
    beginPlayback: function beginPlayback () {
      mediaPlayer.beginPlayback()
    },

    initialiseMedia: function initialiseMedia (mediaType, sourceUrl, mimeType, sourceContainer, opts) {
      if (mediaType === MediaPlayerBase.TYPE.AUDIO) {
        mediaType = MediaPlayerBase.TYPE.LIVE_AUDIO
      } else {
        mediaType = MediaPlayerBase.TYPE.LIVE_VIDEO
      }

      mediaPlayer.initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts)
    },

    stop: function stop () {
      mediaPlayer.stop()
    },

    reset: function reset () {
      mediaPlayer.reset()
    },

    getState: function getState () {
      return mediaPlayer.getState()
    },

    getSource: function getSource () {
      return mediaPlayer.getSource()
    },

    getMimeType: function getMimeType () {
      return mediaPlayer.getMimeType()
    },

    addEventCallback: function addEventCallback (thisArg, callback) {
      mediaPlayer.addEventCallback(thisArg, callback)
    },

    removeEventCallback: function removeEventCallback (thisArg, callback) {
      mediaPlayer.removeEventCallback(thisArg, callback)
    },

    removeAllEventCallbacks: function removeAllEventCallbacks () {
      mediaPlayer.removeAllEventCallbacks()
    },

    getPlayerElement: function getPlayerElement () {
      return mediaPlayer.getPlayerElement()
    }
  }
}

export default PlayableLivePlayer
