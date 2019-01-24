define(
    'bigscreenplayer/playbackstrategy/modifiers/live/restartable',
  [
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
    function (Html5Player, MediaPlayerBase) {
      'use strict';
      var AUTO_RESUME_WINDOW_START_CUSHION_MILLISECONDS = 8000;

      function RestartableLivePlayer (deviceConfig) {
        var mediaPlayer = Html5Player();
        var millisecondsUntilStartOfWindow;
        var bufferingStarted;

        function determineTimeUntilStartOfWindow () {
          mediaPlayer.addEventCallback(self, detectCurrentTimeCallback);
        }

        function stopDeterminingTimeUntilStartOfWindow () {
          mediaPlayer.removeEventCallback(self, detectCurrentTimeCallback);
        }

        function detectCurrentTimeCallback (event) {
          if (event.state === MediaPlayerBase.STATE.PLAYING && event.currentTime > 0) {
            removeEventCallback(self, detectCurrentTimeCallback);
            millisecondsUntilStartOfWindow = event.currentTime * 1000;
            determineTimeSpentBuffering();
          }
        }

        function autoResumeAtStartOfRange () {
          if (millisecondsUntilStartOfWindow !== null) {
            var resumeTimeOut = Math.max(0, millisecondsUntilStartOfWindow - AUTO_RESUME_WINDOW_START_CUSHION_MILLISECONDS);
            var pauseStarted = new Date().getTime();
            var autoResumeTimer = setTimeout(function () {
              removeEventCallback(self, detectIfUnpaused);
              millisecondsUntilStartOfWindow = 0;
              resume();
            }, resumeTimeOut);

            addEventCallback(self, detectIfUnpaused);
          }

          function detectIfUnpaused (event) {
            if (event.state !== MediaPlayerBase.STATE.PAUSED) {
              self.removeEventCallback(self, detectIfUnpaused);
              clearTimeout(autoResumeTimer);
              var timePaused = new Date().getTime() - pauseStarted;
              self._millisecondsUntilStartOfWindow -= timePaused;
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

        function determineTimeSpentBuffering () {
          bufferingStarted = null;
          addEventCallback(self, determineBufferingCallback);
        }

        function stopDeterminingTimeSpentBuffering () {
          removeEventCallback(self, determineBufferingCallback);
        }

        function determineBufferingCallback (event) {
          if (event.state === MediaPlayerBase.STATE.BUFFERING && bufferingStarted === null) {
            bufferingStarted = new Date().getTime();
          } else if (event.state !== MediaPlayerBase.STATE.BUFFERING && bufferingStarted !== null) {
            var timeBuffering = new Date().getTime() - bufferingStarted;
            millisecondsUntilStartOfWindow = Math.max(0, millisecondsUntilStartOfWindow - timeBuffering);
            bufferingStarted = null;
          }
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

        return {
          beginPlayback: function () {
            var config = deviceConfig;

            if (config && config.streaming && config.streaming.overrides && config.streaming.overrides.forceBeginPlaybackToEndOfWindow) {
              mediaPlayer.beginPlaybackFrom(Infinity);
            } else {
              mediaPlayer.beginPlayback();
            }

            determineTimeUntilStartOfWindow();
          },

          beginPlaybackFrom: function (offset) {
            millisecondsUntilStartOfWindow = offset * 1000;
            mediaPlayer.beginPlaybackFrom(offset);
            determineTimeSpentBuffering();
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
            stopDeterminingTimeUntilStartOfWindow();
            stopDeterminingTimeSpentBuffering();
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
          }

        };
      }

      return RestartableLivePlayer;
    }
);
