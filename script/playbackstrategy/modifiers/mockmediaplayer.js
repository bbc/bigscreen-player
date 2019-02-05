define('bigscreenplayer/playbackstrategy/modifiers/mockmediaplayer',
    function () {
      function Player () {
        return {
          addEventCallback: function (thisArg, newCallback) {},

          removeEventCallback: function (callback) {},

          removeAllEventCallbacks: function () {},

          initialiseMedia: function (type, url, mediaMimeType, sourceContainer, opts) {},

          playFrom: function (seconds) {},

          beginPlayback: function () {},

          beginPlaybackFrom: function (seconds) {},

          pause: function () {},

          resume: function () {},

          stop: function () {},

          reset: function () {},

          getSeekableRange: function () {},

          getState: function () {},

          getPlayerElement: function () {},

          getSource: function () {},

          getMimeType: function () {},

          getCurrentTime: function () {},

          getDuration: function () {},

          toPaused: function () {},

          toPlaying: function () {}

        };
      }

      return Player;
    });
