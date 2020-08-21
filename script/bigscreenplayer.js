define('bigscreenplayer/bigscreenplayer',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/playercomponent',
    'bigscreenplayer/models/pausetriggers',
    'bigscreenplayer/dynamicwindowutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/mockbigscreenplayer',
    'bigscreenplayer/plugins',
    'bigscreenplayer/debugger/chronicle',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/utils/timeutils',
    'bigscreenplayer/mediasources',
    'bigscreenplayer/version'
  ],
  function (MediaState, PlayerComponent, PauseTriggers, DynamicWindowUtils, WindowTypes, MockBigscreenPlayer, Plugins, Chronicle, DebugTool, SlidingWindowUtils, MediaSources, Version) {
    'use strict';
    function BigscreenPlayer () {
      var stateChangeCallbacks = [];
      var timeUpdateCallbacks = [];
      var subtitleCallbacks = [];

      var mediaKind;
      var initialPlaybackTimeEpoch;
      var serverDate;
      var playerComponent;
      var pauseTrigger;
      var isSeeking = false;
      var endOfStream;
      var windowType;
      var device;
      var mediaSources;

      var END_OF_STREAM_TOLERANCE = 10;

      function mediaStateUpdateCallback (evt) {
        if (evt.timeUpdate) {
          DebugTool.time(evt.data.currentTime);
          timeUpdateCallbacks.forEach(function (callback) {
            callback({
              currentTime: evt.data.currentTime,
              endOfStream: endOfStream
            });
          });
        } else {
          var stateObject = {state: evt.data.state};
          if (evt.data.state === MediaState.PAUSED) {
            endOfStream = false;
            stateObject.trigger = pauseTrigger || PauseTriggers.DEVICE;
            pauseTrigger = undefined;
          }

          if (evt.data.state === MediaState.FATAL_ERROR) {
            stateObject = {
              state: MediaState.FATAL_ERROR,
              isBufferingTimeoutError: evt.isBufferingTimeoutError
            };
          }

          if (evt.data.state === MediaState.WAITING) {
            stateObject.isSeeking = isSeeking;
            isSeeking = false;
          }

          stateObject.endOfStream = endOfStream;
          DebugTool.event(stateObject);

          stateChangeCallbacks.forEach(function (callback) {
            callback(stateObject);
          });
        }

        if (evt.data.seekableRange) {
          DebugTool.keyValue({key: 'seekableRangeStart', value: deviceTimeToDate(evt.data.seekableRange.start)});
          DebugTool.keyValue({key: 'seekableRangeEnd', value: deviceTimeToDate(evt.data.seekableRange.end)});
        }

        if (evt.data.duration) {
          DebugTool.keyValue({key: 'duration', value: evt.data.duration});
        }
      }

      function deviceTimeToDate (time) {
        if (getWindowStartTime()) {
          return new Date(convertVideoTimeSecondsToEpochMs(time));
        } else {
          return new Date(time * 1000);
        }
      }

      function convertVideoTimeSecondsToEpochMs (seconds) {
        return getWindowStartTime() ? getWindowStartTime() + (seconds * 1000) : undefined;
      }

      function bigscreenPlayerDataLoaded (playbackElement, bigscreenPlayerData, enableSubtitles, device, successCallback) {
        if (windowType !== WindowTypes.STATIC) {
          bigscreenPlayerData.time = mediaSources.time();
          serverDate = bigscreenPlayerData.serverDate;

          initialPlaybackTimeEpoch = bigscreenPlayerData.initialPlaybackTime;
          // overwrite initialPlaybackTime with video time (it comes in as epoch time for a sliding/growing window)
          bigscreenPlayerData.initialPlaybackTime = SlidingWindowUtils.convertToSeekableVideoTime(bigscreenPlayerData.initialPlaybackTime, bigscreenPlayerData.time.windowStartTime);
        }

        mediaKind = bigscreenPlayerData.media.kind;
        endOfStream = windowType !== WindowTypes.STATIC && (!bigscreenPlayerData.initialPlaybackTime && bigscreenPlayerData.initialPlaybackTime !== 0);

        playerComponent = new PlayerComponent(
          playbackElement,
          bigscreenPlayerData,
          mediaSources,
          windowType,
          enableSubtitles,
          mediaStateUpdateCallback,
          device
        );

        if (enableSubtitles) {
          callSubtitlesCallbacks(true);
        }

        if (successCallback) {
          successCallback();
        }
      }

      function getWindowStartTime () {
        return mediaSources && mediaSources.time().windowStartTime;
      }

      function getWindowEndTime () {
        return mediaSources && mediaSources.time().windowEndTime;
      }

      function toggleDebug () {
        if (playerComponent) {
          DebugTool.toggleVisibility();
        }
      }

      function callSubtitlesCallbacks (enabled) {
        subtitleCallbacks.forEach(function (callback) {
          callback({ enabled: enabled });
        });
      }

      return {
        init: function (playbackElement, bigscreenPlayerData, newWindowType, enableSubtitles, newDevice, callbacks) {
          Chronicle.init();
          DebugTool.setRootElement(playbackElement);
          DebugTool.keyValue({key: 'framework-version', value: Version});
          device = newDevice;
          windowType = newWindowType;
          serverDate = bigscreenPlayerData.serverDate;
          if (!callbacks) {
            callbacks = {};
          }

          var mediaSourceCallbacks = {
            onSuccess: function () {
              bigscreenPlayerDataLoaded(playbackElement, bigscreenPlayerData, enableSubtitles, device, callbacks.onSuccess);
            },
            onError: function (error) {
              if (callbacks.onError) {
                callbacks.onError(error);
              }
            }
          };

          mediaSources = new MediaSources();
          mediaSources.init(bigscreenPlayerData.media.urls, serverDate, windowType, getLiveSupport(device), mediaSourceCallbacks);
        },

        tearDown: function () {
          if (playerComponent) {
            playerComponent.tearDown();
            playerComponent = undefined;
          }
          stateChangeCallbacks = [];
          timeUpdateCallbacks = [];
          subtitleCallbacks = [];
          endOfStream = undefined;
          mediaKind = undefined;
          pauseTrigger = undefined;
          windowType = undefined;
          mediaSources = undefined;
          this.unregisterPlugin();
          DebugTool.tearDown();
          Chronicle.tearDown();
        },

        registerForStateChanges: function (callback) {
          stateChangeCallbacks.push(callback);
          return callback;
        },
        unregisterForStateChanges: function (callback) {
          var indexOf = stateChangeCallbacks.indexOf(callback);
          if (indexOf !== -1) {
            stateChangeCallbacks.splice(indexOf, 1);
          }
        },
        registerForTimeUpdates: function (callback) {
          timeUpdateCallbacks.push(callback);
          return callback;
        },
        unregisterForTimeUpdates: function (callback) {
          var indexOf = timeUpdateCallbacks.indexOf(callback);

          if (indexOf !== -1) {
            timeUpdateCallbacks.splice(indexOf, 1);
          }
        },
        registerForSubtitleChanges: function (callback) {
          subtitleCallbacks.push(callback);
          return callback;
        },
        unregisterForSubtitleChanges: function (callback) {
          var indexOf = subtitleCallbacks.indexOf(callback);
          if (indexOf !== -1) {
            subtitleCallbacks.splice(indexOf, 1);
          }
        },
        setCurrentTime: function (time) {
          DebugTool.apicall('setCurrentTime');
          if (playerComponent) {
            isSeeking = true; // this flag must be set before calling into playerComponent.setCurrentTime - as this synchronously fires a WAITING event (when native strategy).
            playerComponent.setCurrentTime(time);
            endOfStream = windowType !== WindowTypes.STATIC && Math.abs(this.getSeekableRange().end - time) < END_OF_STREAM_TOLERANCE;
          }
        },
        getCurrentTime: function () {
          return playerComponent && playerComponent.getCurrentTime() || 0;
        },
        getMediaKind: function () {
          return mediaKind;
        },
        getWindowType: function () {
          return windowType;
        },
        getSeekableRange: function () {
          return playerComponent ? playerComponent.getSeekableRange() : {};
        },
        isPlayingAtLiveEdge: function () {
          return !!playerComponent && windowType !== WindowTypes.STATIC && Math.abs(this.getSeekableRange().end - this.getCurrentTime()) < END_OF_STREAM_TOLERANCE;
        },
        getLiveWindowData: function () {
          if (windowType === WindowTypes.STATIC) {
            return {};
          }

          return {
            windowStartTime: getWindowStartTime(),
            windowEndTime: getWindowEndTime(),
            initialPlaybackTime: initialPlaybackTimeEpoch,
            serverDate: serverDate
          };
        },
        getDuration: function () {
          return playerComponent && playerComponent.getDuration();
        },
        isPaused: function () {
          return playerComponent ? playerComponent.isPaused() : true;
        },
        isEnded: function () {
          return playerComponent ? playerComponent.isEnded() : false;
        },
        play: function () {
          DebugTool.apicall('play');
          playerComponent.play();
        },
        pause: function (opts) {
          DebugTool.apicall('pause');
          pauseTrigger = opts && opts.userPause === false ? PauseTriggers.APP : PauseTriggers.USER;
          playerComponent.pause(opts);
        },
        setSubtitlesEnabled: function (value) {
          playerComponent.setSubtitlesEnabled(value);
          callSubtitlesCallbacks(value);
        },
        isSubtitlesEnabled: function () {
          return playerComponent ? playerComponent.isSubtitlesEnabled() : false;
        },
        isSubtitlesAvailable: function () {
          return playerComponent ? playerComponent.isSubtitlesAvailable() : false;
        },
        setTransportControlsPosition: function (position) {
          playerComponent.setTransportControlPosition(position);
        },
        canSeek: function () {
          return windowType === WindowTypes.STATIC || DynamicWindowUtils.canSeek(getWindowStartTime(), getWindowEndTime(), getLiveSupport(device), this.getSeekableRange());
        },
        canPause: function () {
          return windowType === WindowTypes.STATIC || DynamicWindowUtils.canPause(getWindowStartTime(), getWindowEndTime(), getLiveSupport(device));
        },
        mock: function (opts) {
          MockBigscreenPlayer.mock(this, opts);
        },
        unmock: function () {
          MockBigscreenPlayer.unmock(this);
        },
        mockJasmine: function (opts) {
          MockBigscreenPlayer.mockJasmine(this, opts);
        },
        registerPlugin: function (plugin) {
          Plugins.registerPlugin(plugin);
        },
        unregisterPlugin: function (plugin) {
          Plugins.unregisterPlugin(plugin);
        },
        transitions: function () {
          return playerComponent ? playerComponent.transitions() : {};
        },
        getPlayerElement: function () {
          return playerComponent && playerComponent.getPlayerElement();
        },
        convertEpochMsToVideoTimeSeconds: function (epochTime) {
          return getWindowStartTime() ? Math.floor((epochTime - getWindowStartTime()) / 1000) : undefined;
        },
        getFrameworkVersion: function () {
          return Version;
        },
        convertVideoTimeSecondsToEpochMs: convertVideoTimeSecondsToEpochMs,
        toggleDebug: toggleDebug,
        getLogLevels: function () {
          return DebugTool.logLevels;
        },
        setLogLevel: DebugTool.setLogLevel
      };
    }

    function getLiveSupport (device) {
      return PlayerComponent.getLiveSupport(device);
    }

    BigscreenPlayer.getLiveSupport = getLiveSupport;

    BigscreenPlayer.version = Version;

    return BigscreenPlayer;
  }
);
