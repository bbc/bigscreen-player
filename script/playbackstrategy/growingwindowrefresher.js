define('bigscreenplayer/playbackstrategy/growingwindowrefresher', [],
  function () {
    return function (mediaPlayer, callback) {
      function onSuccess (event) {
        mediaPlayer.off('manifestLoaded', onSuccess);
        callback(event.data.mediaPresentationDuration);
      }

      mediaPlayer.on('manifestLoaded', onSuccess);

      mediaPlayer.refreshManifest();
    };
  }
);
