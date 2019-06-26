define(
    'bigscreenplayer/playbackstrategy/modifiers/live/restartable',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
    function (MediaPlayerBase) {
      'use strict';
      var AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8;

      function RestartableLivePlayer (mediaPlayer, deviceConfig) {
        var self = this;

        function autoResumeAtStartOfRange () {
          var resumeTimeOut = Math.max(0, getCurrentTime() - getSeekableRange().start - AUTO_RESUME_WINDOW_START_CUSHION_SECONDS);
          var autoResumeTimer = setTimeout(function () {
            removeEventCallback(self, detectIfUnpaused);
            resume();
          }, resumeTimeOut * 1000);

          addEventCallback(self, detectIfUnpaused);

          function detectIfUnpaused (event) {
            if (event.state !== MediaPlayerBase.STATE.PAUSED) {
              removeEventCallback(self, detectIfUnpaused);
              clearTimeout(autoResumeTimer);
            }
          }
        }

        function addEventCallback (thisArg, callback) {
          mediaPlayer.addEventCallback(thisArg, callback);
        }

        function removeEventCallback (thisArg, callback) {
          mediaPlayer.removeEventCallback(thisArg, callback);
        }

        function removeAllEventCallbacks () {
          mediaPlayer.removeAllEventCallbacks();
        }

        function resume () {
          mediaPlayer.resume();
        }

        function pause (opts) {
          mediaPlayer.pause();
          opts = opts || {};
          if (opts.disableAutoResume !== true) {
            autoResumeAtStartOfRange();
          }
        }

        function getCurrentTime () {
          return mediaPlayer.getCurrentTime();
        }

        function getSeekableRange () {
          return mediaPlayer.getSeekableRange();
        }

        return {
          beginPlayback: function () {
            var config = deviceConfig;

            if (config && config.streaming && config.streaming.overrides && config.streaming.overrides.forceBeginPlaybackToEndOfWindow) {
              mediaPlayer.beginPlaybackFrom(Infinity);
            } else {
              mediaPlayer.beginPlayback();
            }
          },

          beginPlaybackFrom: function (offset) {
            mediaPlayer.beginPlaybackFrom(offset);
          },

          initialiseMedia: function (mediaType, sourceUrl, mimeType, sourceContainer, opts) {
            if (mediaType === MediaPlayerBase.TYPE.AUDIO) {
              mediaType = MediaPlayerBase.TYPE.LIVE_AUDIO;
            } else {
              mediaType = MediaPlayerBase.TYPE.LIVE_VIDEO;
            }

            mediaPlayer.initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts);
          },

          pause: pause,

          resume: resume,

          stop: function () {
            mediaPlayer.stop();
          },

          reset: function () {
            mediaPlayer.reset();
          },

          getState: function () {
            return mediaPlayer.getState();
          },

          getSource: function () {
            return mediaPlayer.getSource();
          },

          getMimeType: function () {
            return mediaPlayer.getMimeType();
          },

          addEventCallback: addEventCallback,

          removeEventCallback: removeEventCallback,

          removeAllEventCallbacks: removeAllEventCallbacks,

          getPlayerElement: function () {
            return mediaPlayer.getPlayerElement();
          },

          getCurrentTime: getCurrentTime,

          getSeekableRange: getSeekableRange

        };
      }

      return RestartableLivePlayer;
    }
);
