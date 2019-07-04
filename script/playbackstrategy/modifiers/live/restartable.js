define(
    'bigscreenplayer/playbackstrategy/modifiers/live/restartable',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/dynamicwindowutils',
    'bigscreenplayer/debugger/debugtool'
  ],
    function (MediaPlayerBase, WindowTypes, DynamicWindowUtils, DebugTool) {
      'use strict';

      function RestartableLivePlayer (mediaPlayer, deviceConfig, windowType, timeData) {
        var callbacksMap = [];
        var startTime;
        var fakeTimer = {};
        addEventCallback(this, updateFakeTimer);

        function updateFakeTimer (event) {
          if (fakeTimer.wasPlaying && fakeTimer.runningTime) {
            fakeTimer.currentTime += (Date.now() - fakeTimer.runningTime) / 1000;
          }

          fakeTimer.runningTime = Date.now();
          fakeTimer.wasPlaying = event.state === MediaPlayerBase.STATE.PLAYING;
        }

        function addEventCallback (thisArg, callback) {
          function newCallback (event) {
            event.currentTime = getCurrentTime();
            event.seekableRange = getSeekableRange();
            callback(event);
          }
          callbacksMap.push({ from: callback, to: newCallback });
          mediaPlayer.addEventCallback(thisArg, newCallback);
        }

        function removeEventCallback (thisArg, callback) {
          var filteredCallbacks = callbacksMap.filter(function (cb) {
            return cb.from === callback;
          });

          if (filteredCallbacks.length > 0) {
            callbacksMap = callbacksMap.splice(callbacksMap.indexOf(filteredCallbacks[0]));

            mediaPlayer.removeEventCallback(thisArg, filteredCallbacks[0].to);
          }
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
            DynamicWindowUtils.autoResumeAtStartOfRange(getCurrentTime(), getSeekableRange(), addEventCallback, removeEventCallback, resume);
          }
        }

        function getCurrentTime () {
          return fakeTimer.currentTime;
        }

        function getSeekableRange () {
          var windowLength = (timeData.windowEndTime - timeData.windowStartTime) / 1000;
          var delta = (Date.now() - startTime) / 1000;
          return {
            start: windowType === WindowTypes.SLIDING ? delta : 0,
            end: windowLength + delta
          };
        }

        return {
          beginPlayback: function () {
            var config = deviceConfig;

            startTime = Date.now();
            fakeTimer.currentTime = (timeData.windowEndTime - timeData.windowStartTime) / 1000;

            if (config && config.streaming && config.streaming.overrides && config.streaming.overrides.forceBeginPlaybackToEndOfWindow) {
              mediaPlayer.beginPlaybackFrom(Infinity);
            } else {
              mediaPlayer.beginPlayback();
            }
          },

          beginPlaybackFrom: function (offset) {
            startTime = Date.now();
            fakeTimer.currentTime = offset;
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
            removeEventCallback(this, updateFakeTimer);
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
