define(
    'bigscreenplayer/playbackstrategy/modifiers/live/seekable',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/dynamicwindowutils',
    'bigscreenplayer/models/windowtypes'
  ],
    function (MediaPlayerBase, DynamicWindowUtils, WindowTypes) {
      'use strict';

      function SeekableLivePlayer (mediaPlayer, deviceConfig, windowType) {
        var AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8;

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

        return ({
          initialiseMedia: function initialiseMedia (mediaType, sourceUrl, mimeType, sourceContainer, opts) {
            if (mediaType === MediaPlayerBase.TYPE.AUDIO) {
              mediaType = MediaPlayerBase.TYPE.LIVE_AUDIO;
            } else {
              mediaType = MediaPlayerBase.TYPE.LIVE_VIDEO;
            }

            mediaPlayer.initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts);
          },

          beginPlayback: function beginPlayback () {
            var config = deviceConfig;
            if (config && config.streaming && config.streaming.overrides && config.streaming.overrides.forceBeginPlaybackToEndOfWindow) {
              mediaPlayer.beginPlaybackFrom(Infinity);
            } else {
              mediaPlayer.beginPlayback();
            }
          },

          beginPlaybackFrom: function beginPlaybackFrom (offset) {
            mediaPlayer.beginPlaybackFrom(offset);
          },

          playFrom: function playFrom (offset) {
            var postSeekState = mediaPlayer.getState();
            mediaPlayer.playFrom(offset);
            if (postSeekState === MediaPlayerBase.STATE.PAUSED && windowType === WindowTypes.SLIDING) {
              DynamicWindowUtils.autoResumeAtStartOfRange(
                mediaPlayer.getCurrentTime(),
                mediaPlayer.getSeekableRange(),
                addEventCallback,
                removeEventCallback,
                MediaPlayerBase.unpausedEventCheck,
                resume);
            }
          },

          pause: function pause (opts) {
            opts = opts || {};
            var secondsUntilStartOfWindow = mediaPlayer.getCurrentTime() - mediaPlayer.getSeekableRange().start;

            if (opts.disableAutoResume) {
              mediaPlayer.pause();
            } else if (secondsUntilStartOfWindow <= AUTO_RESUME_WINDOW_START_CUSHION_SECONDS) {
              mediaPlayer.toPaused();
              mediaPlayer.toPlaying();
            } else {
              mediaPlayer.pause();
              if (windowType === WindowTypes.SLIDING) {
                DynamicWindowUtils.autoResumeAtStartOfRange(
                  mediaPlayer.getCurrentTime(),
                  mediaPlayer.getSeekableRange(),
                  addEventCallback,
                  removeEventCallback,
                  MediaPlayerBase.unpausedEventCheck,
                  resume);
              }
            }
          },
          resume: resume,

          stop: function stop () {
            mediaPlayer.stop();
          },

          reset: function reset () {
            mediaPlayer.reset();
          },

          getState: function getState () {
            return mediaPlayer.getState();
          },

          getSource: function getSource () {
            return mediaPlayer.getSource();
          },

          getCurrentTime: function getCurrentTime () {
            return mediaPlayer.getCurrentTime();
          },

          getSeekableRange: function getSeekableRange () {
            return mediaPlayer.getSeekableRange();
          },

          getMimeType: function getMimeType () {
            return mediaPlayer.getMimeType();
          },

          addEventCallback: addEventCallback,

          removeEventCallback: removeEventCallback,

          removeAllEventCallbacks: removeAllEventCallbacks,

          getPlayerElement: function getPlayerElement () {
            return mediaPlayer.getPlayerElement();
          },

          getLiveSupport: function getLiveSupport () {
            return MediaPlayerBase.LIVE_SUPPORT.SEEKABLE;
          }

        });
      }

      return SeekableLivePlayer;
    });
