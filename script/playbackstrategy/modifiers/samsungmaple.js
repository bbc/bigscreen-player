/**
 * @fileOverview Requirejs module containing device modifier for media playback on Samsung devices.
 * @preserve Copyright (c) 2013-present British Broadcasting Corporation. All rights reserved.
 * @license See https://github.com/bbc/tal/blob/master/LICENSE for full licence
 */

define(
  'bigscreenplayer/playbackstrategy/modifiers/samsungmaple',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/debugger/debugtool'
  ],
  function (MediaPlayer, DebugTool) {
    'use strict';

    function Player () {
      var state = MediaPlayer.STATE.EMPTY;
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

      function initialiseMedia (type, url, mediaMimeType) {
        if (getState() === MediaPlayer.STATE.EMPTY) {
          mediaType = type;
          source = url;
          mimeType = mediaMimeType;
          _registerEventHandlers();
          _toStopped();
        } else {
          _toError('Cannot set source unless in the \'' + MediaPlayer.STATE.EMPTY + '\' state');
        }
      }

      function resume () {
        postBufferingState = MediaPlayer.STATE.PLAYING;
        switch (getState()) {
          case MediaPlayer.STATE.PLAYING:
            break;

          case MediaPlayer.STATE.BUFFERING:
            if (tryingToPause) {
              tryingToPause = false;
              _toPlaying();
            }
            break;

          case MediaPlayer.STATE.PAUSED:
            playerPlugin.Resume();
            _toPlaying();
            break;

          default:
            _toError('Cannot resume while in the \'' + getState() + '\' state');
            break;
        }
      }

      function playFrom (seconds) {
        postBufferingState = MediaPlayer.STATE.PLAYING;
        var seekingTo = range ? _getClampedTimeForPlayFrom(seconds) : seconds;

        switch (getState()) {
          case MediaPlayer.STATE.BUFFERING:
            deferSeekingTo = seekingTo;
            break;

          case MediaPlayer.STATE.PLAYING:
            _toBuffering();
            if (!currentTimeKnown) {
              deferSeekingTo = seekingTo;
            } else if (this._isNearToCurrentTime(seekingTo)) {
              _toPlaying();
            } else {
              _seekToWithFailureStateTransition(seekingTo);
            }
            break;

          case MediaPlayer.STATE.PAUSED:
            _toBuffering();
            if (!currentTimeKnown) {
              deferSeekingTo = seekingTo;
            } else if (this._isNearToCurrentTime(seekingTo)) {
              playerPlugin.Resume();
              _toPlaying();
            } else {
              _seekToWithFailureStateTransition(seekingTo);
              playerPlugin.Resume();
            }
            break;

          case MediaPlayer.STATE.COMPLETE:
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
        postBufferingState = MediaPlayer.STATE.PLAYING;
        switch (getState()) {
          case MediaPlayer.STATE.STOPPED:
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
        postBufferingState = MediaPlayer.STATE.PLAYING;
        var seekingTo = range ? _getClampedTimeForPlayFrom(seconds) : seconds;

        switch (getState()) {
          case MediaPlayer.STATE.STOPPED:
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
        postBufferingState = MediaPlayer.STATE.PAUSED;
        switch (getState()) {
          case MediaPlayer.STATE.BUFFERING:
          case MediaPlayer.STATE.PAUSED:
            break;

          case MediaPlayer.STATE.PLAYING:
            _tryPauseWithStateTransition();
            break;

          default:
            _toError('Cannot pause while in the \'' + getState() + '\' state');
            break;
        }
      }

      function stop () {
        switch (getState()) {
          case MediaPlayer.STATE.STOPPED:
            break;

          case MediaPlayer.STATE.BUFFERING:
          case MediaPlayer.STATE.PLAYING:
          case MediaPlayer.STATE.PAUSED:
          case MediaPlayer.STATE.COMPLETE:
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
          case MediaPlayer.STATE.EMPTY:
            break;

          case MediaPlayer.STATE.STOPPED:
          case MediaPlayer.STATE.ERROR:
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
        if (getState() === MediaPlayer.STATE.STOPPED) {
          return undefined;
        } else {
          return currentTime;
        }
      }

      function getSeekableRange () {
        return range;
      }

      function _getMediaDuration () {
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

      function _onFinishedBuffering () {
        if (getState() !== MediaPlayer.STATE.BUFFERING) {
          return;
        }

        if (deferSeekingTo === null) {
          if (postBufferingState === MediaPlayer.STATE.PAUSED) {
            _tryPauseWithStateTransition();
          } else {
            _toPlaying();
          }
        }
      }

      function _onDeviceError (message) {
        _reportError(message);
      }

      function _onDeviceBuffering () {
        if (getState() === MediaPlayer.STATE.PLAYING) {
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
          _toPaused();
        }

        tryingToPause = !success;
      }

      function _onStatus () {
        var state = getState();
        if (state === MediaPlayer.STATE.PLAYING) {
          this._emitEvent(MediaPlayer.EVENT.STATUS);
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
        var isNearCurrentTime = this._isNearToCurrentTime(clampedTime);

        if (isNearCurrentTime) {
          _toPlaying();
          deferSeekingTo = null;
        } else {
          var seekResult = _seekTo(clampedTime);
          if (seekResult) {
            deferSeekingTo = null;
          }
        }
      }

      function _getClampedTimeForPlayFrom (seconds) {
        var clampedTime = this._getClampedTime(seconds);
        if (clampedTime !== seconds) {
          RuntimeContext.getDevice().getLogger().debug('playFrom ' + seconds + ' clamped to ' + clampedTime + ' - seekable range is { start: ' + range.start + ', end: ' + range.end + ' }');
        }
        return clampedTime;
      }

      function _onWindowHide () {
        stop();
      }

      function _registerEventHandlers () {
        // var self = this;

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
        var offset = seconds - this.getCurrentTime();
        var success = _isSuccessCode(_jump(offset));

        if (success) {
          currentTime = seconds;
        }

        return success;
      }

      function _seekToWithFailureStateTransition (seconds) {
        var success = _seekTo(seconds);
        if (!success) {
          _toPlaying();
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
        RuntimeContext.getDevice().getLogger().error(errorMessage);
        this._emitEvent(MediaPlayer.EVENT.ERROR, {'errorMessage': errorMessage});
      }

      function _toStopped () {
        currentTime = 0;
        range = undefined;
        state = MediaPlayer.STATE.STOPPED;
        this._emitEvent(MediaPlayer.EVENT.STOPPED);
      }

      function _toBuffering () {
        state = MediaPlayer.STATE.BUFFERING;
        this._emitEvent(MediaPlayer.EVENT.BUFFERING);
      }

      function _toPlaying () {
        state = MediaPlayer.STATE.PLAYING;
        this._emitEvent(MediaPlayer.EVENT.PLAYING);
      }

      function _toPaused () {
        state = MediaPlayer.STATE.PAUSED;
        this._emitEvent(MediaPlayer.EVENT.PAUSED);
      }

      function _toComplete () {
        state = MediaPlayer.STATE.COMPLETE;
        this._emitEvent(MediaPlayer.EVENT.COMPLETE);
      }

      function _toEmpty () {
        _wipe();
        state = MediaPlayer.STATE.EMPTY;
      }

      function _toError (errorMessage) {
        _wipe();
        state = MediaPlayer.STATE.ERROR;
        _reportError(errorMessage);
        throw 'ApiError: ' + errorMessage;
      }

      function _setDisplayFullScreenForVideo () {
        if (mimeType === MediaPlayer.TYPE.VIDEO) {
          var dimensions = RuntimeContext.getDevice().getScreenSize();
          playerPlugin.SetDisplayArea(0, 0, dimensions.width, dimensions.height);
        }
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
    }

    return Player;
  });

/**
       * Main MediaPlayer implementation for Samsung devices implementing the Maple API.
       * Use this device modifier if a device implements the Samsung Maple media playback standard.
       * It must support creation of &lt;object&gt; elements with appropriate SAMSUNG_INFOLINK classids.
       * Those objects must expose an API in accordance with the Samsung Maple media specification.
       * @name antie.devices.mediaplayer.SamsungMaple
       * @class
       * @extends antie.devices.mediaplayer.MediaPlayer
       */
//   var instance = new Player();

//   // Mixin this MediaPlayer implementation, so that device.getMediaPlayer() returns the correct implementation for the device
//   Device.prototype.getMediaPlayer = function () {
//     return instance;
//   };

//   return Player;
// }
