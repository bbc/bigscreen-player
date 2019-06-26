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
    'bigscreenplayer/manifest/manifestloader',
    'bigscreenplayer/utils/timeutils',
    'bigscreenplayer/utils/livesupportutils'
  ],
  function (MediaState, PlayerComponent, PauseTriggers, DynamicWindowUtils, WindowTypes, MockBigscreenPlayer, Plugins, Chronicle, DebugTool, ManifestLoader, SlidingWindowUtils, LiveSupportUtils) {
    'use strict';
    function BigscreenPlayer () {
      var stateChangeCallbacks = [];
      var timeUpdateCallbacks = [];

      var mediaKind;
      var initialPlaybackTimeEpoch;
      var serverDate;
      var playerComponent;
      var pauseTrigger;
      var endOfStream;
      var windowType;
      var device;

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
          stateObject.endOfStream = endOfStream;

          stateChangeCallbacks.forEach(function (callback) {
            callback(stateObject);
          });
          DebugTool.event(stateObject);
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
        if (bigscreenPlayerData.time) {
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
          windowType,
          enableSubtitles,
          mediaStateUpdateCallback,
          device
        );

        if (successCallback) {
          successCallback();
        }

        var availableCdns = bigscreenPlayerData.media.urls.map(function (media) {
          return media.cdn;
        });

        DebugTool.keyValue({key: 'available cdns', value: availableCdns});
        DebugTool.keyValue({key: 'current cdn', value: bigscreenPlayerData.media.urls[0].cdn});
        DebugTool.keyValue({key: 'url', value: bigscreenPlayerData.media.urls[0].url});
      }

      function getWindowStartTime () {
        return playerComponent && playerComponent.getWindowStartTime();
      }

      function getWindowEndTime () {
        return playerComponent && playerComponent.getWindowEndTime();
      }

      function initialManifestLoad (bigscreenPlayerData, playbackElement, enableSubtitles, callbacks) {
        ManifestLoader.load(
          bigscreenPlayerData.media.urls,
          serverDate,
          {
            onSuccess: function (manifestData) {
              bigscreenPlayerData.media.transferFormat = manifestData.transferFormat;
              bigscreenPlayerData.time = manifestData.time;
              bigscreenPlayerDataLoaded(playbackElement, bigscreenPlayerData, enableSubtitles, device, callbacks.onSuccess);
            },
            onError: function () {
              if (bigscreenPlayerData.media.urls > 0) {
                bigscreenPlayerData.media.urls.shift();
                initialManifestLoad(bigscreenPlayerData, playbackElement, enableSubtitles, callbacks);
              } else {
                if (callbacks.onError) {
                  callbacks.onError({error: 'manifest'});
                }
              }
            }
          }
        );
      }

      return {
        init: function (playbackElement, bigscreenPlayerData, newWindowType, enableSubtitles, newDevice, callbacks) {
          Chronicle.init();
          device = newDevice;
          windowType = newWindowType;
          serverDate = bigscreenPlayerData.serverDate;
          if (!callbacks) {
            callbacks = {};
          }

          if (LiveSupportUtils.needToGetManifest(windowType, getLiveSupport(device)) && !bigscreenPlayerData.time) {
            initialManifestLoad(bigscreenPlayerData, playbackElement, enableSubtitles, callbacks);
          } else {
            bigscreenPlayerDataLoaded(playbackElement, bigscreenPlayerData, enableSubtitles, device, callbacks.onSuccess);
          }
        },

        tearDown: function () {
          if (playerComponent) {
            playerComponent.tearDown();
            playerComponent = undefined;
          }
          stateChangeCallbacks = [];
          timeUpdateCallbacks = [];
          endOfStream = undefined;
          mediaKind = undefined;
          pauseTrigger = undefined;
          windowType = undefined;
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
        setCurrentTime: function (time) {
          DebugTool.apicall('setCurrentTime');
          if (playerComponent) {
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
        convertVideoTimeSecondsToEpochMs: convertVideoTimeSecondsToEpochMs
      };
    }

    function getLiveSupport (device) {
      return PlayerComponent.getLiveSupport(device);
    }

    BigscreenPlayer.getLiveSupport = getLiveSupport;

    return BigscreenPlayer;
  }
);
