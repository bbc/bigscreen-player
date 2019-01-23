/**
 * @fileOverview Requirejs module containing device modifier for HTML5 media playback
 * @preserve Copyright (c) 2013-present British Broadcasting Corporation. All rights reserved.
 * @license See https://github.com/bbc/tal/blob/master/LICENSE for full licence
 */

define(
    'bigscreenplayer/playbackstrategy/modifiers/html5',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
    function (MediaPlayerBase) {
      'use strict';

      /**
       * Main MediaPlayer implementation for HTML5 devices.
       * Use this device modifier if a device implements the HTML5 media playback standard.
       * It must support creation of &lt;video&gt; and &lt;audio&gt; elements, and those objects must expose an
       * API in accordance with the HTML5 media specification.
       * @name antie.devices.mediaplayer.HTML5
       * @class
       * @extends antie.devices.mediaplayer.MediaPlayer
       */
      function Player () {
        var eventCallback;
        var state = MediaPlayerBase.STATE.EMPTY;

        var mediaElement;
        var sourceElement;

        var trustZeroes = false;
        var ignoreNextPauseEvent = false;
        var nearEndOfMedia;
        var readyToPlayFrom;

        var mediaType;
        var source;
        var mimeType;

        var postBufferingState;
        var targetSeekTime;

        var disableSentinels;
        var hasSentinelTimeChangedWithinTolerance;
        var enterBufferingSentinelAttemptCount;
        var sentinelSeekTime;
        var seekSentinelTolerance;
        var sentinelInterval;
        var sentinelIntervalNumber;
        var lastSentinelTime;

        var sentinelLimits = {
          pause: {
            maximumAttempts: 2,
            successEvent: MediaPlayerBase.EVENT.SENTINEL_PAUSE,
            failureEvent: MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE,
            currentAttemptCount: 0
          },
          seek: {
            maximumAttempts: 2,
            successEvent: MediaPlayerBase.EVENT.SENTINEL_SEEK,
            failureEvent: MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE,
            currentAttemptCount: 0
          }
        };

        function emitEvent (eventType, eventLabels) {
          var event = {
            type: eventType,
            currentTime: getCurrentTime(),
            seekableRange: getSeekableRange(),
            duration: getDuration(),
            url: getSource(),
            mimeType: getMimeType(),
            state: getState()
          };

          if (eventLabels) {
            for (var key in eventLabels) {
              if (eventLabels.hasOwnProperty(key)) {
                event[key] = eventLabels[key];
              }
            }
          }

          eventCallback(event);
        }

        function getDuration () {
          switch (getState()) {
            case MediaPlayerBase.STATE.STOPPED:
            case MediaPlayerBase.STATE.ERROR:
              return undefined;
            default:
              if (isLiveMedia()) {
                return Infinity;
              }
              return getMediaDuration();
          }
        }

        function getSource () {
          return source;
        }

        function getMimeType () {
          return mimeType;
        }

        function getState () {
          return state;
        }

        function isLiveMedia () {
          return (mediaType === MediaPlayerBase.TYPE.LIVE_VIDEO) || (mediaType === MediaPlayerBase.TYPE.LIVE_AUDIO);
        }

        function setSeekSentinelTolerance () {
          var ON_DEMAND_SEEK_SENTINEL_TOLERANCE = 15;
          var LIVE_SEEK_SENTINEL_TOLERANCE = 30;

          seekSentinelTolerance = ON_DEMAND_SEEK_SENTINEL_TOLERANCE;
          if (isLiveMedia()) {
            seekSentinelTolerance = LIVE_SEEK_SENTINEL_TOLERANCE;
          }
        }

        function generateSourceElement (url, mimeType) {
          var sourceElement = document.createElement('source');
          sourceElement.src = url;
          sourceElement.type = 'video/mp4'; // mimeType;
          return sourceElement;
        }

        function appendChildElement (to, el) {
          to.appendChild(el);
        }

        function prependChildElement (to, el) {
          if (to.childNodes.length > 0) {
            to.insertBefore(el, to.childNodes[0]);
          } else {
            to.appendChild(el);
          }
        }

        function removeElement (el) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }

        function toStopped () {
          state = MediaPlayerBase.STATE.STOPPED;
          emitEvent(MediaPlayerBase.EVENT.STOPPED);
          setSentinels([]);
        }

        function enterBufferingSentinel () {
          var sentinelShouldFire = !hasSentinelTimeChangedWithinTolerance && !nearEndOfMedia;

          if (getCurrentTime() === 0) {
            sentinelShouldFire = trustZeroes && sentinelShouldFire;
          }

          if (enterBufferingSentinelAttemptCount === undefined) {
            enterBufferingSentinelAttemptCount = 0;
          }

          if (sentinelShouldFire) {
            enterBufferingSentinelAttemptCount++;
          } else {
            enterBufferingSentinelAttemptCount = 0;
          }

          if (enterBufferingSentinelAttemptCount === 1) {
            sentinelShouldFire = false;
          }

          if (sentinelShouldFire) {
            emitEvent(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
            toBuffering();
            /* Resetting the sentinel attempt count to zero means that the sentinel will only fire once
             even if multiple iterations result in the same conditions.
             This should not be needed as the second iteration, when the enter buffering sentinel is fired
             will cause the media player to go into the buffering state. The enter buffering sentinel is not fired
             when in buffering state
             */
            enterBufferingSentinelAttemptCount = 0;
            return true;
          }

          return false;
        }

        function exitBufferingSentinel () {
          function fireExitBufferingSentinel () {
            emitEvent(MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING);
            exitBuffering();
            return true;
          }

          if (readyToPlayFrom && mediaElement.paused) {
            return fireExitBufferingSentinel();
          }

          if (hasSentinelTimeChangedWithinTolerance) {
            return fireExitBufferingSentinel();
          }
          return false;
        }

        function shouldBeSeekedSentinel () {
          if (sentinelSeekTime === undefined) {
            return false;
          }

          var currentTime = getCurrentTime();
          var sentinelActionTaken = false;

          if (Math.abs(currentTime - sentinelSeekTime) > seekSentinelTolerance) {
            sentinelActionTaken = nextSentinelAttempt(sentinelLimits.seek, function () {
              mediaElement.currentTime = sentinelSeekTime;
            });
          } else if (sentinelIntervalNumber < 3) {
            sentinelSeekTime = currentTime;
          } else {
            sentinelSeekTime = undefined;
          }

          return sentinelActionTaken;
        }

        function shouldBePausedSentinel () {
          var sentinelActionTaken = false;
          if (hasSentinelTimeChangedWithinTolerance) {
            sentinelActionTaken = nextSentinelAttempt(sentinelLimits.pause, function () {
              pauseMediaElement();
            });
          }

          return sentinelActionTaken;
        }

        function nextSentinelAttempt (sentinelInfo, attemptFn) {
          var currentAttemptCount, maxAttemptCount;

          sentinelInfo.currentAttemptCount += 1;
          currentAttemptCount = sentinelInfo.currentAttemptCount;
          maxAttemptCount = sentinelInfo.maximumAttempts;

          if (currentAttemptCount === maxAttemptCount + 1) {
            emitEvent(sentinelInfo.failureEvent);
          }

          if (currentAttemptCount <= maxAttemptCount) {
            attemptFn();
            emitEvent(sentinelInfo.successEvent);
            return true;
          }

          return false;
        }

        function endOfMediaSentinel () {
          if (!hasSentinelTimeChangedWithinTolerance && nearEndOfMedia) {
            emitEvent(MediaPlayerBase.EVENT.SENTINEL_COMPLETE);
            onEndOfMedia();
            return true;
          }
          return false;
        }

        function clearSentinels () {
          clearInterval(sentinelInterval);
        }

        function setSentinels (sentinels) {
          if (disableSentinels) {
            return;
          }

          clearSentinels();
          sentinelIntervalNumber = 0;
          lastSentinelTime = getCurrentTime();
          sentinelInterval = setInterval(function () {
            sentinelIntervalNumber += 1;
            var newTime = getCurrentTime();

            hasSentinelTimeChangedWithinTolerance = (Math.abs(newTime - lastSentinelTime) > 0.2);
            nearEndOfMedia = (getDuration() - (newTime || lastSentinelTime)) <= 1;
            lastSentinelTime = newTime;

            for (var i = 0; i < sentinels.length; i++) {
              var sentinelActivated = sentinels[i].call();

              if (getCurrentTime() > 0) {
                trustZeroes = false;
              }

              if (sentinelActivated) {
                break;
              }
            }
          }, 1100);
        }

        function reportError (errorMessage) {
          // TODO: replace this with Debug logs?
          // RuntimeContext.getDevice().getLogger().error(errorMessage);
          emitEvent(MediaPlayerBase.EVENT.ERROR, { 'errorMessage': errorMessage });
        }

        function toBuffering () {
          state = MediaPlayerBase.STATE.BUFFERING;
          emitEvent(MediaPlayerBase.EVENT.BUFFERING);
          setSentinels([exitBufferingSentinel]);
        }

        function toPlaying () {
          state = MediaPlayerBase.STATE.PLAYING;
          emitEvent(MediaPlayerBase.EVENT.PLAYING);
          setSentinels([endOfMediaSentinel, shouldBeSeekedSentinel, enterBufferingSentinel]);
        }

        function toPaused () {
          state = MediaPlayerBase.STATE.PAUSED;
          emitEvent(MediaPlayerBase.EVENT.PAUSED);
          setSentinels([shouldBeSeekedSentinel, shouldBePausedSentinel]);
        }

        function toComplete () {
          state = MediaPlayerBase.STATE.COMPLETE;
          emitEvent(MediaPlayerBase.EVENT.COMPLETE);
          setSentinels([]);
        }

        function toEmpty () {
          wipe();
          state = MediaPlayerBase.STATE.EMPTY;
        }

        function toError (errorMessage) {
          wipe();
          state = MediaPlayerBase.STATE.ERROR;
          reportError(errorMessage);
          // throw 'ApiError: ' + errorMessage; // TODO: fix this
        }

        function isReadyToPlayFrom () {
          if (readyToPlayFrom !== undefined) {
            return readyToPlayFrom;
          }
          return false;
        }

        function getMediaDuration () {
          if (mediaElement && isReadyToPlayFrom()) {
            return mediaElement.duration;
          }
          return undefined;
        }

        function getSeekableRange () {
          if (mediaElement) {
            if (isReadyToPlayFrom() && mediaElement.seekable && mediaElement.seekable.length > 0) {
              return {
                start: mediaElement.seekable.start(0),
                end: mediaElement.seekable.end(0)
              };
            } else if (mediaElement.duration !== undefined) {
              return {
                start: 0,
                end: mediaElement.duration
              };
            } else {
              // TODO: replace this with Debug logs?
              // RuntimeContext.getDevice().getLogger().warn('No \'duration\' or \'seekable\' on media element');
            }
          }
          return undefined;
        }

        function onFinishedBuffering () {
          exitBuffering();
        }

        function pauseMediaElement () {
          mediaElement.pause();
          ignoreNextPauseEvent = true;
        }

        function onPause () {
          if (ignoreNextPauseEvent) {
            ignoreNextPauseEvent = false;
            return;
          }

          if (getState() !== MediaPlayerBase.STATE.PAUSED) {
            toPaused();
          }
        }

        function onError () {
          reportError('Media element error code: ' + mediaElement.error.code);
        }

        function onSourceError () {
          reportError('Media source element error');
        }

        function onDeviceBuffering () {
          if (getState() === MediaPlayerBase.STATE.PLAYING) {
            toBuffering();
          }
        }

        function onEndOfMedia () {
          toComplete();
        }

        function onStatus () {
          if (getState() === MediaPlayerBase.STATE.PLAYING) {
            emitEvent(MediaPlayerBase.EVENT.STATUS);
          }
        }

        function onMetadata () {
          metadataLoaded();
        }

        function exitBuffering () {
          metadataLoaded();
          if (getState() !== MediaPlayerBase.STATE.BUFFERING) {
            return;
          } else if (postBufferingState === MediaPlayerBase.STATE.PAUSED) {
            toPaused();
          } else {
            toPlaying();
          }
        }

        function metadataLoaded () {
          readyToPlayFrom = true;
          if (waitingToPlayFrom()) {
            deferredPlayFrom();
          }
        }

        function playFromIfReady () {
          if (isReadyToPlayFrom()) {
            if (waitingToPlayFrom()) {
              deferredPlayFrom();
            }
          }
        }

        function waitingToPlayFrom () {
          return targetSeekTime !== undefined;
        }

        function deferredPlayFrom () {
          seekTo(targetSeekTime);
          mediaElement.play();
          if (postBufferingState === MediaPlayerBase.STATE.PAUSED) {
            pauseMediaElement();
          }
          targetSeekTime = undefined;
        }

        function seekTo (seconds) {
          var clampedTime = getClampedTimeForPlayFrom(seconds);
          mediaElement.currentTime = clampedTime;
          sentinelSeekTime = clampedTime;
        }

        function getCurrentTime () {
          switch (getState()) {
            case MediaPlayerBase.STATE.STOPPED:
            case MediaPlayerBase.STATE.ERROR:
              break;

            default:
              if (mediaElement) {
                return mediaElement.currentTime;
              }
              break;
          }
          return undefined;
        }

        /**
          * Time (in seconds) compared to current time within which seeking has no effect.
          * @constant {Number}
        */
        var CURRENT_TIME_TOLERANCE = 1;

        /**
          * Check whether a time value is near to the current media play time.
          * @param {Number} seconds The time value to test, in seconds from the start of the media
          * @protected
        */
        function isNearToCurrentTime (seconds) {
          var currentTime = getCurrentTime();
          var targetTime = getClampedTime(seconds);
          return Math.abs(currentTime - targetTime) <= CURRENT_TIME_TOLERANCE;
        }

        /**
          * Clamp a time value so it does not exceed the current range.
          * Clamps to near the end instead of the end itself to allow for devices that cannot seek to the very end of the media.
          * @param {Number} seconds The time value to clamp in seconds from the start of the media
          * @protected
        */
        function getClampedTime (seconds) {
          var range = getSeekableRange();
          var offsetFromEnd = getClampOffsetFromConfig();
          var nearToEnd = Math.max(range.end - offsetFromEnd, range.start);
          if (seconds < range.start) {
            return range.start;
          } else if (seconds > nearToEnd) {
            return nearToEnd;
          } else {
            return seconds;
          }
        }

        /**
          * Offset used when attempting to playFrom() the end of media. This allows the media to play briefly before completing.
          * @constant {Number}
        */
        var CLAMP_OFFSET_FROM_END_OF_RANGE = 1.1;

        function getClampOffsetFromConfig () {
          var clampOffsetFromEndOfRange;

          // TODO: can we tidy this, is it needed any more? If so we can combine it into bigscreen-player configs
          // if (config && config.streaming && config.streaming.overrides) {
          //   clampOffsetFromEndOfRange = config.streaming.overrides.clampOffsetFromEndOfRange;
          // }

          if (clampOffsetFromEndOfRange !== undefined) {
            return clampOffsetFromEndOfRange;
          } else {
            return CLAMP_OFFSET_FROM_END_OF_RANGE;
          }
        }

        function getClampedTimeForPlayFrom (seconds) {
          var clampedTime = getClampedTime(seconds);
          if (clampedTime !== seconds) {
            // TODO: replace this with Debug logs?
            // RuntimeContext.getDevice().getLogger().debug('playFrom ' + seconds + ' clamped to ' + clampedTime + ' - seekable range is { start: ' + range.start + ', end: ' + range.end + ' }');
          }
          return clampedTime;
        }

        function wipe () {
          mediaType = undefined;
          source = undefined;
          mimeType = undefined;
          targetSeekTime = undefined;
          sentinelSeekTime = undefined;
          clearSentinels();
          destroyMediaElement();
          readyToPlayFrom = false;
        }

        function destroyMediaElement () {
          if (mediaElement) {
            mediaElement.removeEventListener('canplay', onFinishedBuffering, false);
            mediaElement.removeEventListener('seeked', onFinishedBuffering, false);
            mediaElement.removeEventListener('playing', onFinishedBuffering, false);
            mediaElement.removeEventListener('error', onError, false);
            mediaElement.removeEventListener('ended', onEndOfMedia, false);
            mediaElement.removeEventListener('waiting', onDeviceBuffering, false);
            mediaElement.removeEventListener('timeupdate', onStatus, false);
            mediaElement.removeEventListener('loadedmetadata', onMetadata, false);
            mediaElement.removeEventListener('pause', onPause, false);
            sourceElement.removeEventListener('error', onSourceError, false);

            removeElement(sourceElement);
            unloadMediaSrc();
            removeElement(mediaElement);

            // TODO: Still needed?
            // delete mediaElement;
            // delete this._sourceElement;
          }
        }

        function unloadMediaSrc () {
          // Reset source as advised by HTML5 video spec, section 4.8.10.15:
          // http://www.w3.org/TR/2011/WD-html5-20110405/video.html#best-practices-for-authors-using-media-elements
          mediaElement.removeAttribute('src');
          mediaElement.load();
        }

        return {
          addEventCallback: function (newCallback) {
            eventCallback = function (event) {
              newCallback.call(event);
            };
          },

          removeAllEventCallbacks: function () {
            eventCallback = undefined;
          },

          initialiseMedia: function (type, url, mediaMimeType, sourceContainer, opts) {
            opts = opts || {};
            if (getState() === MediaPlayerBase.STATE.EMPTY) {
              var idSuffix = 'Video';
              if (mediaType === MediaPlayerBase.TYPE.AUDIO || mediaType === MediaPlayerBase.TYPE.LIVE_AUDIO) {
                idSuffix = 'Audio';
              }

              setSeekSentinelTolerance();

              disableSentinels = opts.disableSentinels;
              mediaType = type;
              source = url;
              mimeType = mediaMimeType;

              mediaElement = document.createElement(idSuffix.toLowerCase(), 'mediaPlayer' + idSuffix);
              mediaElement.autoplay = false;
              mediaElement.style.position = 'absolute';
              mediaElement.style.top = '0px';
              mediaElement.style.left = '0px';
              mediaElement.style.width = '100%';
              mediaElement.style.height = '100%';

              mediaElement.addEventListener('canplay', onFinishedBuffering, false);
              mediaElement.addEventListener('seeked', onFinishedBuffering, false);
              mediaElement.addEventListener('playing', onFinishedBuffering, false);
              mediaElement.addEventListener('error', onError, false);
              mediaElement.addEventListener('ended', onEndOfMedia, false);
              mediaElement.addEventListener('waiting', onDeviceBuffering, false);
              mediaElement.addEventListener('timeupdate', onStatus, false);
              mediaElement.addEventListener('loadedmetadata', onMetadata, false);
              mediaElement.addEventListener('pause', onPause, false);

              prependChildElement(sourceContainer, mediaElement);

              sourceElement = generateSourceElement(url, mimeType);
              sourceElement.addEventListener('error', onSourceError, false);

              mediaElement.preload = 'auto';
              appendChildElement(mediaElement, sourceElement);

              mediaElement.load();

              toStopped();
            } else {
              toError('Cannot set source unless in the \'' + MediaPlayerBase.STATE.EMPTY + '\' state');
            }
          },

          playFrom: function (seconds) {
            postBufferingState = MediaPlayerBase.STATE.PLAYING;
            targetSeekTime = seconds;
            sentinelLimits.seek.currentAttemptCount = 0;

            switch (getState()) {
              case MediaPlayerBase.STATE.PAUSED:
              case MediaPlayerBase.STATE.COMPLETE:
                trustZeroes = true;
                toBuffering();
                playFromIfReady();
                break;

              case MediaPlayerBase.STATE.BUFFERING:
                playFromIfReady();
                break;

              case MediaPlayerBase.STATE.PLAYING:
                trustZeroes = true;
                toBuffering();
                targetSeekTime = getClampedTimeForPlayFrom(seconds);
                if (isNearToCurrentTime(targetSeekTime)) {
                  targetSeekTime = undefined;
                  toPlaying();
                } else {
                  playFromIfReady();
                }
                break;

              default:
                toError('Cannot playFrom while in the \'' + getState() + '\' state');
                break;
            }
          },

          beginPlayback: function () {
            postBufferingState = MediaPlayerBase.STATE.PLAYING;
            sentinelSeekTime = undefined;
            switch (getState()) {
              case MediaPlayerBase.STATE.STOPPED:
                trustZeroes = true;
                toBuffering();
                mediaElement.play();
                break;

              default:
                toError('Cannot beginPlayback while in the \'' + getState() + '\' state');
                break;
            }
          },

          beginPlaybackFrom: function (seconds) {
            postBufferingState = MediaPlayerBase.STATE.PLAYING;
            targetSeekTime = seconds;
            sentinelLimits.seek.currentAttemptCount = 0;

            switch (this.getState()) {
              case MediaPlayerBase.STATE.STOPPED:
                trustZeroes = true;
                toBuffering();
                playFromIfReady();
                break;

              default:
                toError('Cannot beginPlaybackFrom while in the \'' + getState() + '\' state');
                break;
            }
          },

          pause: function () {
            postBufferingState = MediaPlayerBase.STATE.PAUSED;
            switch (getState()) {
              case MediaPlayerBase.STATE.PAUSED:
                break;

              case MediaPlayerBase.STATE.BUFFERING:
                sentinelLimits.pause.currentAttemptCount = 0;
                if (isReadyToPlayFrom()) {
                  // If we are not ready to playFrom, then calling pause would seek to the start of media, which we might not want.
                  pauseMediaElement();
                }
                break;

              case MediaPlayerBase.STATE.PLAYING:
                sentinelLimits.pause.currentAttemptCount = 0;
                pauseMediaElement();
                toPaused();
                break;

              default:
                toError('Cannot pause while in the \'' + getState() + '\' state');
                break;
            }
          },

          resume: function () {
            postBufferingState = MediaPlayerBase.STATE.PLAYING;
            switch (getState()) {
              case MediaPlayerBase.STATE.PLAYING:
                break;

              case MediaPlayerBase.STATE.BUFFERING:
                if (isReadyToPlayFrom()) {
                  // If we are not ready to playFrom, then calling play would seek to the start of media, which we might not want.
                  mediaElement.play();
                }
                break;

              case MediaPlayerBase.STATE.PAUSED:
                mediaElement.play();
                toPlaying();
                break;

              default:
                toError('Cannot resume while in the \'' + getState() + '\' state');
                break;
            }
          },

          stop: function () {
            switch (getState()) {
              case MediaPlayerBase.STATE.STOPPED:
                break;

              case MediaPlayerBase.STATE.BUFFERING:
              case MediaPlayerBase.STATE.PLAYING:
              case MediaPlayerBase.STATE.PAUSED:
              case MediaPlayerBase.STATE.COMPLETE:
                pauseMediaElement();
                toStopped();
                break;

              default:
                toError('Cannot stop while in the \'' + getState() + '\' state');
                break;
            }
          },

          reset: function () {
            switch (getState()) {
              case MediaPlayerBase.STATE.EMPTY:
                break;

              case MediaPlayerBase.STATE.STOPPED:
              case MediaPlayerBase.STATE.ERROR:
                toEmpty();
                break;

              default:
                toError('Cannot reset while in the \'' + getState() + '\' state');
                break;
            }
          },

          getSeekableRange: function () {
            switch (getState()) {
              case MediaPlayerBase.STATE.STOPPED:
              case MediaPlayerBase.STATE.ERROR:
                break;

              default:
                return getSeekableRange();
            }
            return undefined;
          },

          getState: function () {
            return state;
          },

          getPlayerElement: function () {
            return mediaElement;
          },

          getSource: getSource,

          getMimeType: getMimeType,

          getCurrentTime: getCurrentTime,

          getDuration: getDuration
        };
      }

      return Player;
    }
  );
