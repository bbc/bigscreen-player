define('bigscreenplayer/playbackstrategy/legacyplayeradapter',
  [
    'bigscreenplayer/allowedmediatransitions',
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/playbackstrategy/liveglitchcurtain'
  ],
  function (AllowedMediaTransitions, MediaState, WindowTypes, DebugTool, LiveGlitchCurtain) {
    return function (windowType, mediaKind, timeData, playbackElement, isUHD, deviceConfig, player) {
      var EVENT_HISTORY_LENGTH = 2;

      var mediaPlayer = player;
      var transitions = new AllowedMediaTransitions(mediaPlayer);
      var eventHistory = [];
      var eventCallback;
      var errorCallback;
      var timeUpdateCallback;
      var currentTime;
      var timeCorrection = timeData && timeData.correction || 0;
      var duration = 0;
      var isPaused;
      var isEnded = false;
      var hasStartTime;

      var handleErrorOnExitingSeek;
      var delayPauseOnExitSeek;

      var pauseOnExitSeek;
      var exitingSeek;
      var targetSeekToTime;

      var liveGlitchCurtain;

      var strategy = window.bigscreenPlayer && window.bigscreenPlayer.playbackStrategy;
      var config = deviceConfig;
      var setSourceOpts = {
        disableSentinels: !!isUHD && windowType !== WindowTypes.STATIC && config.streaming && config.streaming.liveUhdDisableSentinels
      };

      mediaPlayer.addEventCallback(this, eventHandler);

      strategy = strategy.match(/.+(?=strategy)/g)[0];

      function eventHandler (event) {
        var handleEvent = {
          'playing': onPlaying,
          'paused': onPaused,
          'buffering': onBuffering,
          'seek-attempted': onSeekAttempted,
          'seek-finished': onSeekFinished,
          'status': onTimeUpdate,
          'complete': onEnded,
          'error': onError
        };

        if (handleEvent.hasOwnProperty(event.type)) {
          handleEvent[event.type].call(this, event);
        } else {
          DebugTool.info(getSelection() + ' Event:' + event.type);
        }

        if (event.type !== 'status') {
          if (eventHistory.length >= EVENT_HISTORY_LENGTH) {
            eventHistory.pop();
          }
          eventHistory.unshift({type: event.type, time: new Date().getTime()});
        }
      }

      function onPlaying (event) {
        currentTime = event.currentTime - timeCorrection;
        isPaused = false;
        isEnded = false;
        duration = duration || event.duration;
        publishMediaState(MediaState.PLAYING);
      }

      function onPaused (event) {
        isPaused = true;
        publishMediaState(MediaState.PAUSED);
      }

      function onBuffering (event) {
        isEnded = false;
        publishMediaState(MediaState.WAITING);
      }

      function onTimeUpdate (event) {
        isPaused = false;
        currentTime = event.currentTime - timeCorrection;
        // Must publish this time update before checkSeekSucceded - which could cause a pause event
        // This is a device specific event ordering issue.
        publishTimeUpdate();
        if ((handleErrorOnExitingSeek || delayPauseOnExitSeek) && exitingSeek) {
          checkSeekSucceeded(event.seekableRange.start, event.currentTime);
        }
      }

      function onEnded () {
        isPaused = true;
        isEnded = true;
        publishMediaState(MediaState.ENDED);
      }

      function onError (event) {
        if (handleErrorOnExitingSeek && exitingSeek) {
          restartMediaPlayer();
        } else {
          event.errorProperties = createEventHistoryLabels();
          event.errorProperties.error_mssg = event.errorMessage;
          publishError(event);
        }
      }

      function onSeekAttempted (event) {
        showCurtain();
      }

      function onSeekFinished (event) {
        hideCurtain();
      }

      function publishMediaState (mediaState) {
        if (eventCallback) {
          eventCallback(mediaState);
        }
      }

      function publishError (errorEvent) {
        if (errorCallback) {
          errorCallback(errorEvent);
        }
      }

      function publishTimeUpdate () {
        if (timeUpdateCallback) {
          timeUpdateCallback();
        }
      }

      function getStrategy () {
        return strategy.toUpperCase();
      }

      function createEventHistoryLabels () {
        var properties = {};
        var now = new Date().getTime();
        for (var i = 0; i < eventHistory.length; i++) {
          properties['event_history_' + (i + 1)] = eventHistory[i].type;
          properties['event_history_time_' + (i + 1)] = now - eventHistory[i].time;
        }
        return properties;
      }

      function setupExitSeekWorkarounds (mimeType) {
        handleErrorOnExitingSeek = windowType !== WindowTypes.STATIC && mimeType === 'application/dash+xml';

        var capabilities = config.capabilities || [];
        var deviceFailsPlayAfterPauseOnExitSeek = capabilities.indexOf('playFailsAfterPauseOnExitSeek') !== -1;
        delayPauseOnExitSeek = handleErrorOnExitingSeek || deviceFailsPlayAfterPauseOnExitSeek;
      }

      function checkSeekSucceeded (seekableRangeStart, currentTime) {
        var SEEK_TOLERANCE = 30;

        var clampedSeekToTime = Math.max(seekableRangeStart, targetSeekToTime);
        var successfullySeeked = Math.abs(currentTime - clampedSeekToTime) < SEEK_TOLERANCE;

        if (successfullySeeked) {
          if (pauseOnExitSeek) {
          // Delay call to pause until seek has completed
          // successfully for scenarios which can error upon exiting seek.
            mediaPlayer.pause();
            pauseOnExitSeek = false;
          }
          exitingSeek = false;
        }
      }

      // Dash live streams can error on exiting seek when the start of the
      // seekable range has overtaken the point where the stream was paused
      // Workaround - reset the media player then do a fresh beginPlaybackFrom()
      function restartMediaPlayer () {
        exitingSeek = false;
        pauseOnExitSeek = false;
        var source = mediaPlayer.getSource();
        var mimeType = mediaPlayer.getMimeType();

        reset();
        mediaPlayer.initialiseMedia('video', source, mimeType, playbackElement, setSourceOpts);
        mediaPlayer.beginPlaybackFrom(currentTime + timeCorrection || 0);
      }

      function showCurtain () {
        var doNotForceBeginPlaybackToEndOfWindow = {
          forceBeginPlaybackToEndOfWindow: false
        };

        var streaming = config.streaming || {
          overrides: doNotForceBeginPlaybackToEndOfWindow
        };

        var overrides = streaming.overrides || doNotForceBeginPlaybackToEndOfWindow;

        var shouldShowCurtain = windowType !== WindowTypes.STATIC && (hasStartTime || overrides.forceBeginPlaybackToEndOfWindow);

        if (shouldShowCurtain) {
          liveGlitchCurtain = new LiveGlitchCurtain(playbackElement);
          liveGlitchCurtain.showCurtain();
        }
      }

      function hideCurtain () {
        if (liveGlitchCurtain) {
          liveGlitchCurtain.hideCurtain();
        }
      }

      function reset () {
        if (transitions.canBeStopped()) {
          mediaPlayer.stop();
        }
        mediaPlayer.reset();
      }

      return {
        transitions: transitions,
        addEventCallback: function (thisArg, newCallback) {
          eventCallback = function (event) {
            newCallback.call(thisArg, event);
          };
        },
        addErrorCallback: function (thisArg, newErrorCallback) {
          errorCallback = function (event) {
            newErrorCallback.call(thisArg, event);
          };
        },
        addTimeUpdateCallback: function (thisArg, newTimeUpdateCallback) {
          timeUpdateCallback = function () {
            newTimeUpdateCallback.call(thisArg);
          };
        },
        load: function (src, mimeType, startTime) {
          setupExitSeekWorkarounds(mimeType);
          isPaused = false;

          hasStartTime = startTime || startTime === 0;
          var isPlaybackFromLivePoint = windowType !== WindowTypes.STATIC && !hasStartTime;

          mediaPlayer.initialiseMedia('video', src, mimeType, playbackElement, setSourceOpts);
          if (mediaPlayer.beginPlaybackFrom && !isPlaybackFromLivePoint) {
            currentTime = startTime;
            mediaPlayer.beginPlaybackFrom(startTime + timeCorrection || 0);
          } else {
            mediaPlayer.beginPlayback();
          }
          DebugTool.keyValue({key: 'strategy', value: getStrategy()});
        },
        play: function () {
          isPaused = false;
          if (delayPauseOnExitSeek && exitingSeek) {
            pauseOnExitSeek = false;
          } else {
            if (isEnded) {
              mediaPlayer.playFrom(0);
            } else if (transitions.canResume()) {
              mediaPlayer.resume();
            } else {
              mediaPlayer.playFrom(currentTime + timeCorrection);
            }
          }
        },
        pause: function (options) {
          // TODO - transitions is checked in playerComponent. The check can be removed here.
          if (delayPauseOnExitSeek && exitingSeek && transitions.canBePaused()) {
            pauseOnExitSeek = true;
          } else {
            mediaPlayer.pause(options);
          }
        },
        isPaused: function () {
          return isPaused;
        },
        isEnded: function () {
          return isEnded;
        },
        getDuration: function () {
          return duration;
        },
        getPlayerElement: function () {
          return mediaPlayer.getPlayerElement && mediaPlayer.getPlayerElement();
        },
        getSeekableRange: function () {
          if (windowType === WindowTypes.STATIC) {
            return {
              start: 0,
              end: duration
            };
          } else {
            var seekableRange = mediaPlayer.getSeekableRange && mediaPlayer.getSeekableRange() || {};
            if (seekableRange.hasOwnProperty('start')) {
              seekableRange.start = seekableRange.start - timeCorrection;
            }
            if (seekableRange.hasOwnProperty('end')) {
              seekableRange.end = seekableRange.end - timeCorrection;
            }
            return seekableRange;
          }
        },
        getCurrentTime: function () {
          return currentTime;
        },
        setCurrentTime: function (seekToTime) {
          isEnded = false;
          currentTime = seekToTime;
          seekToTime += timeCorrection;

          if (handleErrorOnExitingSeek || delayPauseOnExitSeek) {
            targetSeekToTime = seekToTime;
            exitingSeek = true;
            pauseOnExitSeek = isPaused;
          }

          mediaPlayer.playFrom(seekToTime);
          if (isPaused && !delayPauseOnExitSeek) {
            mediaPlayer.pause();
          }
        },
        getStrategy: getStrategy(),
        reset: reset,
        tearDown: function () {
          mediaPlayer.removeAllEventCallbacks();
          pauseOnExitSeek = false;
          exitingSeek = false;
          pauseOnExitSeek = false;
          delayPauseOnExitSeek = false;
          isPaused = true;
          isEnded = false;
          if (liveGlitchCurtain) {
            liveGlitchCurtain.tearDown();
            liveGlitchCurtain = undefined;
          }
          eventCallback = undefined;
          errorCallback = undefined;
          timeUpdateCallback = undefined;
        }
      };
    };
  }
);
