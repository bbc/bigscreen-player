/**
 * @preserve Copyright (c) 2017-present British Broadcasting Corporation. All rights reserved.
 * @license See https://github.com/fmtvp/tal/blob/master/LICENSE for full licence
 */
define(
    'bigscreenplayer/playbackstrategy/modifiers/samsungstreaming',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/debugger/debugtool'
  ],
    function (MediaPlayerBase, DebugTool) {
      'use strict';

      var PlayerEventCodes = {
        CONNECTION_FAILED: 1,
        AUTHENTICATION_FAILED: 2,
        STREAM_NOT_FOUND: 3,
        NETWORK_DISCONNECTED: 4,
        NETWORK_SLOW: 5,
        RENDER_ERROR: 6,
        RENDERING_START: 7,
        RENDERING_COMPLETE: 8,
        STREAM_INFO_READY: 9,
        DECODING_COMPLETE: 10,
        BUFFERING_START: 11,
        BUFFERING_COMPLETE: 12,
        BUFFERING_PROGRESS: 13,
        CURRENT_PLAYBACK_TIME: 14,
        AD_START: 15,
        AD_END: 16,
        RESOLUTION_CHANGED: 17,
        BITRATE_CHANGED: 18,
        SUBTITLE: 19,
        CUSTOM: 20
      };

      var PlayerEmps = {
        Player: 0,
        StreamingPlayer: 1
      };

      var CLAMP_OFFSET_FROM_END_OF_LIVE_RANGE = 10;
      var CLAMP_OFFSET_FROM_START_OF_RANGE = 1.1;
      var RANGE_UPDATE_TOLERANCE = 8;
      var RANGE_END_TOLERANCE = 100;
      var CLAMP_OFFSET_FROM_END_OF_RANGE = 1.1;

      var mediaType;
      var source;
      var mimeType;
      var range = {
        start: undefined,
        end: undefined
      };

      var eventCallback;
      var eventCallbacks = [];

      var currentTime;

      var state = MediaPlayerBase.STATE.EMPTY;
      var currentPlayer;
      var deferSeekingTo = null;
      var nextSeekingTo = null;
      var postBufferingState = null;
      var tryingToPause = false;
      var currentTimeKnown = false;
      var updatingTime = false;
      var lastWindowRanged = false;

      var playerPlugin;
      var tvmwPlugin;
      var originalSource;

      function registerSamsungPlugins () {
        playerPlugin = document.getElementById('sefPlayer');

        tvmwPlugin = document.getElementById('pluginObjectTVMW');

        originalSource = tvmwPlugin.GetSource();
        window.addEventListener('hide', function () {
          stop();
          tvmwPlugin.SetSource(originalSource);
        }, false);
      }

      try {
        registerSamsungPlugins();
      } catch (ignoreErr) {

      }

      return function (deviceConfig) {
        function addEventCallback (thisArg, newCallback) {
          eventCallback = function (event) {
            newCallback.call(thisArg, event);
          };
          eventCallbacks.push(eventCallback);
        }

        function removeEventCallback (callback) {
          var index = eventCallbacks.indexOf(callback);
          if (index !== -1) {
            eventCallbacks.splice(index, 1);
          }
        }

        function removeAllEventCallbacks () {
          eventCallbacks = undefined;
        }

        function initialiseMedia (type, url, mime) {
          if (getState() === MediaPlayerBase.STATE.EMPTY) {
            mediaType = type;
            source = url;
            mimeType = mime;

            registerEventHandlers();
            toStopped();

            if (isHlsMimeType()) {
              openStreamingPlayerPlugin();
              if (isLiveMedia()) {
                source += '|HLSSLIDING|COMPONENT=HLS';
              } else {
                source += '|COMPONENT=HLS';
              }
            } else {
              openPlayerPlugin();
            }

            initPlayer(source);
          } else {
            toError('Cannot set source unless in the \'' + MediaPlayerBase.STATE.EMPTY + '\' state');
          }
        }

        function openPlayerPlugin () {
          if (currentPlayer !== undefined) {
            playerPlugin.Close();
          }
          playerPlugin.Open('Player', '1.010', 'Player');
          currentPlayer = PlayerEmps.Player;
        }

        function openStreamingPlayerPlugin () {
          if (currentPlayer !== undefined) {
            playerPlugin.Close();
          }
          playerPlugin.Open('StreamingPlayer', '1.0', 'StreamingPlayer');
          currentPlayer = PlayerEmps.StreamingPlayer;
        }

        function closePlugin () {
          playerPlugin.Close();
          currentPlayer = undefined;
        }

        function initPlayer (source) {
          var result = playerPlugin.Execute('InitPlayer', source);

          if (result !== 1) {
            toError('Failed to initialize video: ' + source);
          }
        }

        function resume () {
          postBufferingState = MediaPlayerBase.STATE.PLAYING;
          switch (getState()) {
            case MediaPlayerBase.STATE.PLAYING:
              break;

            case MediaPlayerBase.STATE.BUFFERING:
              if (tryingToPause) {
                tryingToPause = false;
                toPlaying();
              }
              break;

            case MediaPlayerBase.STATE.PAUSED:
              playerPlugin.Execute('Resume');

              toPlaying();
              break;

            default:
              toError('Cannot resume while in the \'' + getState() + '\' state');
              break;
          }
        }
        function playFrom (seconds) {
          postBufferingState = MediaPlayerBase.STATE.PLAYING;
          var seekingTo = range ? getClampedTimeForPlayFrom(seconds) : seconds;

          switch (getState()) {
            case MediaPlayerBase.STATE.BUFFERING:
  //                        deferSeekingTo = seekingTo;
              nextSeekingTo = seekingTo;
              break;

            case MediaPlayerBase.STATE.PLAYING:
              toBuffering();
              if (!currentTimeKnown) {
                deferSeekingTo = seekingTo;
              } else if (isNearToCurrentTime(seekingTo)) {
                toPlaying();
              } else {
                seekToWithFailureStateTransition(seekingTo);
              }
              break;

            case MediaPlayerBase.STATE.PAUSED:
              toBuffering();
              if (!currentTimeKnown) {
                deferSeekingTo = seekingTo;
              } else if (isNearToCurrentTime(seekingTo)) {
                playerPlugin.Execute('Resume');
                toPlaying();
              } else {
                seekToWithFailureStateTransition(seekingTo);
                playerPlugin.Execute('Resume');
              }
              break;

            case MediaPlayerBase.STATE.COMPLETE:
              playerPlugin.Execute('Stop');
              initPlayer(source);
              playerPlugin.Execute('StartPlayback', seekingTo);
              toBuffering();
              break;

            default:
              toError('Cannot playFrom while in the \'' + getState() + '\' state');
              break;
          }
        }
        function beginPlayback () {
          postBufferingState = MediaPlayerBase.STATE.PLAYING;
          switch (getState()) {
            case MediaPlayerBase.STATE.STOPPED:
              toBuffering();
              playerPlugin.Execute('StartPlayback');
              break;

            default:
              toError('Cannot beginPlayback while in the \'' + getState() + '\' state');
              break;
          }
        }
        function beginPlaybackFrom (seconds) {
          postBufferingState = MediaPlayerBase.STATE.PLAYING;
          var seekingTo = getSeekableRange() ? getClampedTimeForPlayFrom(seconds) : seconds;

          // StartPlayback from near start of range causes spoiler defect
          if (seekingTo < CLAMP_OFFSET_FROM_START_OF_RANGE && isLiveMedia()) {
            seekingTo = CLAMP_OFFSET_FROM_START_OF_RANGE;
          } else {
            seekingTo = parseInt(Math.floor(seekingTo), 10);
          }

          switch (getState()) {
            case MediaPlayerBase.STATE.STOPPED:
              playerPlugin.Execute('StartPlayback', seekingTo);

              toBuffering();
              break;

            default:
              toError('Cannot beginPlayback while in the \'' + getState() + '\' state');
              break;
          }
        }
        function isNearToCurrentTime (seconds) {
          var currentTime = getCurrentTime();
          var targetTime = getClampedTime(seconds);
          return Math.abs(currentTime - targetTime) <= this.CURRENT_TIME_TOLERANCE;
        }
        function pause () {
          postBufferingState = MediaPlayerBase.STATE.PAUSED;
          switch (getState()) {
            case MediaPlayerBase.STATE.BUFFERING:
            case MediaPlayerBase.STATE.PAUSED:
              break;

            case MediaPlayerBase.STATE.PLAYING:
              tryPauseWithStateTransition();
              break;

            default:
              toError('Cannot pause while in the \'' + getState() + '\' state');
              break;
          }
        }
        function stop () {
          switch (getState()) {
            case MediaPlayerBase.STATE.STOPPED:
              break;

            case MediaPlayerBase.STATE.BUFFERING:
            case MediaPlayerBase.STATE.PLAYING:
            case MediaPlayerBase.STATE.PAUSED:
            case MediaPlayerBase.STATE.COMPLETE:
              stopPlayer();
              toStopped();
              break;

            default:
              toError('Cannot stop while in the \'' + getState() + '\' state');
              break;
          }
        }

        function reset () {
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
        }

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

          for (var index = 0; index < eventCallbacks.length; index++) {
            eventCallbacks[index](event);
          }
        }

        function getSource () {
          return source;
        }

        function getMimeType () {
          return mimeType;
        }
        function getCurrentTime () {
          if (getState() === MediaPlayerBase.STATE.STOPPED) {
            return undefined;
          } else {
            return currentTime;
          }
        }

        function getDuration () {
          switch (this.getState()) {
            case MediaPlayerBase.STATE.STOPPED:
            case MediaPlayerBase.STATE.STATE.ERROR:
              return undefined;
            default :
              if (isLiveMedia()) {
                return Infinity;
              }
              return getMediaDuration();
          }
        }

        function getSeekableRange () {
          switch (getState()) {
            case MediaPlayerBase.STATE.STOPPED:
            case MediaPlayerBase.STATE.ERROR:
              break;

            default:
              return range;
          }
          return undefined;
        }

        function isLiveRangeOutdated () {
          var time = Math.floor(currentTime);
          if (time % 8 === 0 && !updatingTime && lastWindowRanged !== time) {
            lastWindowRanged = time;
            return true;
          } else {
            return false;
          }
        }
        function getMediaDuration () {
          if (range) {
            return range.end;
          }
          return undefined;
        }

        function getState () {
          return state;
        }

        function getPlayerElement () {
          return playerPlugin;
        }

        function isLiveMedia () {
          return (mediaType === MediaPlayerBase.TYPE.LIVE_VIDEO) || (mediaType === MediaPlayerBase.TYPE.LIVE_AUDIO);
        }

        function onFinishedBuffering () {
          if (getState() !== MediaPlayerBase.STATE.BUFFERING) {
            return;
          }

          if (!isInitialBufferingFinished() && nextSeekingTo !== null) {
            deferSeekingTo = nextSeekingTo;
            nextSeekingTo = null;
          }

          if (deferSeekingTo === null) {
            if (postBufferingState === MediaPlayerBase.STATE.PAUSED) {
              tryPauseWithStateTransition();
            } else {
              toPlaying();
            }
          }
        }

        function onDeviceError (message) {
          reportError(message);
        }

        function onDeviceBuffering () {
          if (getState() === MediaPlayerBase.STATE.PLAYING) {
            toBuffering();
          }
        }

        function onEndOfMedia () {
          toComplete();
        }

        function stopPlayer () {
          playerPlugin.Execute('Stop');

          currentTimeKnown = false;
        }

        function tryPauseWithStateTransition () {
          var success = playerPlugin.Execute('Pause');
          success = success && (success !== -1);

          if (success) {
            toPaused();
          }

          tryingToPause = !success;
        }

        function onStatus () {
          var state = getState();
          if (state === MediaPlayerBase.STATE.PLAYING) {
            emitEvent(MediaPlayerBase.EVENT.STATUS);
          }
        }

        function updateRange () {
          if (isHlsMimeType() && isLiveMedia()) {
            var playingRange = playerPlugin.Execute('GetPlayingRange').split('-');
            range = {
              start: Math.floor(playingRange[0]),
              end: Math.floor(playingRange[1])
            };
            // don't call range for the next 8 seconds
            updatingTime = true;
            setTimeout(function () {
              updatingTime = false;
            }, RANGE_UPDATE_TOLERANCE * 1000);
          } else {
            var duration = playerPlugin.Execute('GetDuration') / 1000;
            range = {
              start: 0,
              end: duration
            };
          }
        }
        function onCurrentTime (timeInMillis) {
          currentTime = timeInMillis / 1000;
          onStatus();
          currentTimeKnown = true;

          // [optimisation] do not call player API periodically in HLS live
          // - calculate range manually when possible
          // - do not calculate range if player API was called less than RANGE_UPDATE_TOLERANCE seconds ago
          if (isLiveMedia() && isLiveRangeOutdated()) {
            range.start += 8;
            range.end += 8;
          }

          if (nextSeekingTo !== null) {
            deferSeekingTo = nextSeekingTo;
            nextSeekingTo = null;
          }

          if (deferSeekingTo !== null) {
            deferredSeek();
          }

          if (tryingToPause) {
            tryPauseWithStateTransition();
          }
        }

        function deferredSeek () {
          var clampedTime = getClampedTimeForPlayFrom(deferSeekingTo);
          var isNearCurrentTime = isNearToCurrentTime(clampedTime);

          if (isNearCurrentTime) {
            toPlaying();
            deferSeekingTo = null;
          } else {
            var seekResult = seekTo(clampedTime);
            if (seekResult) {
              deferSeekingTo = null;
            }
          }
        }

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

        function getClampedTimeForPlayFrom (seconds) {
          if (currentPlayer === PlayerEmps.StreamingPlayer && !updatingTime) {
            updateRange();
          }
          var clampedTime = getClampedTime(seconds);
          if (clampedTime !== seconds) {
            DebugTool.info('playFrom ' + seconds + ' clamped to ' + clampedTime + ' - seekable range is { start: ' + range.start + ', end: ' + range.end + ' }');
          }
          return clampedTime;
        }

        function getClampOffsetFromConfig () {
          var clampOffsetFromEndOfRange;
          if (deviceConfig && deviceConfig.streaming && deviceConfig.streaming.overrides) {
            clampOffsetFromEndOfRange = deviceConfig.streaming.overrides.clampOffsetFromEndOfRange;
          }

          if (clampOffsetFromEndOfRange !== undefined) {
            return clampOffsetFromEndOfRange;
          } else if (isLiveMedia()) {
            return CLAMP_OFFSET_FROM_END_OF_LIVE_RANGE;
          } else {
            return CLAMP_OFFSET_FROM_END_OF_RANGE;
          }
        }
        function registerEventHandlers () {
          playerPlugin.OnEvent = function (eventType, param1/*, param2*/) {
            if (eventType !== PlayerEventCodes.CURRENT_PLAYBACK_TIME) {
              DebugTool.info('Received event ' + eventType + ' ' + param1);
            }

            switch (eventType) {

              case PlayerEventCodes.STREAM_INFO_READY:
                updateRange();
                break;

              case PlayerEventCodes.CURRENT_PLAYBACK_TIME:
                if (range && isLiveMedia()) {
                  var seconds = Math.floor(param1 / 1000);
                  // jump to previous current time if PTS out of range occurs
                  if (seconds > range.end + RANGE_END_TOLERANCE) {
                    playFrom(currentTime);
                    break;
                  // call GetPlayingRange() on SEF emp if current time is out of range
                  } else if (!isCurrentTimeInRangeTolerance(seconds)) {
                    updateRange();
                  }
                }
                onCurrentTime(param1);
                break;

              case PlayerEventCodes.BUFFERING_START:
              case PlayerEventCodes.BUFFERING_PROGRESS:
                onDeviceBuffering();
                break;

              case PlayerEventCodes.BUFFERING_COMPLETE:
                // For live HLS, don't update the range more than once every 8 seconds
                if (!updatingTime) {
                  updateRange();
                }
                // [optimisation] if Stop() is not called after RENDERING_COMPLETE then player sends periodically BUFFERING_COMPLETE and RENDERING_COMPLETE
                // ignore BUFFERING_COMPLETE if player is already in COMPLETE state
                if (getState() !== MediaPlayerBase.STATE.COMPLETE) {
                  onFinishedBuffering();
                }
                break;

              case PlayerEventCodes.RENDERING_COMPLETE:
                // [optimisation] if Stop() is not called after RENDERING_COMPLETE then player sends periodically BUFFERING_COMPLETE and RENDERING_COMPLETE
                // ignore RENDERING_COMPLETE if player is already in COMPLETE state
                if (getState() !== MediaPlayerBase.STATE.COMPLETE) {
                  onEndOfMedia();
                }
                break;

              case PlayerEventCodes.CONNECTION_FAILED:
                onDeviceError('Media element emitted OnConnectionFailed');
                break;

              case PlayerEventCodes.NETWORK_DISCONNECTED:
                onDeviceError('Media element emitted OnNetworkDisconnected');
                break;

              case PlayerEventCodes.AUTHENTICATION_FAILED:
                onDeviceError('Media element emitted OnAuthenticationFailed');
                break;

              case PlayerEventCodes.RENDER_ERROR:
                onDeviceError('Media element emitted OnRenderError');
                break;

              case PlayerEventCodes.STREAM_NOT_FOUND:
                onDeviceError('Media element emitted OnStreamNotFound');
                break;
            }
          };

          window.addEventListener('hide', onWindowHide, false);
          window.addEventListener('unload', onWindowHide, false);
        }

        function onWindowHide () {
          stop();
        }

        function unregisterEventHandlers () {
          playerPlugin.OnEvent = undefined;
          window.removeEventListener('hide', onWindowHide, false);
          window.removeEventListener('unload', onWindowHide, false);
        }

        function wipe () {
          stopPlayer();
          closePlugin();
          unregisterEventHandlers();
          // type = undefined;
          source = undefined;
          mimeType = undefined;
          currentTime = undefined;
          range = undefined;
          deferSeekingTo = null;
          nextSeekingTo = null;
          tryingToPause = false;
          currentTimeKnown = false;
          updatingTime = false;
          lastWindowRanged = false;
        }

        function seekTo (seconds) {
          var offset = seconds - getCurrentTime();
          var success = jump(offset);

          if (success === 1) {
            currentTime = seconds;
          }

          return success;
        }

        function seekToWithFailureStateTransition (seconds) {
          var success = seekTo(seconds);
          if (success !== 1) {
            toPlaying();
          }
        }

        function jump (offsetSeconds) {
          var result;
          if (offsetSeconds > 0) {
            result = playerPlugin.Execute('JumpForward', offsetSeconds);
            return result;
          } else {
            result = playerPlugin.Execute('JumpBackward', Math.abs(offsetSeconds));
            return result;
          }
        }

        function isHlsMimeType () {
          var mime = mimeType.toLowerCase();
          return mime === 'application/vnd.apple.mpegurl' || mime === 'application/x-mpegurl';
        }

        function isCurrentTimeInRangeTolerance (seconds) {
          if (seconds > range.end + RANGE_UPDATE_TOLERANCE) {
            return false;
          } else if (seconds < range.start - RANGE_UPDATE_TOLERANCE) {
            return false;
          } else {
            return true;
          }
        }

        function isInitialBufferingFinished () {
          if (currentTime === undefined || currentTime === 0) {
            return false;
          } else {
            return true;
          }
        }

        function reportError (errorMessage) {
          DebugTool.error('Error message from Samsung stream');
          emitEvent(MediaPlayerBase.EVENT.ERROR, {'errorMessage': errorMessage});
        }

        function toStopped () {
          currentTime = 0;
          range = undefined;
          state = MediaPlayerBase.STATE.STOPPED;
          emitEvent(MediaPlayerBase.EVENT.STOPPED);
        }

        function toBuffering () {
          state = MediaPlayerBase.STATE.BUFFERING;
          emitEvent(MediaPlayerBase.EVENT.BUFFERING);
        }

        function toPlaying () {
          if (isHlsMimeType() && isLiveMedia() && !updatingTime) {
            updateRange();
          }
          state = MediaPlayerBase.STATE.PLAYING;
          emitEvent(MediaPlayerBase.EVENT.PLAYING);
        }

        function toPaused () {
          state = MediaPlayerBase.STATE.PAUSED;
          emitEvent(MediaPlayerBase.EVENT.PAUSED);
        }

        function toComplete () {
          state = MediaPlayerBase.STATE.COMPLETE;
          emitEvent(MediaPlayerBase.EVENT.COMPLETE);
        }

        function toEmpty () {
          wipe();
          state = MediaPlayerBase.STATE.EMPTY;
        }

        function toError (errorMessage) {
          wipe();
          state = MediaPlayerBase.STATE.ERROR;
          // DebugTool.info('*****HERE***** toError: errorMessage = ' + errorMessage);
          reportError(errorMessage);
          throw new Error('ApiError: ' + errorMessage);
        }

        return {
          addEventCallback: addEventCallback,
          removeEventCallback: removeEventCallback,
          removeAllEventCallbacks: removeAllEventCallbacks,
          initialiseMedia: initialiseMedia,
          resume: resume,
          playFrom: playFrom,
          beginPlayback: beginPlayback,
          beginPlaybackFrom: beginPlaybackFrom,
          pause: pause,
          stop: stop,
          reset: reset,
          getSource: getSource,
          getMimeType: getMimeType,
          getCurrentTime: getCurrentTime,
          getSeekableRange: getSeekableRange,
          getState: getState,
          getPlayerElement: getPlayerElement
        };
      };
    }
);
