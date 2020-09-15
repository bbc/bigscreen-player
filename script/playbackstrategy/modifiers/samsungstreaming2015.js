/**
 * @preserve Copyright (c) 2017-present British Broadcasting Corporation. All rights reserved.
 * @license See https://github.com/fmtvp/tal/blob/master/LICENSE for full licence
 */

define(
  'bigscreenplayer/playbackstrategy/modifiers/samsungstreaming2015',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/debugger/debugtool'
  ],
  function (MediaPlayerBase, DebugTool) {
    'use strict';

    function Player () {
      var state = MediaPlayerBase.STATE.EMPTY;
      var currentPlayer;
      var deferSeekingTo = null;
      var nextSeekingTo = null;
      var postBufferingState = null;
      var tryingToPause = false;
      var currentTimeKnown = false;
      var updatingTime = false;
      var lastWindowRanged = false;

      var mediaType;
      var source;
      var mimeType;

      var range;
      var currentTime;

      var eventCallbacks = [];
      var eventCallback;

      var playerPlugin;
      var tvmwPlugin;
      var originalSource;

      try {
        _registerSamsungPlugins();
      } catch (ignoreErr) {
      }

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

      /**
      * @constant {Number} Time (in seconds) compared to current time within which seeking has no effect.
      * Jumping to time lower than 3s causes error in PlayFrom60 on HLS live - player jumps to previous chunk.
      * Value set to 4s to be ahead of potential wrong player jumps.
      */
      var CURRENT_TIME_TOLERANCE = 4;
      var CLAMP_OFFSET_FROM_END_OF_LIVE_RANGE = 10;
      var CLAMP_OFFSET_FROM_START_OF_RANGE = 1.1;
      var CLAMP_OFFSET_FROM_END_OF_RANGE = 1.1;
      var RANGE_UPDATE_TOLERANCE = 8;
      var RANGE_END_TOLERANCE = 100;

      function initialiseMedia (type, url, mediaMimeType) {
        if (this.getState() === MediaPlayerBase.STATE.EMPTY) {
          mediaType = type;
          source = url;
          mimeType = mediaMimeType;
          _registerEventHandlers();
          _toStopped();

          if (_isHlsMimeType()) {
            source += '|COMPONENT=HLS';
          }
          _openPlayerPlugin();

          _initPlayer(source);
        } else {
          _toError('Cannot set source unless in the \'' + MediaPlayerBase.STATE.EMPTY + '\' state');
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
            _toError('Cannot resume while in the \'' + getState() + '\' state');
            break;
        }
      }

      function playFrom (seconds) {
        postBufferingState = MediaPlayerBase.STATE.PLAYING;
        var seekingTo = range ? _getClampedTimeForPlayFrom(seconds) : seconds;

        switch (getState()) {
          case MediaPlayerBase.STATE.BUFFERING:
          // deferSeekingTo = seekingTo;
            nextSeekingTo = seekingTo;
            break;

          case MediaPlayerBase.STATE.PLAYING:
            _toBuffering();
            if (!currentTimeKnown) {
              deferSeekingTo = seekingTo;
            } else if (_isNearToCurrentTime(seekingTo)) {
              toPlaying();
            } else {
              _seekToWithFailureStateTransition(seekingTo);
            }
            break;

          case MediaPlayerBase.STATE.PAUSED:
            _toBuffering();
            if (!currentTimeKnown) {
              deferSeekingTo = seekingTo;
            } else if (_isNearToCurrentTime(seekingTo)) {
              playerPlugin.Execute('Resume');
              toPlaying();
            } else {
              _seekToWithFailureStateTransition(seekingTo);
              playerPlugin.Execute('Resume');
            }
            break;

          case MediaPlayerBase.STATE.COMPLETE:
            playerPlugin.Execute('Stop');
            _initPlayer(source);
            playerPlugin.Execute('StartPlayback', seekingTo);
            _toBuffering();
            break;

          default:
            _toError('Cannot playFrom while in the \'' + getState() + '\' state');
            break;
        }
      }

      function beginPlayback () {
        postBufferingState = MediaPlayerBase.STATE.PLAYING;
        switch (getState()) {
          case MediaPlayerBase.STATE.STOPPED:
            _toBuffering();
            playerPlugin.Execute('StartPlayback');
            break;

          default:
            _toError('Cannot beginPlayback while in the \'' + getState() + '\' state');
            break;
        }
      }

      function beginPlaybackFrom (seconds) {
        postBufferingState = MediaPlayerBase.STATE.PLAYING;
        var seekingTo = getSeekableRange() ? _getClampedTimeForPlayFrom(seconds) : seconds;

        // StartPlayback from near start of range causes spoiler defect
        if (seekingTo < CLAMP_OFFSET_FROM_START_OF_RANGE && _isLiveMedia()) {
          seekingTo = CLAMP_OFFSET_FROM_START_OF_RANGE;
        } else {
          seekingTo = parseInt(Math.floor(seekingTo), 10);
        }

        switch (getState()) {
          case MediaPlayerBase.STATE.STOPPED:
            playerPlugin.Execute('StartPlayback', seekingTo);
            _toBuffering();
            break;

          default:
            _toError('Cannot beginPlayback while in the \'' + getState() + '\' state');
            break;
        }
      }

      function pause () {
        postBufferingState = MediaPlayerBase.STATE.PAUSED;
        switch (getState()) {
          case MediaPlayerBase.STATE.BUFFERING:
          case MediaPlayerBase.STATE.PAUSED:
            break;

          case MediaPlayerBase.STATE.PLAYING:
            _tryPauseWithStateTransition();
            break;

          default:
            _toError('Cannot pause while in the \'' + getState() + '\' state');
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
            _stopPlayer();
            _toStopped();
            break;

          default:
            _toError('Cannot stop while in the \'' + getState() + '\' state');
            break;
        }
      }

      function reset () {
        switch (getState()) {
          case MediaPlayerBase.STATE.EMPTY:
            break;

          case MediaPlayerBase.STATE.STOPPED:
          case MediaPlayerBase.STATE.ERROR:
            _toEmpty();
            break;

          default:
            _toError('Cannot reset while in the \'' + getState() + '\' state');
            break;
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

      function getDuration () {
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

      function toPlaying () {
        if (_isHlsMimeType() && _isLiveMedia() && !updatingTime) {
          _updateRange();
        }
        state = MediaPlayerBase.STATE.PLAYING;
        _emitEvent(MediaPlayerBase.EVENT.PLAYING);
      }

      function toPaused () {
        state = MediaPlayerBase.STATE.PAUSED;
        _emitEvent(MediaPlayerBase.EVENT.PAUSED);
      }

      function _toStopped () {
        currentTime = 0;
        range = undefined;
        state = MediaPlayerBase.STATE.STOPPED;
        _emitEvent(MediaPlayerBase.EVENT.STOPPED);
      }

      function _toBuffering () {
        state = MediaPlayerBase.STATE.BUFFERING;
        _emitEvent(MediaPlayerBase.EVENT.BUFFERING);
      }

      function _toComplete () {
        state = MediaPlayerBase.STATE.COMPLETE;
        _emitEvent(MediaPlayerBase.EVENT.COMPLETE);
      }

      function _toEmpty () {
        _wipe();
        state = MediaPlayerBase.STATE.EMPTY;
      }

      function _toError (errorMessage) {
        _wipe();
        state = MediaPlayerBase.STATE.ERROR;
        _reportError(errorMessage);
        throw new Error('ApiError: ' + errorMessage);
      }

      function _registerSamsungPlugins () {
        playerPlugin = document.getElementById('sefPlayer');
        tvmwPlugin = document.getElementById('pluginObjectTVMW');
        originalSource = tvmwPlugin.GetSource();
        window.addEventListener('hide', function () {
          stop();
          tvmwPlugin.SetSource(originalSource);
        }, false);
      }

      function _getClampedTime (seconds) {
        var range = getSeekableRange();
        var offsetFromEnd = _getClampOffsetFromConfig();
        var nearToEnd = Math.max(range.end - offsetFromEnd, range.start);
        if (seconds < range.start) {
          return range.start;
        } else if (seconds > nearToEnd) {
          return nearToEnd;
        } else {
          return seconds;
        }
      }

      function _openPlayerPlugin () {
        if (currentPlayer !== undefined) {
          playerPlugin.Close();
        }
        playerPlugin.Open('Player', '1.010', 'Player');
        currentPlayer = PlayerEmps.Player;
      }

      function _isLiveRangeOutdated () {
        var time = Math.floor(currentTime);
        if (time % 8 === 0 && !updatingTime && lastWindowRanged !== time) {
          lastWindowRanged = time;
          return true;
        } else {
          return false;
        }
      }

      function _closePlugin () {
        playerPlugin.Close();
        currentPlayer = undefined;
      }

      function _initPlayer (source) {
        var result = playerPlugin.Execute('InitPlayer', source);

        if (result !== 1) {
          _toError('Failed to initialize video: ' + source);
        }
      }

      function _onFinishedBuffering () {
        if (getState() !== MediaPlayerBase.STATE.BUFFERING) {
          return;
        }

        if (!_isInitialBufferingFinished() && nextSeekingTo !== null) {
          deferSeekingTo = nextSeekingTo;
          nextSeekingTo = null;
        }

        if (deferSeekingTo === null) {
          if (postBufferingState === MediaPlayerBase.STATE.PAUSED) {
            _tryPauseWithStateTransition();
          } else {
            toPlaying();
          }
        }
      }

      function _onDeviceError (message) {
        _reportError(message);
      }

      function _onDeviceBuffering () {
        if (getState() === MediaPlayerBase.STATE.PLAYING) {
          _toBuffering();
        }
      }

      function _onEndOfMedia () {
        _toComplete();
      }

      function _stopPlayer () {
        playerPlugin.Execute('Stop');
        currentTimeKnown = false;
      }

      function _tryPauseWithStateTransition () {
        var success = playerPlugin.Execute('Pause');
        success = success && (success !== -1);

        if (success) {
          toPaused();
        }

        tryingToPause = !success;
      }

      function _onStatus () {
        var state = getState();
        if (state === MediaPlayerBase.STATE.PLAYING) {
          _emitEvent(MediaPlayerBase.EVENT.STATUS);
        }
      }

      function _updateRange () {
        if (_isHlsMimeType() && _isLiveMedia()) {
          var playingRange = playerPlugin.Execute('GetLiveDuration').split('|');
          range = {
            start: Math.floor(playingRange[0] / 1000),
            end: Math.floor(playingRange[1] / 1000)
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

      function _onCurrentTime (timeInMillis) {
        currentTime = timeInMillis / 1000;
        _onStatus();
        currentTimeKnown = true;

        // [optimisation] do not call player API periodically in HLS live
        // - calculate range manually when possible
        // - do not calculate range if player API was called less than RANGE_UPDATE_TOLERANCE seconds ago
        if (_isLiveMedia() && _isLiveRangeOutdated()) {
          range.start += 8;
          range.end += 8;
        }

        if (nextSeekingTo !== null) {
          deferSeekingTo = nextSeekingTo;
          nextSeekingTo = null;
        }

        if (deferSeekingTo !== null) {
          _deferredSeek();
        }

        if (tryingToPause) {
          _tryPauseWithStateTransition();
        }
      }

      function _deferredSeek () {
        var clampedTime = _getClampedTimeForPlayFrom(deferSeekingTo);
        var isNearCurrentTime = _isNearToCurrentTime(clampedTime);

        if (isNearCurrentTime) {
          toPlaying();
          deferSeekingTo = null;
        } else {
          var seekResult = _seekTo(clampedTime);
          if (seekResult) {
            deferSeekingTo = null;
          }
        }
      }

      function _getClampedTimeForPlayFrom (seconds) {
        if (_isHlsMimeType() && _isLiveMedia() && !updatingTime) {
          _updateRange();
        }
        var clampedTime = _getClampedTime(seconds);
        if (clampedTime !== seconds) {
          DebugTool.info('playFrom ' + seconds + ' clamped to ' + clampedTime + ' - seekable range is { start: ' + range.start + ', end: ' + range.end + ' }');
        }
        return clampedTime;
      }

      function _getClampOffsetFromConfig () {
        if (_isLiveMedia()) {
          return CLAMP_OFFSET_FROM_END_OF_LIVE_RANGE;
        } else {
          return CLAMP_OFFSET_FROM_END_OF_RANGE;
        }
      }

      function _registerEventHandlers () {
        playerPlugin.OnEvent = function (eventType, param1/*, param2*/) {
          if (eventType !== PlayerEventCodes.CURRENT_PLAYBACK_TIME) {
            // DebugTool.info('Received event ' + eventType + ' ' + param1);
          }

          switch (eventType) {
            case PlayerEventCodes.STREAM_INFO_READY:
              _updateRange();
              break;

            case PlayerEventCodes.CURRENT_PLAYBACK_TIME:
              if (range && _isLiveMedia()) {
                var seconds = Math.floor(param1 / 1000);
                // jump to previous current time if PTS out of range occurs
                if (seconds > range.end + RANGE_END_TOLERANCE) {
                  playFrom(currentTime);
                  break;
                  // call GetPlayingRange() on SEF emp if current time is out of range
                } else if (!_isCurrentTimeInRangeTolerance(seconds)) {
                  _updateRange();
                }
              }
              _onCurrentTime(param1);
              break;

            case PlayerEventCodes.BUFFERING_START:
            case PlayerEventCodes.BUFFERING_PROGRESS:
              _onDeviceBuffering();
              break;

            case PlayerEventCodes.BUFFERING_COMPLETE:
              // For live HLS, don't update the range more than once every 8 seconds
              if (!updatingTime) {
                _updateRange();
              }
              // [optimisation] if Stop() is not called after RENDERING_COMPLETE then player sends periodically BUFFERING_COMPLETE and RENDERING_COMPLETE
              // ignore BUFFERING_COMPLETE if player is already in COMPLETE state
              if (getState() !== MediaPlayerBase.STATE.COMPLETE) {
                _onFinishedBuffering();
              }
              break;

            case PlayerEventCodes.RENDERING_COMPLETE:
              // [optimisation] if Stop() is not called after RENDERING_COMPLETE then player sends periodically BUFFERING_COMPLETE and RENDERING_COMPLETE
              // ignore RENDERING_COMPLETE if player is already in COMPLETE state
              if (getState() !== MediaPlayerBase.STATE.COMPLETE) {
                _onEndOfMedia();
              }
              break;

            case PlayerEventCodes.CONNECTION_FAILED:
              _onDeviceError('Media element emitted OnConnectionFailed');
              break;

            case PlayerEventCodes.NETWORK_DISCONNECTED:
              _onDeviceError('Media element emitted OnNetworkDisconnected');
              break;

            case PlayerEventCodes.AUTHENTICATION_FAILED:
              _onDeviceError('Media element emitted OnAuthenticationFailed');
              break;

            case PlayerEventCodes.RENDER_ERROR:
              _onDeviceError('Media element emitted OnRenderError');
              break;

            case PlayerEventCodes.STREAM_NOT_FOUND:
              _onDeviceError('Media element emitted OnStreamNotFound');
              break;
          }
        };

        window.addEventListener('hide', _onWindowHide, false);
        window.addEventListener('unload', _onWindowHide, false);
      }

      function _onWindowHide () {
        stop();
      }

      function _unregisterEventHandlers () {
        playerPlugin.OnEvent = undefined;
        window.removeEventListener('hide', _onWindowHide, false);
        window.removeEventListener('unload', _onWindowHide, false);
      }

      function _wipe () {
        _stopPlayer();
        _closePlugin();
        _unregisterEventHandlers();
        mediaType = undefined;
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

      function _seekTo (seconds) {
        var offset = seconds - getCurrentTime();
        var success = _jump(offset);

        if (success === 1) {
          currentTime = seconds;
        }

        return success;
      }

      function _seekToWithFailureStateTransition (seconds) {
        var success = _seekTo(seconds);
        if (success !== 1) {
          toPlaying();
        }
      }

      function _jump (offsetSeconds) {
        var result;
        if (offsetSeconds > 0) {
          result = playerPlugin.Execute('JumpForward', offsetSeconds);
          return result;
        } else {
          result = playerPlugin.Execute('JumpBackward', Math.abs(offsetSeconds));
          return result;
        }
      }

      function _isHlsMimeType () {
        var mime = mimeType.toLowerCase();
        return mime === 'application/vnd.apple.mpegurl' || mime === 'application/x-mpegurl';
      }

      function _isCurrentTimeInRangeTolerance (seconds) {
        if (seconds > range.end + RANGE_UPDATE_TOLERANCE) {
          return false;
        } else if (seconds < range.start - RANGE_UPDATE_TOLERANCE) {
          return false;
        } else {
          return true;
        }
      }

      function _isInitialBufferingFinished () {
        if (currentTime === undefined || currentTime === 0) {
          return false;
        } else {
          return true;
        }
      }

      function _reportError (errorMessage) {
        DebugTool.info(errorMessage);
        _emitEvent(MediaPlayerBase.EVENT.ERROR, {'errorMessage': errorMessage});
      }

      function _isNearToCurrentTime (seconds) {
        var currentTime = getCurrentTime();
        var targetTime = _getClampedTime(seconds);
        return Math.abs(currentTime - targetTime) <= CURRENT_TIME_TOLERANCE;
      }

      function _isLiveMedia () {
        return (mediaType === MediaPlayerBase.TYPE.LIVE_VIDEO) || (mediaType === MediaPlayerBase.TYPE.LIVE_AUDIO);
      }

      function _emitEvent (eventType, eventLabels) {
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

      return {
        addEventCallback: function (thisArg, newCallback) {
          eventCallback = function (event) {
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
          eventCallbacks = [];
        },

        initialiseMedia: initialiseMedia,

        playFrom: playFrom,

        beginPlayback: beginPlayback,

        beginPlaybackFrom: beginPlaybackFrom,

        resume: resume,

        pause: pause,

        stop: stop,

        reset: reset,

        getSeekableRange: getSeekableRange,

        getState: getState,

        getPlayerElement: getPlayerElement,

        getSource: getSource,

        getMimeType: getMimeType,

        getCurrentTime: getCurrentTime,

        getDuration: getDuration,

        toPaused: toPaused,

        toPlaying: toPlaying
      };
    }

    return Player;
  }
);
