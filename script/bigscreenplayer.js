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
    'bigscreenplayer/parsers/manifestloader',
    'bigscreenplayer/utils/timeutils'
  ],
  function (MediaState, PlayerComponent, PauseTriggers, DynamicWindowUtils, WindowTypes, MockBigscreenPlayer, Plugins, Chronicle, DebugTool, ManifestLoader, SlidingWindowUtils) {
    'use strict';
    function BigscreenPlayer () {
      var stateChangeCallbacks = [];
      var timeUpdateCallbacks = [];

      var mediaKind;
      var windowStartTime;
      var windowEndTime;
      var initialPlaybackTimeEpoch;
      var serverDate;
      var liveSupport;
      var playerComponent;
      var pauseTrigger;
      var endOfStream;
      var windowType;

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
        if (windowStartTime) {
          return new Date(convertVideoTimeSecondsToEpochMs(time));
        } else {
          return new Date(time * 1000);
        }
      }

      function convertVideoTimeSecondsToEpochMs (seconds) {
        return windowStartTime ? windowStartTime + (seconds * 1000) : undefined;
      }

      // Will need reusing in Player Component for Live CDN failover HLS
      function needToGetManifest () {
        var requiresSimulcastSeekingData = {
          restartable: true,
          seekable: true,
          playable: false,
          none: false
        };

        return windowType !== WindowTypes.STATIC && requiresSimulcastSeekingData[liveSupport];
      }

      function bigscreenPlayerDataLoaded (playbackElement, bigscreenPlayerData, enableSubtitles, device, successCallback) {
        if (bigscreenPlayerData.time) {
          windowStartTime = bigscreenPlayerData.time.windowStartTime;
          windowEndTime = bigscreenPlayerData.time.windowEndTime;
          serverDate = bigscreenPlayerData.serverDate;

          initialPlaybackTimeEpoch = bigscreenPlayerData.initialPlaybackTime;
          // overwrite initialPlaybackTime with video time (it comes in as epoch time for a sliding/growing window)
          bigscreenPlayerData.initialPlaybackTime = SlidingWindowUtils.convertToSeekableVideoTime(bigscreenPlayerData.initialPlaybackTime, windowStartTime);
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

        successCallback();

        var availableCdns = bigscreenPlayerData.media.urls.map(function (media) {
          return media.cdn;
        });

        DebugTool.keyValue({key: 'available cdns', value: availableCdns});
        DebugTool.keyValue({key: 'current cdn', value: bigscreenPlayerData.media.urls[0].cdn});
        DebugTool.keyValue({key: 'url', value: bigscreenPlayerData.media.urls[0].url});
      }

      return {
        init: function (playbackElement, bigscreenPlayerData, newWindowType, enableSubtitles, newLiveSupport, successCallback, device) {
          Chronicle.init();
          liveSupport = newLiveSupport;
          windowType = newWindowType;
          serverDate = bigscreenPlayerData.serverDate;

          if (needToGetManifest() && !bigscreenPlayerData.time) {
            ManifestLoader().load(
              bigscreenPlayerData.media.urls,
              serverDate,
              device,
              {
                onSuccess: function (manifestData) {
                  bigscreenPlayerData.media.manifestType = manifestData.manifestType;
                  bigscreenPlayerData.time = manifestData.time;
                  bigscreenPlayerDataLoaded(playbackElement, bigscreenPlayerData, enableSubtitles, device, successCallback);
                },
                onError: function () {
                  mediaStateUpdateCallback({data: {state: MediaState.MANIFEST_ERROR}});
                }
              }
            );
          } else {
            bigscreenPlayerDataLoaded(playbackElement, bigscreenPlayerData, enableSubtitles, device, successCallback);
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
          windowStartTime = undefined;
          windowEndTime = undefined;
          liveSupport = undefined;
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
            var END_OF_STREAM_TOLERANCE = 10;

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
        getLiveWindowData: function () {
          if (windowType === WindowTypes.STATIC) {
            return {};
          }
          return {
            windowStartTime: windowStartTime,
            windowEndTime: windowEndTime,
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
          return windowType === WindowTypes.STATIC || DynamicWindowUtils.canSeek(windowStartTime, windowEndTime, liveSupport, this.getSeekableRange());
        },
        canPause: function () {
          return windowType === WindowTypes.STATIC || DynamicWindowUtils.canPause(windowStartTime, windowEndTime, liveSupport);
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
          return windowStartTime ? Math.floor((epochTime - windowStartTime) / 1000) : undefined;
        },
        convertVideoTimeSecondsToEpochMs: convertVideoTimeSecondsToEpochMs
      };
    }

    return BigscreenPlayer;
  }
);
