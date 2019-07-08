require(
  [
    'squire',
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/pausetriggers',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/plugins',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/models/livesupport'
  ],
    function (Squire, MediaState, WindowTypes, PauseTriggers, PluginEnums, Plugins, TransferFormats, LiveSupport) {
      var injector = new Squire();
      var bigscreenPlayer;
      var bigscreenPlayerData;
      var playbackElement;
      var manifestData;
      var liveSupport;
      var forceManifestLoadError;
      var successCallback = jasmine.createSpy('successCallback');
      var errorCallback = jasmine.createSpy('errorCallback');
      var noCallbacks = false;

      var mockEventHook;
      var mockPlayerComponentInstance = jasmine.createSpyObj('playerComponentMock', [
        'play', 'pause', 'isEnded', 'isPaused', 'setCurrentTime', 'getCurrentTime', 'getDuration', 'getSeekableRange',
        'getPlayerElement', 'isSubtitlesAvailable', 'isSubtitlesEnabled', 'setSubtitlesEnabled', 'tearDown',
        'getWindowStartTime', 'getWindowEndTime']);

      var mockPlayerComponent = function (playbackElement, bigscreenPlayerData, mediaSources, windowType, enableSubtitles, callback, device) {
        mockEventHook = callback;
        return mockPlayerComponentInstance;
      };

      mockPlayerComponent.getLiveSupport = function () {
        return liveSupport;
      };

      function setupManifestData (options) {
        manifestData = {
          transferFormat: options && options.transferFormat || 'dash',
          time: options && options.time || {
            windowStartTime: 724000,
            windowEndTime: 4324000,
            correction: 0
          }
        };
        mockPlayerComponentInstance.getWindowStartTime.and.returnValue(manifestData.time.windowStartTime);
        mockPlayerComponentInstance.getWindowEndTime.and.returnValue(manifestData.time.windowStartTime);
      }

      var manifestLoaderMock = {
        load: function (urls, serverDate, callbacks) {
          if (forceManifestLoadError) {
            callbacks.onError();
          } else {
            callbacks.onSuccess(manifestData);
          }
        }
      };

      function initialiseBigscreenPlayer (options) {
        // options = subtitlesAvailable, windowType, windowStartTime, windowEndTime
        options = options || {};

        var windowType = options.windowType || WindowTypes.STATIC;
        var device = options.device;
        var subtitlesEnabled = options.subtitlesEnabled || false;

        playbackElement = document.createElement('div');
        playbackElement.id = 'app';

        bigscreenPlayerData = {
          media: {
            codec: 'codec',
            urls: [{url: 'videoUrl', cdn: 'cdn'}],
            kind: options.mediaKind || 'video',
            type: 'mimeType',
            bitrate: 'bitrate',
            transferFormat: options.transferFormat
          },
          serverDate: options.serverDate,
          initialPlaybackTime: options.initialPlaybackTime
        };

        if (options.windowStartTime && options.windowEndTime) {
          bigscreenPlayerData.time = {
            windowStartTime: options.windowStartTime,
            windowEndTime: options.windowEndTime
          };
          mockPlayerComponentInstance.getWindowStartTime.and.returnValue(options.windowStartTime);
          mockPlayerComponentInstance.getWindowEndTime.and.returnValue(options.windowEndTime);
        } else {
          mockPlayerComponentInstance.getWindowStartTime.and.returnValue(manifestData.time.windowStartTime);
          mockPlayerComponentInstance.getWindowEndTime.and.returnValue(manifestData.time.windowEndTime);
        }

        if (options.subtitlesAvailable) {
          bigscreenPlayerData.media.captionsUrl = 'captions';
        }

        var callbacks;
        if (!noCallbacks) {
          callbacks = {onSuccess: successCallback, onError: errorCallback};
        }
        bigscreenPlayer.init(playbackElement, bigscreenPlayerData, windowType, subtitlesEnabled, device, callbacks);
      }

      describe('Bigscreen Player', function () {
        beforeEach(function (done) {
          setupManifestData();
          liveSupport = LiveSupport.SEEKABLE;
          forceManifestLoadError = false;
          noCallbacks = false;

          injector.mock({
            'bigscreenplayer/manifest/manifestloader': manifestLoaderMock,
            'bigscreenplayer/playercomponent': mockPlayerComponent,
            'bigscreenplayer/plugins': Plugins
          });

          injector.require(['bigscreenplayer/bigscreenplayer'], function (bigscreenPlayerReference) {
            bigscreenPlayer = bigscreenPlayerReference();
            done();
          });
        });

        afterEach(function () {
          Object.keys(mockPlayerComponentInstance).forEach(function (spyFunction) {
            mockPlayerComponentInstance[spyFunction].calls.reset();
          });
          successCallback.calls.reset();
          errorCallback.calls.reset();
          bigscreenPlayer.tearDown();
        });

        describe('init', function () {
          beforeEach(function () {
            bigscreenPlayer.tearDown();
          });

          it('should set endOfStream to true when playing live and no initial playback time is set', function () {
            mockPlayerComponentInstance.getCurrentTime.and.returnValue(30);

            var callback = jasmine.createSpy();

            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});
            bigscreenPlayer.registerForTimeUpdates(callback);

            mockEventHook({data: {currentTime: 30}, timeUpdate: true, isBufferingTimeoutError: false});

            expect(callback).toHaveBeenCalledWith({currentTime: 30, endOfStream: true});
          });

          it('should set endOfStream to false when playing live and initialPlaybackTime is 0', function () {
            mockPlayerComponentInstance.getCurrentTime.and.returnValue(0);

            var callback = jasmine.createSpy('listenerSimulcast');

            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING, initialPlaybackTime: 0});

            bigscreenPlayer.registerForTimeUpdates(callback);

            mockEventHook({data: {currentTime: 0}, timeUpdate: true, isBufferingTimeoutError: false});

            expect(callback).toHaveBeenCalledWith({currentTime: 0, endOfStream: false});
          });

          it('should call the suppiled success callback if playing VOD', function () {
            initialiseBigscreenPlayer();

            expect(successCallback).toHaveBeenCalledWith();
            expect(errorCallback).not.toHaveBeenCalled();
          });

          it('should call the suppiled success callback if playing LIVE and the manifest loads', function () {
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            expect(successCallback).toHaveBeenCalledWith();
            expect(errorCallback).not.toHaveBeenCalled();
          });

          it('should call the supplied error callback if manifest fails to load', function () {
            forceManifestLoadError = true;
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            expect(errorCallback).toHaveBeenCalledWith({error: 'manifest'});
            expect(successCallback).not.toHaveBeenCalled();
          });

          it('should not attempt to call onSuccess callback if one is not provided', function () {
            noCallbacks = true;
            initialiseBigscreenPlayer();

            expect(successCallback).not.toHaveBeenCalled();
          });

          it('should not attempt to call onError callback if one is not provided', function () {
            noCallbacks = true;
            forceManifestLoadError = true;
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            expect(errorCallback).not.toHaveBeenCalled();
          });
        });

        describe('getPlayerElement', function () {
          it('Should call through to getPlayerElement on the playback strategy', function () {
            initialiseBigscreenPlayer();

            var mockedVideo = jasmine.createSpy('mockVideoElement');

            mockPlayerComponentInstance.getPlayerElement.and.returnValue(mockedVideo);

            bigscreenPlayer.getPlayerElement();

            expect(bigscreenPlayer.getPlayerElement()).toBe(mockedVideo);
          });
        });

        describe('registerForStateChanges', function () {
          var callback;
          beforeEach(function () {
            callback = jasmine.createSpy();
            bigscreenPlayer.registerForStateChanges(callback);
            initialiseBigscreenPlayer();
          });

          it('should fire the callback when a state event comes back from the strategy', function () {
            mockEventHook({data: {state: MediaState.PLAYING}});

            expect(callback).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false});

            mockEventHook({data: {state: MediaState.WAITING}});

            expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, endOfStream: false});
          });

          it('should set the pause trigger to the one set when a pause event comes back from strategy', function () {
            bigscreenPlayer.pause();

            mockEventHook({data: {state: MediaState.PAUSED}});

            expect(callback).toHaveBeenCalledWith({state: MediaState.PAUSED, trigger: PauseTriggers.USER, endOfStream: false});
          });

          it('should set the pause trigger to device when a pause event comes back from strategy and a trigger is not set', function () {
            mockEventHook({data: {state: MediaState.PAUSED}});

            expect(callback).toHaveBeenCalledWith({state: MediaState.PAUSED, trigger: PauseTriggers.DEVICE, endOfStream: false});
          });

          it('should set isBufferingTimeoutError when a fatal error event comes back from strategy', function () {
            mockEventHook({data: {state: MediaState.FATAL_ERROR}, isBufferingTimeoutError: false});

            expect(callback).toHaveBeenCalledWith({state: MediaState.FATAL_ERROR, isBufferingTimeoutError: false, endOfStream: false});
          });

          it('should return a reference to the callback passed in', function () {
            var reference = bigscreenPlayer.registerForStateChanges(callback);

            expect(reference).toBe(callback);
          });
        });

        describe('unregisterForStateChanges', function () {
          it('should remove callback from stateChangeCallbacks', function () {
            var listener1 = jasmine.createSpy('listener1');
            var listener2 = jasmine.createSpy('listener2');
            var listener3 = jasmine.createSpy('listener3');

            initialiseBigscreenPlayer();

            bigscreenPlayer.registerForStateChanges(listener1);
            bigscreenPlayer.registerForStateChanges(listener2);
            bigscreenPlayer.registerForStateChanges(listener3);

            mockEventHook({data: {state: MediaState.PLAYING}});

            bigscreenPlayer.unregisterForStateChanges(listener2);

            mockEventHook({data: {state: MediaState.PLAYING}});

            expect(listener1).toHaveBeenCalledTimes(2);
            expect(listener2).toHaveBeenCalledTimes(1);
            expect(listener3).toHaveBeenCalledTimes(2);
          });

          it('should only remove existing callbacks from stateChangeCallbacks', function () {
            initialiseBigscreenPlayer();

            var listener1 = jasmine.createSpy('listener1');
            var listener2 = jasmine.createSpy('listener2');

            bigscreenPlayer.registerForStateChanges(listener1);
            bigscreenPlayer.unregisterForStateChanges(listener2);

            mockEventHook({data: {state: MediaState.PLAYING}});

            expect(listener1).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false});
          });
        });

        describe('registerForTimeUpdates', function () {
          it('should call the callback when we get a timeupdate event from the strategy', function () {
            var callback = jasmine.createSpy('listener1');
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerForTimeUpdates(callback);

            expect(callback).not.toHaveBeenCalled();

            mockEventHook({data: {currentTime: 60}, timeUpdate: true});

            expect(callback).toHaveBeenCalledWith({currentTime: 60, endOfStream: false});
          });

          it('returns a reference to the callback passed in', function () {
            var callback = jasmine.createSpy();
            var reference = bigscreenPlayer.registerForTimeUpdates(callback);

            expect(reference).toBe(callback);
          });
        });

        describe('unregisterForTimeUpdates', function () {
          it('should remove callback from timeUpdateCallbacks', function () {
            initialiseBigscreenPlayer();

            var listener1 = jasmine.createSpy('listener1');
            var listener2 = jasmine.createSpy('listener2');
            var listener3 = jasmine.createSpy('listener3');

            bigscreenPlayer.registerForTimeUpdates(listener1);
            bigscreenPlayer.registerForTimeUpdates(listener2);
            bigscreenPlayer.registerForTimeUpdates(listener3);

            mockEventHook({data: {currentTime: 0}, timeUpdate: true});

            bigscreenPlayer.unregisterForTimeUpdates(listener2);

            mockEventHook({data: {currentTime: 1}, timeUpdate: true});

            expect(listener1).toHaveBeenCalledTimes(2);
            expect(listener2).toHaveBeenCalledTimes(1);
            expect(listener3).toHaveBeenCalledTimes(2);
          });

          it('should only remove existing callbacks from timeUpdateCallbacks', function () {
            initialiseBigscreenPlayer();

            var listener1 = jasmine.createSpy('listener1');
            var listener2 = jasmine.createSpy('listener2');

            bigscreenPlayer.registerForTimeUpdates(listener1);
            bigscreenPlayer.unregisterForTimeUpdates(listener2);

            mockEventHook({data: {currentTime: 60}, timeUpdate: true});

            expect(listener1).toHaveBeenCalledWith({currentTime: 60, endOfStream: false});
          });
        });

        describe('setCurrentTime', function () {
          it('should setCurrentTime on the strategy/playerComponent', function () {
            initialiseBigscreenPlayer();

            bigscreenPlayer.setCurrentTime(60);

            expect(mockPlayerComponentInstance.setCurrentTime).toHaveBeenCalledWith(60);
          });

          it('should not set current time on the strategy/playerComponent if bigscreen player is not initialised', function () {
            bigscreenPlayer.setCurrentTime(60);

            expect(mockPlayerComponentInstance.setCurrentTime).not.toHaveBeenCalled();
          });

          it('should set endOfStream to true when seeking to the end of a simulcast', function () {
            setupManifestData({
              transferFormat: TransferFormats.DASH,
              time: {
                windowStartTime: 10,
                windowEndTime: 100
              }
            });

            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            var callback = jasmine.createSpy();
            var endOfStreamWindow = bigscreenPlayerData.time.windowEndTime - 2;

            bigscreenPlayer.registerForTimeUpdates(callback);

            mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: bigscreenPlayerData.time.windowStartTime, end: bigscreenPlayerData.time.windowEndTime});
            mockPlayerComponentInstance.getCurrentTime.and.returnValue(endOfStreamWindow);

            bigscreenPlayer.setCurrentTime(endOfStreamWindow);

            mockEventHook({data: {currentTime: endOfStreamWindow}, timeUpdate: true});

            expect(callback).toHaveBeenCalledWith({currentTime: endOfStreamWindow, endOfStream: true});
          });

          it('should set endOfStream to false when seeking into a simulcast', function () {
            setupManifestData({
              transferFormat: TransferFormats.DASH,
              time: {
                windowStartTime: 10,
                windowEndTime: 100
              }
            });

            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            var callback = jasmine.createSpy();
            bigscreenPlayer.registerForTimeUpdates(callback);

            var middleOfStreamWindow = bigscreenPlayerData.time.windowEndTime / 2;

            mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: bigscreenPlayerData.time.windowStartTime, end: bigscreenPlayerData.time.windowEndTime});
            mockPlayerComponentInstance.getCurrentTime.and.returnValue(middleOfStreamWindow);

            bigscreenPlayer.setCurrentTime(middleOfStreamWindow);

            mockEventHook({data: {currentTime: middleOfStreamWindow}, timeUpdate: true});

            expect(callback).toHaveBeenCalledWith({currentTime: middleOfStreamWindow, endOfStream: false});
          });
        });

        describe('getCurrentTime', function () {
          it('should return the current time from the strategy', function () {
            initialiseBigscreenPlayer();

            mockPlayerComponentInstance.getCurrentTime.and.returnValue(10);

            expect(bigscreenPlayer.getCurrentTime()).toBe(10);
          });

          it('should return 0 if bigscreenPlayer is not initialised', function () {
            expect(bigscreenPlayer.getCurrentTime()).toBe(0);
          });
        });

        describe('getMediaKind', function () {
          it('should return the media kind', function () {
            initialiseBigscreenPlayer({mediaKind: 'audio'});

            expect(bigscreenPlayer.getMediaKind()).toBe('audio');
          });
        });

        describe('getWindowType', function () {
          it('should return the window type', function () {
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            expect(bigscreenPlayer.getWindowType()).toBe(WindowTypes.SLIDING);
          });
        });

        describe('getSeekableRange', function () {
          it('should return the seekable range from the strategy', function () {
            initialiseBigscreenPlayer();

            mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: 0, end: 10});

            expect(bigscreenPlayer.getSeekableRange().start).toEqual(0);
            expect(bigscreenPlayer.getSeekableRange().end).toEqual(10);
          });

          it('should return an empty object when bigscreen player has not been initialised', function () {
            expect(bigscreenPlayer.getSeekableRange()).toEqual({});
          });
        });

        describe('isAtLiveEdge', function () {
          it('should return false when playing on demand content', function () {
            initialiseBigscreenPlayer();

            expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(false);
          });

          it('should return false when bigscreen-player has not been initialised', function () {
            expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(false);
          });

          it('should return true when playing live and current time is within tolerance of seekable range end', function () {
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            mockPlayerComponentInstance.getCurrentTime.and.returnValue(100);
            mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: 0, end: 105});

            expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(true);
          });

          it('should return false when playing live and current time is outside the tolerance of seekable range end', function () {
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            mockPlayerComponentInstance.getCurrentTime.and.returnValue(95);
            mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: 0, end: 105});

            expect(bigscreenPlayer.isPlayingAtLiveEdge()).toEqual(false);
          });
        });

        describe('getLiveWindowData', function () {
          it('should return undefined values when windowType is static', function () {
            initialiseBigscreenPlayer({windowType: WindowTypes.STATIC});

            expect(bigscreenPlayer.getLiveWindowData()).toEqual({});
          });

          it('should return liveWindowData when the windowType is sliding and manifest is loaded', function () {
            setupManifestData({
              transferFormat: TransferFormats.DASH,
              time: {
                windowStartTime: 1,
                windowEndTime: 2
              }
            });

            var initialisationData = {windowType: WindowTypes.SLIDING, serverDate: new Date(), initialPlaybackTime: new Date().getTime()};
            initialiseBigscreenPlayer(initialisationData);

            expect(bigscreenPlayer.getLiveWindowData()).toEqual({windowStartTime: 1, windowEndTime: 2, serverDate: initialisationData.serverDate, initialPlaybackTime: initialisationData.initialPlaybackTime});
          });

          it('should return a subset of liveWindowData when the windowType is sliding and time block is provided', function () {
            var initialisationData = {windowType: WindowTypes.SLIDING, windowStartTime: 1, windowEndTime: 2, initialPlaybackTime: new Date().getTime()};
            initialiseBigscreenPlayer(initialisationData);

            expect(bigscreenPlayer.getLiveWindowData()).toEqual({serverDate: undefined, windowStartTime: 1, windowEndTime: 2, initialPlaybackTime: initialisationData.initialPlaybackTime});
          });
        });

        describe('getDuration', function () {
          it('should get the duration from the strategy', function () {
            initialiseBigscreenPlayer();

            mockPlayerComponentInstance.getDuration.and.returnValue(10);

            expect(bigscreenPlayer.getDuration()).toEqual(10);
          });

          it('should return undefined when not initialised', function () {
            expect(bigscreenPlayer.getDuration()).toBeUndefined();
          });
        });

        describe('isPaused', function () {
          it('should get the paused state from the strategy', function () {
            initialiseBigscreenPlayer();

            mockPlayerComponentInstance.isPaused.and.returnValue(true);

            expect(bigscreenPlayer.isPaused()).toBe(true);
          });

          it('should return true if bigscreenPlayer has not been initialised', function () {
            expect(bigscreenPlayer.isPaused()).toBe(true);
          });
        });

        describe('isEnded', function () {
          it('should get the ended state from the strategy', function () {
            initialiseBigscreenPlayer();

            mockPlayerComponentInstance.isEnded.and.returnValue(true);

            expect(bigscreenPlayer.isEnded()).toBe(true);
          });

          it('should return false if bigscreenPlayer has not been initialised', function () {
            expect(bigscreenPlayer.isEnded()).toBe(false);
          });
        });

        describe('play', function () {
          it('should call play on the strategy', function () {
            initialiseBigscreenPlayer();

            bigscreenPlayer.play();

            expect(mockPlayerComponentInstance.play).toHaveBeenCalledWith();
          });
        });

        describe('pause', function () {
          it('should call pause on the strategy', function () {
            var opts = {disableAutoResume: true};

            initialiseBigscreenPlayer();

            bigscreenPlayer.pause(opts);

            expect(mockPlayerComponentInstance.pause).toHaveBeenCalledWith(jasmine.objectContaining({disableAutoResume: true}));
          });

          it('should set pauseTrigger to an app pause if user pause is false', function () {
            var opts = {userPause: false};

            initialiseBigscreenPlayer();

            var callback = jasmine.createSpy();

            bigscreenPlayer.registerForStateChanges(callback);

            bigscreenPlayer.pause(opts);

            mockEventHook({data: {state: MediaState.PAUSED}});

            expect(callback).toHaveBeenCalledWith(jasmine.objectContaining({trigger: PauseTriggers.APP}));
          });

          it('should set pauseTrigger to a user pause if user pause is true', function () {
            var opts = {userPause: true};

            initialiseBigscreenPlayer();

            var callback = jasmine.createSpy();

            bigscreenPlayer.registerForStateChanges(callback);

            bigscreenPlayer.pause(opts);

            mockEventHook({data: {state: MediaState.PAUSED}});

            expect(callback).toHaveBeenCalledWith(jasmine.objectContaining({trigger: PauseTriggers.USER}));
          });
        });

        describe('setSubtitlesEnabled', function () {
          it('should turn subtitles on/off when a value is passed in and they are available', function () {
            initialiseBigscreenPlayer({ subtitlesAvailable: true });

            bigscreenPlayer.setSubtitlesEnabled(true);

            expect(mockPlayerComponentInstance.setSubtitlesEnabled).toHaveBeenCalledWith(true);

            bigscreenPlayer.setSubtitlesEnabled(false);

            expect(mockPlayerComponentInstance.setSubtitlesEnabled).toHaveBeenCalledWith(false);
          });
        });

        describe('isSubtitlesEnabled', function () {
          it('calls through to playerComponent isSubtitlesEnabled when called', function () {
            initialiseBigscreenPlayer();

            bigscreenPlayer.isSubtitlesEnabled();

            expect(mockPlayerComponentInstance.isSubtitlesEnabled).toHaveBeenCalled();
          });
        });

        describe('isSubtitlesAvailable', function () {
          it('calls through to playerComponent isSubtitlesAvailable when called', function () {
            initialiseBigscreenPlayer();

            bigscreenPlayer.isSubtitlesAvailable();

            expect(mockPlayerComponentInstance.isSubtitlesAvailable).toHaveBeenCalled();
          });
        });

        describe('canSeek', function () {
          it('VOD should return true', function () {
            initialiseBigscreenPlayer();

            expect(bigscreenPlayer.canSeek()).toBe(true);
          });

          describe('live', function () {
            it('should return true when it can seek', function () {
              mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: 0, end: 60});

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING
              });

              expect(bigscreenPlayer.canSeek()).toBe(true);
            });

            it('should return false when seekable range is infinite', function () {
              mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: 0, end: Infinity});

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING
              });

              expect(bigscreenPlayer.canSeek()).toBe(false);
            });

            it('should return false when window length less than four minutes', function () {
              setupManifestData({
                transferFormat: 'dash',
                time: {
                  windowStartTime: 0,
                  windowEndTime: 239999,
                  correction: 0
                }
              });
              mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: 0, end: 60});

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING
              });

              expect(bigscreenPlayer.canSeek()).toBe(false);
            });

            it('should return false when device does not support seeking', function () {
              mockPlayerComponentInstance.getSeekableRange.and.returnValue({start: 0, end: 60});

              liveSupport = LiveSupport.PLAYABLE;

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING
              });

              expect(bigscreenPlayer.canSeek()).toBe(false);
            });
          });
        });

        describe('canPause', function () {
          it('VOD should return true', function () {
            initialiseBigscreenPlayer();

            expect(bigscreenPlayer.canPause()).toBe(true);
          });

          describe('live', function () {
            it('should return true when it can pause', function () {
              liveSupport = LiveSupport.RESTARTABLE;

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING
              });

              expect(bigscreenPlayer.canPause()).toBe(true);
            });

            it('should return false when window length less than four minutes', function () {
              setupManifestData({
                transferFormat: TransferFormats.DASH,
                time: {
                  windowStartTime: 0,
                  windowEndTime: 239999,
                  correction: 0
                }
              });
              liveSupport = LiveSupport.RESTARTABLE;

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING
              });

              expect(bigscreenPlayer.canPause()).toBe(false);
            });

            it('should return false when device does not support pausing', function () {
              liveSupport = LiveSupport.PLAYABLE;

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING
              });

              expect(bigscreenPlayer.canPause()).toBe(false);
            });
          });
        });

        describe('convertVideoTimeSecondsToEpochMs', function () {
          it('converts video time to epoch time when windowStartTime is supplied', function () {
            initialiseBigscreenPlayer({
              windowType: WindowTypes.SLIDING
            });

            mockPlayerComponentInstance.getWindowStartTime.and.returnValue(4200);
            mockPlayerComponentInstance.getWindowEndTime.and.returnValue(150000000);

            expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBe(4200 + 1000000);
          });

          it('does not convert video time to epoch time when windowStartTime is not supplied', function () {
            initialiseBigscreenPlayer();

            mockPlayerComponentInstance.getWindowStartTime.and.returnValue(undefined);
            mockPlayerComponentInstance.getWindowEndTime.and.returnValue(undefined);

            expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBeUndefined();
          });
        });

        describe('covertEpochMsToVideoTimeSeconds', function () {
          it('converts epoch time to video time when windowStartTime is available', function () {
            initialiseBigscreenPlayer({
              windowType: WindowTypes.SLIDING
            });

            // windowStartTime - 16 January 2019 12:00:00
            // windowEndTime - 16 January 2019 14:00:00
            mockPlayerComponentInstance.getWindowStartTime.and.returnValue(1547640000000);
            mockPlayerComponentInstance.getWindowEndTime.and.returnValue(1547647200000);

            // Time to convert - 16 January 2019 13:00:00 - one hour (3600 seconds)
            expect(bigscreenPlayer.convertEpochMsToVideoTimeSeconds(1547643600000)).toBe(3600);
          });

          it('does not convert epoch time to video time when windowStartTime is not available', function () {
            initialiseBigscreenPlayer();

            mockPlayerComponentInstance.getWindowStartTime.and.returnValue(undefined);
            mockPlayerComponentInstance.getWindowEndTime.and.returnValue(undefined);

            expect(bigscreenPlayer.convertEpochMsToVideoTimeSeconds(1547643600000)).toBeUndefined();
          });
        });

        describe('registerPlugin', function () {
          beforeEach(function () {
            jasmine.clock().install();

            var callback = jasmine.createSpy(callback);
            bigscreenPlayer.registerForStateChanges(callback);
          });

          afterEach(function () {
            jasmine.clock().uninstall();
          });

          it('should register a specific plugin', function () {
            var mockPlugin = jasmine.createSpyObj('plugin', ['onError']);
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerPlugin(mockPlugin);

            Plugins.interface.onError({errorProperties: {}});

            expect(mockPlugin.onError).toHaveBeenCalledWith({errorProperties: {}});
          });
        });

        describe('unregister plugin', function () {
          var mockPlugin;
          var mockPluginTwo;
          beforeEach(function () {
            jasmine.clock().install();
            mockPlugin = jasmine.createSpyObj('plugin', ['onError']);
            mockPluginTwo = jasmine.createSpyObj('pluginTwo', ['onError']);
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerPlugin(mockPlugin);
            bigscreenPlayer.registerPlugin(mockPluginTwo);
          });

          afterEach(function () {
            jasmine.clock().uninstall();
            mockPlugin.onError.calls.reset();
            mockPluginTwo.onError.calls.reset();
          });

          it('should remove a specific plugin', function () {
            bigscreenPlayer.unregisterPlugin(mockPlugin);

            Plugins.interface.onError({errorProperties: {}});

            expect(mockPlugin.onError).not.toHaveBeenCalled();
            expect(mockPluginTwo.onError).toHaveBeenCalledWith({errorProperties: {}});
          });

          it('should remove all plugins', function () {
            bigscreenPlayer.unregisterPlugin();

            Plugins.interface.onError({errorProperties: {}});

            expect(mockPlugin.onError).not.toHaveBeenCalled();
            expect(mockPluginTwo.onError).not.toHaveBeenCalled();
          });
        });
      });
    }
  );
