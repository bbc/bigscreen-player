define(
    'bigscreenplayer/playbackstrategy/modifiers/live/restartable',
  [
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/models/windowtypes'
  ],
    function (Html5Player, MediaPlayerBase, WindowTypes) {
      'use strict';
      var AUTO_RESUME_WINDOW_START_CUSHION_MILLISECONDS = 8000;

      function RestartableLivePlayer (deviceConfig, logger, windowType) {
        var mediaPlayer = Html5Player(logger);
        mediaPlayer.addEventCallback(this, function (event) {
          if (event.type === MediaPlayerBase.EVENT.STATUS) {
            return;
          }

          event.currentTime = fakeCurrentTime;
          event.seekableRange = fakeSeekableRange;

          for (var index = 0; index < eventCallbacks.length; index++) {
            eventCallbacks[index](event);
          }
        });

        var millisecondsUntilStartOfWindow;
        var bufferingStarted;
        var self = this;

        function determineTimeUntilStartOfWindow () {
          mediaPlayer.addEventCallback(self, detectCurrentTimeCallback);
        }

        function stopDeterminingTimeUntilStartOfWindow () {
          mediaPlayer.removeEventCallback(self, detectCurrentTimeCallback);
        }

        function detectCurrentTimeCallback (event) {
          if (event.state === MediaPlayerBase.STATE.PLAYING && event.currentTime > 0) {
            mediaPlayer.removeEventCallback(self, detectCurrentTimeCallback);
            millisecondsUntilStartOfWindow = event.currentTime * 1000;
            determineTimeSpentBuffering();
          }
        }

        function autoResumeAtStartOfRange () {
          if (millisecondsUntilStartOfWindow !== null) {
            var resumeTimeOut = Math.max(0, millisecondsUntilStartOfWindow - AUTO_RESUME_WINDOW_START_CUSHION_MILLISECONDS);
            var pauseStarted = new Date().getTime();
            var autoResumeTimer = setTimeout(function () {
              mediaPlayer.removeEventCallback(self, detectIfUnpaused);
              millisecondsUntilStartOfWindow = 0;
              resume();
            }, resumeTimeOut);

            mediaPlayer.addEventCallback(self, detectIfUnpaused);
          }

          function detectIfUnpaused (event) {
            if (event.state !== MediaPlayerBase.STATE.PAUSED) {
              mediaPlayer.removeEventCallback(self, detectIfUnpaused);
              clearTimeout(autoResumeTimer);
              var timePaused = new Date().getTime() - pauseStarted;
              millisecondsUntilStartOfWindow -= timePaused;
            }
          }
        }

        function determineTimeSpentBuffering () {
          bufferingStarted = null;
          mediaPlayer.addEventCallback(self, determineBufferingCallback);
        }

        function stopDeterminingTimeSpentBuffering () {
          mediaPlayer.removeEventCallback(self, determineBufferingCallback);
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

        var fakeCurrentTime;
        var fakeCurrentTimeInterval;

        function fakeCurrentTimeCallback (event) {
          if (event.state === MediaPlayerBase.STATE.PLAYING) {
            if (!fakeCurrentTime && event.currentTime > 0) {
              fakeCurrentTime = event.currentTime;
            }
            if (!fakeCurrentTimeInterval) {
              fakeCurrentTimeInterval = setInterval(function () {
                fakeCurrentTime += 0.5;
                sendStatusEvent();
              }, 500);
            }
          } else {
            clearInterval(fakeCurrentTimeInterval);
            fakeCurrentTimeInterval = null;
          }
        }

        function sendStatusEvent () {
          var event = {
            type: MediaPlayerBase.EVENT.STATUS,
            currentTime: fakeCurrentTime,
            seekableRange: fakeSeekableRange,
            duration: mediaPlayer.getDuration(),
            url: mediaPlayer.getSource(),
            mimeType: mediaPlayer.getMimeType(),
            state: mediaPlayer.getState()
          };

          for (var index = 0; index < eventCallbacks.length; index++) {
            eventCallbacks[index](event);
          }
        }

        var fakeSeekableRange;
        var fakeSeekableRangeInterval;

        function fakeSeekableRangeCallback (event) {
          if (event.state === MediaPlayerBase.STATE.PLAYING && event.seekableRange) {
            fakeSeekableRange = event.seekableRange;
            fakeSeekableRangeInterval = setInterval(function () {
              fakeSeekableRange.end += 0.5;
              if (windowType === WindowTypes.SLIDING) {
                fakeSeekableRange.start += 0.5;
              }
            }, 500);
            mediaPlayer.removeEventCallback(fakeSeekableRangeCallback);
          }
        }

        var eventCallbacks = [];

        return {
          beginPlayback: function () {
            mediaPlayer.addEventCallback(this, fakeCurrentTimeCallback);
            mediaPlayer.addEventCallback(this, fakeSeekableRangeCallback);

            var config = deviceConfig;

            if (config && config.streaming && config.streaming.overrides && config.streaming.overrides.forceBeginPlaybackToEndOfWindow) {
              mediaPlayer.beginPlaybackFrom(Infinity);
            } else {
              mediaPlayer.beginPlayback();
            }

            determineTimeUntilStartOfWindow();
          },

          beginPlaybackFrom: function (offset) {
            fakeCurrentTime = offset;
            mediaPlayer.addEventCallback(this, fakeCurrentTimeCallback);
            mediaPlayer.addEventCallback(this, fakeSeekableRangeCallback);

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

            mediaPlayer.removeEventCallback(this, fakeCurrentTimeCallback);
            clearInterval(fakeCurrentTimeInterval);
            fakeCurrentTimeInterval = null;
            fakeCurrentTime = null;

            mediaPlayer.removeEventCallback(this, fakeSeekableRangeCallback);
            clearInterval(fakeSeekableRangeInterval);
            fakeSeekableRangeInterval = null;
            fakeSeekableRange = null;
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

          getCurrentTime: function () {
            return fakeCurrentTime;
          },

          getSeekableRange: function () {
            return fakeSeekableRange;
          },

          addEventCallback: function (thisArg, newCallback) {
            var eventCallback = function (event) {
              newCallback.call(thisArg, event);
            };
            eventCallbacks.push(eventCallback);
          },

          removeEventCallback: function (callback) {
            var index = eventCallbacks.indexOf(callback);
            if (index !== -1) {
              eventCallbacks.splice(index, 1);
            }
          },

          removeAllEventCallbacks: function () {
            eventCallbacks = undefined;
          },

          getPlayerElement: function () {
            return mediaPlayer.getPlayerElement();
          }

        };
      }

      return RestartableLivePlayer;
    }
);
