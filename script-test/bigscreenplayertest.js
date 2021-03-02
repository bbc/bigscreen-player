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
    var successCallback;
    var errorCallback;
    var noCallbacks = false;

    var mockEventHook;
    var mockPlayerComponentInstance;
    var mockSubtitlesInstance;
    var mockResizer;

    var mockPlayerComponent = function (playbackElement, bigscreenPlayerData, mediaSources, windowType, callback) {
      mockEventHook = callback;
      return mockPlayerComponentInstance;
    };

    var mockSubtitles = function () {
      return mockSubtitlesInstance;
    };

    mockPlayerComponent.getLiveSupport = function () {
      return liveSupport;
    };

    function setupManifestData (options) {
      manifestData = {
        time: options && options.time || {
          windowStartTime: 724000,
          windowEndTime: 4324000,
          correction: 0
        }
      };
    }

    var mediaSourcesMock;
    var mediaSourcesCallbackSuccessSpy;
    var mediaSourcesCallbackErrorSpy;
    var forceMediaSourcesConstructionFailure = false;

    function initialiseBigscreenPlayer (options) {
      // options = subtitlesAvailable, windowType, windowStartTime, windowEndTime
      options = options || {};

      var windowType = options.windowType || WindowTypes.STATIC;
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
        manifestData.time = {
          windowStartTime: options.windowStartTime,
          windowEndTime: options.windowEndTime
        };
      }

      if (options.subtitlesAvailable) {
        bigscreenPlayerData.media.captionsUrl = 'captions';
      }

      var callbacks;
      if (!noCallbacks) {
        callbacks = {onSuccess: successCallback, onError: errorCallback};
      }
      bigscreenPlayer.init(playbackElement, bigscreenPlayerData, windowType, subtitlesEnabled, callbacks);
    }

    describe('Bigscreen Player', function () {
      beforeEach(function (done) {
        mediaSourcesMock = function () {
          return {
            init: function (urls, serverDate, windowType, liveSupport, callbacks) {
              mediaSourcesCallbackSuccessSpy = spyOn(callbacks, 'onSuccess').and.callThrough();
              mediaSourcesCallbackErrorSpy = spyOn(callbacks, 'onError').and.callThrough();
              if (forceMediaSourcesConstructionFailure) {
                callbacks.onError();
              } else {
                callbacks.onSuccess();
              }
            },

            time: function () {
              return manifestData.time;
            }
          };
        };

        var mockDebugTool = jasmine.createSpyObj('mockDebugTool', ['apicall', 'time', 'event', 'keyValue', 'tearDown', 'setRootElement']);
        mockPlayerComponentInstance = jasmine.createSpyObj('playerComponentMock', [
          'play', 'pause', 'isEnded', 'isPaused', 'setCurrentTime', 'getCurrentTime', 'getDuration', 'getSeekableRange',
          'getPlayerElement', 'tearDown', 'getWindowStartTime', 'getWindowEndTime']);
        mockSubtitlesInstance = jasmine.createSpyObj('mockSubtitlesInstance', ['enable', 'disable', 'show', 'hide', 'enabled', 'available', 'setPosition', 'customise', 'renderExample', 'clearExample', 'tearDown']);
        mockResizer = jasmine.createSpyObj('mockResizer', ['resize', 'clear', 'isResized']);
        successCallback = jasmine.createSpy('successCallback');
        errorCallback = jasmine.createSpy('errorCallback');
        setupManifestData();
        liveSupport = LiveSupport.SEEKABLE;
        noCallbacks = false;

        var mockResizerConstructor = function () {
          return mockResizer;
        };

        injector.mock({
          'bigscreenplayer/mediasources': mediaSourcesMock,
          'bigscreenplayer/playercomponent': mockPlayerComponent,
          'bigscreenplayer/plugins': Plugins,
          'bigscreenplayer/debugger/debugtool': mockDebugTool,
          'bigscreenplayer/resizer': mockResizerConstructor,
          'bigscreenplayer/subtitles/subtitles': mockSubtitles
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

        Object.keys(mockSubtitles).forEach(function (spyFunction) {
          mockSubtitles[spyFunction].calls.reset();
        });

        successCallback.calls.reset();
        errorCallback.calls.reset();
        forceMediaSourcesConstructionFailure = false;
        mockResizer.resize.calls.reset();
        mockResizer.clear.calls.reset();

        mediaSourcesCallbackSuccessSpy && mediaSourcesCallbackSuccessSpy.calls && mediaSourcesCallbackSuccessSpy.calls.reset();
        mediaSourcesCallbackErrorSpy && mediaSourcesCallbackErrorSpy.calls && mediaSourcesCallbackErrorSpy.calls.reset();
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

        it('should call the supplied error callback if manifest fails to load', function () {
          forceMediaSourcesConstructionFailure = true;
          initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

          expect(mediaSourcesCallbackErrorSpy).toHaveBeenCalledTimes(1);
          expect(errorCallback).toHaveBeenCalledTimes(1);
          expect(successCallback).not.toHaveBeenCalled();
        });

        it('should not attempt to call onSuccess callback if one is not provided', function () {
          noCallbacks = true;
          initialiseBigscreenPlayer();

          expect(successCallback).not.toHaveBeenCalled();
        });

        it('should not attempt to call onError callback if one is not provided', function () {
          noCallbacks = true;

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

          callback.calls.reset();

          mockEventHook({data: {state: MediaState.WAITING}});

          expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: false, endOfStream: false});
        });

        it('should set the isPaused flag to true when waiting after a setCurrentTime', function () {
          mockEventHook({data: {state: MediaState.PLAYING}});

          expect(callback).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false});

          callback.calls.reset();

          bigscreenPlayer.setCurrentTime(60);
          mockEventHook({data: {state: MediaState.WAITING}});

          expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: true, endOfStream: false});
        });

        it('should set clear the isPaused flag after a waiting event is fired', function () {
          mockEventHook({data: {state: MediaState.PLAYING}});

          bigscreenPlayer.setCurrentTime(60);
          mockEventHook({data: {state: MediaState.WAITING}});

          expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: true, endOfStream: false});

          callback.calls.reset();

          mockEventHook({data: {state: MediaState.WAITING}});

          expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, isSeeking: false, endOfStream: false});
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

      describe('player ready callback', function () {
        describe('on state change event', function () {
          it('should not be called when it is a fatal error', function () {
            initialiseBigscreenPlayer();
            mockEventHook({data: {state: MediaState.FATAL_ERROR}});

            expect(successCallback).not.toHaveBeenCalled();
          });

          it('should be called if playing VOD and event time is valid', function () {
            initialiseBigscreenPlayer();
            mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}});

            expect(successCallback).toHaveBeenCalledTimes(1);
          });

          it('should be called if playing VOD with an initial start time and event time is valid', function () {
            initialiseBigscreenPlayer({initialPlaybackTime: 20});
            mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}});

            expect(successCallback).not.toHaveBeenCalled();
            mockEventHook({data: {state: MediaState.PLAYING, currentTime: 20}});

            expect(successCallback).toHaveBeenCalledTimes(1);
          });

          it('should be called if playing Live and event time is valid', function () {
            setupManifestData({
              transferFormat: TransferFormats.DASH,
              time: {
                windowStartTime: 10,
                windowEndTime: 100
              }
            });

            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            mockEventHook({
              data:
              {
                state: MediaState.PLAYING,
                currentTime: 10,
                seekableRange: {
                  start: 10,
                  end: 100
                }
              }
            });

            expect(successCallback).toHaveBeenCalledTimes(1);
          });

          it('after a valid state change should not be called on succesive valid state changes', function () {
            initialiseBigscreenPlayer();
            mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}});

            expect(successCallback).toHaveBeenCalledTimes(1);
            successCallback.calls.reset();
            mockEventHook({data: {state: MediaState.PLAYING, currentTime: 0}});

            expect(successCallback).not.toHaveBeenCalled();
          });

          it('after a valid state change should not be called on succesive valid time updates', function () {
            initialiseBigscreenPlayer();
            mockEventHook({data: {state: MediaState.WAITING, currentTime: 0}});

            expect(successCallback).toHaveBeenCalledTimes(1);
            successCallback.calls.reset();
            mockEventHook({data: {currentTime: 0}, timeUpdate: true});

            expect(successCallback).not.toHaveBeenCalled();
          });
        });

        describe('on time update', function () {
          it('should be called if playing VOD and current time is valid', function () {
            initialiseBigscreenPlayer();
            mockEventHook({data: {currentTime: 0}, timeUpdate: true});

            expect(successCallback).toHaveBeenCalledTimes(1);
          });

          it('should be called if playing VOD with an initial start time and current time is valid', function () {
            initialiseBigscreenPlayer({initialPlaybackTime: 20});
            mockEventHook({data: {currentTime: 0}, timeUpdate: true});

            expect(successCallback).not.toHaveBeenCalled();
            mockEventHook({data: {currentTime: 20}, timeUpdate: true});

            expect(successCallback).toHaveBeenCalledTimes(1);
          });

          it('should be called if playing Live and current time is valid', function () {
            setupManifestData({
              transferFormat: TransferFormats.DASH,
              time: {
                windowStartTime: 10,
                windowEndTime: 100
              }
            });
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            mockEventHook({
              data:
              {
                currentTime: 10,
                seekableRange: {
                  start: 10,
                  end: 100
                }
              },
              timeUpdate: true
            });

            expect(successCallback).toHaveBeenCalledTimes(1);
          });

          it('after a valid time update should not be called on succesive valid time updates', function () {
            initialiseBigscreenPlayer();
            mockEventHook({data: {currentTime: 0}, timeUpdate: true});

            expect(successCallback).toHaveBeenCalledTimes(1);
            successCallback.calls.reset();
            mockEventHook({data: {currentTime: 2}, timeUpdate: true});

            expect(successCallback).not.toHaveBeenCalled();
          });

          it('after a valid time update should not be called on succesive valid state changes', function () {
            initialiseBigscreenPlayer();
            mockEventHook({data: {currentTime: 0}, timeUpdate: true});

            expect(successCallback).toHaveBeenCalledTimes(1);
            successCallback.calls.reset();
            mockEventHook({data: {state: MediaState.PLAYING, currentTime: 2}});

            expect(successCallback).not.toHaveBeenCalled();
          });
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

      describe('registerForSubtitleChanges', function () {
        it('should call the callback when subtitles are turned on/off', function () {
          var callback = jasmine.createSpy('listener1');
          initialiseBigscreenPlayer();
          bigscreenPlayer.registerForSubtitleChanges(callback);

          expect(callback).not.toHaveBeenCalled();

          bigscreenPlayer.setSubtitlesEnabled(true);

          expect(callback).toHaveBeenCalledWith({enabled: true});

          bigscreenPlayer.setSubtitlesEnabled(false);

          expect(callback).toHaveBeenCalledWith({enabled: false});
        });

        it('should call the callback when init() is called with subtitles enabled', function () {
          var callback = jasmine.createSpy('listener1');

          bigscreenPlayer.registerForSubtitleChanges(callback);
          initialiseBigscreenPlayer({ subtitlesEnabled: true });

          expect(callback).toHaveBeenCalledWith({enabled: true});
        });

        it('should not call the callback when init() is called without subtitles enabled', function () {
          var callback = jasmine.createSpy('listener1');

          bigscreenPlayer.registerForSubtitleChanges(callback);
          initialiseBigscreenPlayer();

          expect(callback).not.toHaveBeenCalled();
        });

        it('returns a reference to the callback supplied', function () {
          var callback = jasmine.createSpy();
          var reference = bigscreenPlayer.registerForSubtitleChanges(callback);

          expect(reference).toBe(callback);
        });
      });

      describe('unregisterForSubtitleChanges', function () {
        it('should remove callback from subtitleCallbacks', function () {
          initialiseBigscreenPlayer();

          var listener1 = jasmine.createSpy('listener1');
          var listener2 = jasmine.createSpy('listener2');
          var listener3 = jasmine.createSpy('listener3');

          bigscreenPlayer.registerForSubtitleChanges(listener1);
          bigscreenPlayer.registerForSubtitleChanges(listener2);
          bigscreenPlayer.registerForSubtitleChanges(listener3);

          bigscreenPlayer.setSubtitlesEnabled(true);

          bigscreenPlayer.unregisterForSubtitleChanges(listener2);

          bigscreenPlayer.setSubtitlesEnabled(false);

          expect(listener1).toHaveBeenCalledTimes(2);
          expect(listener2).toHaveBeenCalledTimes(1);
          expect(listener3).toHaveBeenCalledTimes(2);
        });

        it('should only remove existing callbacks from subtitleCallbacks', function () {
          initialiseBigscreenPlayer();

          var listener1 = jasmine.createSpy('listener1');
          var listener2 = jasmine.createSpy('listener2');

          bigscreenPlayer.registerForSubtitleChanges(listener1);
          bigscreenPlayer.unregisterForSubtitleChanges(listener2);

          bigscreenPlayer.setSubtitlesEnabled(true);

          expect(listener1).toHaveBeenCalledWith({enabled: true});
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
        it('should turn subtitles on/off when a value is passed in', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.setSubtitlesEnabled(true);

          expect(mockSubtitlesInstance.enable).toHaveBeenCalledTimes(1);

          bigscreenPlayer.setSubtitlesEnabled(false);

          expect(mockSubtitlesInstance.disable).toHaveBeenCalledTimes(1);
        });

        it('should show subtitles when called with true', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.setSubtitlesEnabled(true);

          expect(mockSubtitlesInstance.show).toHaveBeenCalledTimes(1);
        });

        it('should hide subtitleswhen called with false', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.setSubtitlesEnabled(false);

          expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1);
        });

        it('should not show subtitles when resized', function () {
          initialiseBigscreenPlayer();
          mockResizer.isResized.and.returnValue(true);

          bigscreenPlayer.setSubtitlesEnabled(true);

          expect(mockSubtitlesInstance.show).not.toHaveBeenCalled();
        });

        it('should not hide subtitles when resized', function () {
          initialiseBigscreenPlayer();
          mockResizer.isResized.and.returnValue(true);

          bigscreenPlayer.setSubtitlesEnabled(true);

          expect(mockSubtitlesInstance.hide).not.toHaveBeenCalled();
        });
      });

      describe('isSubtitlesEnabled', function () {
        it('calls through to Subtitles enabled when called', function () {
          initialiseBigscreenPlayer();

          bigscreenPlayer.isSubtitlesEnabled();

          expect(mockSubtitlesInstance.enabled).toHaveBeenCalledWith();
        });
      });

      describe('isSubtitlesAvailable', function () {
        it('calls through to Subtitles available when called', function () {
          initialiseBigscreenPlayer();

          bigscreenPlayer.isSubtitlesAvailable();

          expect(mockSubtitlesInstance.available).toHaveBeenCalledWith();
        });
      });

      describe('customiseSubtitles', function () {
        it('passes through custom styles to Subtitles customise', function () {
          initialiseBigscreenPlayer();
          var customStyleObj = { size: 0.7 };
          bigscreenPlayer.customiseSubtitles(customStyleObj);

          expect(mockSubtitlesInstance.customise).toHaveBeenCalledWith(customStyleObj);
        });
      });

      describe('renderSubtitleExample', function () {
        it('calls Subtitles renderExample with correct values', function () {
          initialiseBigscreenPlayer();
          var exampleUrl = '';
          var customStyleObj = { size: 0.7 };
          var safePosititon = { left: 30, top: 0 };
          bigscreenPlayer.renderSubtitleExample(exampleUrl, customStyleObj, safePosititon);

          expect(mockSubtitlesInstance.renderExample).toHaveBeenCalledWith(exampleUrl, customStyleObj, safePosititon);
        });
      });

      describe('clearSubtitleExample', function () {
        it('calls Subtitles clearExample', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.clearSubtitleExample();

          expect(mockSubtitlesInstance.clearExample).toHaveBeenCalledTimes(1);
        });
      });

      describe('setTransportControlsPosition', function () {
        it('should call through to Subtitles setPosition function', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.setTransportControlsPosition();

          expect(mockSubtitlesInstance.setPosition).toHaveBeenCalledTimes(1);
        });
      });

      describe('resize', function () {
        it('calls resizer with correct values', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.resize(10, 10, 160, 90, 100);

          expect(mockResizer.resize).toHaveBeenCalledWith(playbackElement, 10, 10, 160, 90, 100);
        });

        it('hides subtitles when resized', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.resize(10, 10, 160, 90, 100);

          expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1);
        });
      });

      describe('clearResize', function () {
        it('calls resizers clear function', function () {
          initialiseBigscreenPlayer();
          bigscreenPlayer.clearResize();

          expect(mockResizer.clear).toHaveBeenCalledWith(playbackElement);
        });

        it('shows subtitles if subtitles are enabled', function () {
          mockSubtitlesInstance.enabled.and.returnValue(true);

          initialiseBigscreenPlayer();
          bigscreenPlayer.clearResize();

          expect(mockSubtitlesInstance.show).toHaveBeenCalledTimes(1);
        });

        it('hides subtitles if subtitles are disabled', function () {
          mockSubtitlesInstance.enabled.and.returnValue(false);

          initialiseBigscreenPlayer();
          bigscreenPlayer.clearResize();

          expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1);
        });
      });

      describe('canSeek', function () {
        it('should return true when in VOD playback', function () {
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

        describe('LIVE', function () {
          it('should return true when it can pause', function () {
            liveSupport = LiveSupport.RESTARTABLE;

            initialiseBigscreenPlayer({
              windowType: WindowTypes.SLIDING
            });

            expect(bigscreenPlayer.canPause()).toBe(true);
          });

          it('should be false when window length less than four minutes', function () {
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
          setupManifestData({
            time: {
              windowStartTime: 4200,
              windowEndTime: 150000000
            }
          });

          initialiseBigscreenPlayer({
            windowType: WindowTypes.SLIDING
          });

          expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBe(4200 + 1000000);
        });

        it('does not convert video time to epoch time when windowStartTime is not supplied', function () {
          setupManifestData({
            time: {
              windowStartTime: undefined,
              windowEndTime: undefined
            }
          });

          initialiseBigscreenPlayer();

          expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBeUndefined();
        });
      });

      describe('covertEpochMsToVideoTimeSeconds', function () {
        it('converts epoch time to video time when windowStartTime is available', function () {
          // windowStartTime - 16 January 2019 12:00:00
          // windowEndTime - 16 January 2019 14:00:00
          setupManifestData({
            time: {
              windowStartTime: 1547640000000,
              windowEndTime: 1547647200000
            }
          });

          initialiseBigscreenPlayer({
            windowType: WindowTypes.SLIDING
          });

          // Time to convert - 16 January 2019 13:00:00 - one hour (3600 seconds)
          expect(bigscreenPlayer.convertEpochMsToVideoTimeSeconds(1547643600000)).toBe(3600);
        });

        it('does not convert epoch time to video time when windowStartTime is not available', function () {
          setupManifestData({
            time: {
              windowStartTime: undefined,
              windowEndTime: undefined
            }
          });

          initialiseBigscreenPlayer();

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

          Plugins.interface.onError();

          expect(mockPlugin.onError).toHaveBeenCalledTimes(1);
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

          Plugins.interface.onError();

          expect(mockPlugin.onError).not.toHaveBeenCalled();
          expect(mockPluginTwo.onError).toHaveBeenCalledTimes(1);
        });

        it('should remove all plugins', function () {
          bigscreenPlayer.unregisterPlugin();

          Plugins.interface.onError();

          expect(mockPlugin.onError).not.toHaveBeenCalled();
          expect(mockPluginTwo.onError).not.toHaveBeenCalled();
        });
      });

      describe('mock', function () {
        afterEach(function () {
          bigscreenPlayer.unmock();
        });

        it('should return a mock object with jasmine spies on the same interface as the main api', function () {
          initialiseBigscreenPlayer();
          var moduleKeys = Object.keys(bigscreenPlayer);
          bigscreenPlayer.mockJasmine();
          var mockKeys = Object.keys(bigscreenPlayer);

          expect(mockKeys).toEqual(jasmine.objectContaining(moduleKeys));
        });

        it('should return a mock object on the same interface as the main api', function () {
          initialiseBigscreenPlayer();
          var moduleKeys = Object.keys(bigscreenPlayer);
          bigscreenPlayer.mock();
          var mockKeys = Object.keys(bigscreenPlayer);

          expect(mockKeys).toEqual(jasmine.objectContaining(moduleKeys));
        });
      });
    });
  }
);
