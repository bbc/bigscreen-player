define(
  'bigscreenplayer/playbackstrategy/modifiers/samsungmaple',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/debugger/debugtool'
  ],
  function (MediaPlayerBase, DebugTool) {
    'use strict';

    function Player () {
      var state = MediaPlayerBase.STATE.EMPTY;
      var playerPlugin = document.getElementById('playerPlugin');
      var deferSeekingTo = null;
      var postBufferingState = null;
      var tryingToPause = false;
      var currentTimeKnown = false;

      var mediaType;
      var source;
      var mimeType;

      var range;
      var currentTime;

      var eventCallbacks = [];
      var eventCallback;

      function initialiseMedia (type, url, mediaMimeType) {
        if (getState() === MediaPlayerBase.STATE.EMPTY) {
          mediaType = type;
          source = url;
          mimeType = mediaMimeType;
          _registerEventHandlers();
          _toStopped();
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
            playerPlugin.Resume();
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
            deferSeekingTo = seekingTo;
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
              playerPlugin.Resume();
              toPlaying();
            } else {
              _seekToWithFailureStateTransition(seekingTo);
              playerPlugin.Resume();
            }
            break;

          case MediaPlayerBase.STATE.COMPLETE:
            playerPlugin.Stop();
            _setDisplayFullScreenForVideo();
            playerPlugin.ResumePlay(_wrappedSource(), seekingTo);
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
            _setDisplayFullScreenForVideo();
            playerPlugin.Play(_wrappedSource());
            break;

          default:
            _toError('Cannot beginPlayback while in the \'' + getState() + '\' state');
            break;
        }
      }

      function beginPlaybackFrom (seconds) {
        postBufferingState = MediaPlayerBase.STATE.PLAYING;
        var seekingTo = range ? _getClampedTimeForPlayFrom(seconds) : seconds;

        switch (getState()) {
          case MediaPlayerBase.STATE.STOPPED:
            _setDisplayFullScreenForVideo();
            playerPlugin.ResumePlay(_wrappedSource(), seekingTo);
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
        return range;
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

      function _onFinishedBuffering () {
        if (getState() !== MediaPlayerBase.STATE.BUFFERING) {
          return;
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
        playerPlugin.Stop();
        currentTimeKnown = false;
      }

      function _tryPauseWithStateTransition () {
        var success = _isSuccessCode(playerPlugin.Pause());
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

      function _onMetadata () {
        range = {
          start: 0,
          end: playerPlugin.GetDuration() / 1000
        };
      }

      function _onCurrentTime (timeInMillis) {
        currentTime = timeInMillis / 1000;
        _onStatus();
        currentTimeKnown = true;

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
        var clampedTime = getClampedTime(seconds);
        if (clampedTime !== seconds) {
          DebugTool.info('playFrom ' + seconds + ' clamped to ' + clampedTime + ' - seekable range is { start: ' + range.start + ', end: ' + range.end + ' }');
        }
        return clampedTime;
      }

      function _onWindowHide () {
        stop();
      }

      function _registerEventHandlers () {
        window.SamsungMapleOnRenderError = function () {
          _onDeviceError('Media element emitted OnRenderError');
        };
        playerPlugin.OnRenderError = 'SamsungMapleOnRenderError';

        window.SamsungMapleOnConnectionFailed = function () {
          _onDeviceError('Media element emitted OnConnectionFailed');
        };
        playerPlugin.OnConnectionFailed = 'SamsungMapleOnConnectionFailed';

        window.SamsungMapleOnNetworkDisconnected = function () {
          _onDeviceError('Media element emitted OnNetworkDisconnected');
        };
        playerPlugin.OnNetworkDisconnected = 'SamsungMapleOnNetworkDisconnected';

        window.SamsungMapleOnStreamNotFound = function () {
          _onDeviceError('Media element emitted OnStreamNotFound');
        };
        playerPlugin.OnStreamNotFound = 'SamsungMapleOnStreamNotFound';

        window.SamsungMapleOnAuthenticationFailed = function () {
          _onDeviceError('Media element emitted OnAuthenticationFailed');
        };
        playerPlugin.OnAuthenticationFailed = 'SamsungMapleOnAuthenticationFailed';

        window.SamsungMapleOnRenderingComplete = function () {
          _onEndOfMedia();
        };
        playerPlugin.OnRenderingComplete = 'SamsungMapleOnRenderingComplete';

        window.SamsungMapleOnBufferingStart = function () {
          _onDeviceBuffering();
        };
        playerPlugin.OnBufferingStart = 'SamsungMapleOnBufferingStart';

        window.SamsungMapleOnBufferingComplete = function () {
          _onFinishedBuffering();
        };
        playerPlugin.OnBufferingComplete = 'SamsungMapleOnBufferingComplete';

        window.SamsungMapleOnStreamInfoReady = function () {
          _onMetadata();
        };
        playerPlugin.OnStreamInfoReady = 'SamsungMapleOnStreamInfoReady';

        window.SamsungMapleOnCurrentPlayTime = function (timeInMillis) {
          _onCurrentTime(timeInMillis);
        };
        playerPlugin.OnCurrentPlayTime = 'SamsungMapleOnCurrentPlayTime';

        window.addEventListener('hide', _onWindowHide, false);
        window.addEventListener('unload', _onWindowHide, false);
      }

      function _unregisterEventHandlers () {
        var eventHandlers = [
          'SamsungMapleOnRenderError',
          'SamsungMapleOnRenderingComplete',
          'SamsungMapleOnBufferingStart',
          'SamsungMapleOnBufferingComplete',
          'SamsungMapleOnStreamInfoReady',
          'SamsungMapleOnCurrentPlayTime',
          'SamsungMapleOnConnectionFailed',
          'SamsungMapleOnNetworkDisconnected',
          'SamsungMapleOnStreamNotFound',
          'SamsungMapleOnAuthenticationFailed'
        ];

        for (var i = 0; i < eventHandlers.length; i++) {
          var handler = eventHandlers[i];
          var hook = handler.substring('SamsungMaple'.length);
          playerPlugin[hook] = undefined;

          delete window[handler];
        }

        window.removeEventListener('hide', _onWindowHide, false);
        window.removeEventListener('unload', _onWindowHide, false);
      }

      function _wipe () {
        _stopPlayer();
        mediaType = undefined;
        source = undefined;
        mimeType = undefined;
        currentTime = undefined;
        range = undefined;
        deferSeekingTo = null;
        tryingToPause = false;
        currentTimeKnown = false;
        _unregisterEventHandlers();
      }

      function _seekTo (seconds) {
        var offset = seconds - getCurrentTime();
        var success = _isSuccessCode(_jump(offset));

        if (success) {
          currentTime = seconds;
        }

        return success;
      }

      function _seekToWithFailureStateTransition (seconds) {
        var success = _seekTo(seconds);
        if (!success) {
          toPlaying();
        }
      }

      function _jump (offsetSeconds) {
        if (offsetSeconds > 0) {
          return playerPlugin.JumpForward(offsetSeconds);
        } else {
          return playerPlugin.JumpBackward(Math.abs(offsetSeconds));
        }
      }

      function _isHlsMimeType () {
        var mime = mimeType.toLowerCase();
        return mime === 'application/vnd.apple.mpegurl' || mime === 'application/x-mpegurl';
      }

      function _wrappedSource () {
        var wrappedSource = source;
        if (_isHlsMimeType()) {
          wrappedSource += '|COMPONENT=HLS';
        }
        return wrappedSource;
      }

      function _reportError (errorMessage) {
        DebugTool.info(errorMessage);
        _emitEvent(MediaPlayerBase.EVENT.ERROR, {'errorMessage': errorMessage});
      }

      function _setDisplayFullScreenForVideo () {
        if (mediaType === MediaPlayerBase.TYPE.VIDEO) {
          var dimensions = _getScreenSize();
          playerPlugin.SetDisplayArea(0, 0, dimensions.width, dimensions.height);
        }
      }

      function _getScreenSize () {
        var w, h;
        if (typeof (window.innerWidth) === 'number') {
          w = window.innerWidth;
          h = window.innerHeight;
        } else {
          var d = document.documentElement || document.body;
          h = d.clientHeight || d.offsetHeight;
          w = d.clientWidth || d.offsetWidth;
        }
        return {
          width: w,
          height: h
        };
      }

      function _isSuccessCode (code) {
        var samsung2010ErrorCode = -1;
        return code && code !== samsung2010ErrorCode;
      }

      /**
       * @constant {Number} Time (in seconds) compared to current time within which seeking has no effect.
       * On a sample device (Samsung FoxP 2013), seeking by two seconds worked 90% of the time, but seeking
       * by 2.5 seconds was always seen to work.
       */
      var CURRENT_TIME_TOLERANCE = 2.5;

      function _isNearToCurrentTime (seconds) {
        var currentTime = getCurrentTime();
        var targetTime = getClampedTime(seconds);
        return Math.abs(currentTime - targetTime) <= CURRENT_TIME_TOLERANCE;
      }

      function getClampedTime (seconds) {
        var range = getSeekableRange();
        var CLAMP_OFFSET_FROM_END_OF_RANGE = 1.1;
        var nearToEnd = Math.max(range.end - CLAMP_OFFSET_FROM_END_OF_RANGE, range.start);
        if (seconds < range.start) {
          return range.start;
        } else if (seconds > nearToEnd) {
          return nearToEnd;
        } else {
          return seconds;
        }
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
  });

