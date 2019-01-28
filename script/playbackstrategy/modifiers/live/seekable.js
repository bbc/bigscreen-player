/**
 * @fileOverview Requirejs module containing device modifier for live playback
 * with support level Seekable
 * @preserve Copyright (c) 2013-present British Broadcasting Corporation. All rights reserved.
 * @license See https://github.com/bbc/tal/blob/master/LICENSE for full licence
 */

define(
    'bigscreenplayer/playbackstrategy/modifiers/live/seekable',
  [
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
    function (Html5Player, MediaPlayerBase) {
      'use strict';
      var AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8;

      function SeekableLivePlayer (deviceConfig, logger) {
        var mediaPlayer = Html5Player(logger);

        function addEventCallback (thisArg, callback) {
          mediaPlayer.addEventCallback(thisArg, callback);
        }

        function removeEventCallback (thisArg, callback) {
          mediaPlayer.removeEventCallback(thisArg, callback);
        }

        function removeAllEventCallbacks () {
          mediaPlayer.removeAllEventCallbacks();
        }

        function autoResumeAtStartOfRange () {
          var secondsUntilAutoResume = Math.max(0, mediaPlayer.getCurrentTime() - mediaPlayer.getSeekableRange().start - AUTO_RESUME_WINDOW_START_CUSHION_SECONDS);

          var autoResumeTimer = setTimeout(function () {
            removeEventCallback(self, detectIfUnpaused);
            resume();
          }, secondsUntilAutoResume * 1000);

          addEventCallback(self, detectIfUnpaused);
          function detectIfUnpaused (event) {
            if (event.state !== MediaPlayerBase.STATE.PAUSED) {
              self.removeEventCallback(self, detectIfUnpaused);
              clearTimeout(autoResumeTimer);
            }
          }
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
            mediaPlayer.playFrom(offset);
          },

          pause: function pause (opts) {
            opts = opts || {};
            var secondsUntilStartOfWindow = mediaPlayer.getCurrentTime() - mediaPlayer.getSeekableRange().start;

            if (opts.disableAutoResume) {
              mediaPlayer.pause();
            } else if (secondsUntilStartOfWindow <= AUTO_RESUME_WINDOW_START_CUSHION_SECONDS) {
                        // IPLAYERTVV1-4166
                        // We can't pause so close to the start of the sliding window, so do a quick state transition in and
                        // out on 'pause' state to be consistent with the rest of TAL.
              mediaPlayer._toPaused();
              mediaPlayer._toPlaying();
            } else {
              mediaPlayer.pause();
              autoResumeAtStartOfRange();
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
          },

          autoResumeAtStartOfRange: autoResumeAtStartOfRange

        });
      }

      return SeekableLivePlayer;
    });
