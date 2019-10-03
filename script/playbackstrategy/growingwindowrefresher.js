define('bigscreenplayer/playbackstrategy/growingwindowrefresher', [],
  function () {
    return function (mediaPlayer) {
      var refreshInterval;

      function start () {
        refreshInterval = setInterval(function () {
          mediaPlayer.refreshManifest();
        }, 60000);
      }

      function stop () {
        clearInterval(refreshInterval);
      }

      function seek (callbacks) {
        function onSuccess () {
          removeListeners();
          callbacks.onSuccess();
        }

        function onError (evt) {
          if (evt.code === 25) { // code 25 is a dashjs manifest load error
            removeListeners();
            callbacks.onError();
          }
        }

        function removeListeners () {
          mediaPlayer.off('manifestLoaded', onSuccess);
          mediaPlayer.off('error', onError);
        }

        mediaPlayer.on('manifestLoaded', onSuccess);
        mediaPlayer.on('error', onError);

        mediaPlayer.refreshManifest();
      }

      return {
        start: start,
        stop: stop,
        seek: seek
      };
    };
  }
);
