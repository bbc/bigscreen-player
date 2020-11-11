require(
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/playbackstrategy/mockstrategy',
    'bigscreenplayer/models/transportcontrolposition',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/models/transferformats',
    'squire'
  ],
  function (MediaState, WindowTypes, MediaKinds, MockStrategy, TransportControlPosition, LiveSupport, PluginEnums, TransferFormats, Squire) {
    'use strict';

    describe('Player Component', function () {
      var injector;
      var playerComponent;
      var playbackElement;
      var mockStrategy;
      var mockSubtitles;
      var mockPlugins;
      var mockPluginsInterface;
      var PlayerComponentWithMocks;
      var mockStateUpdateCallback;
      var corePlaybackData;
      var liveSupport;
      var forceMediaSourcesError;
      var mockMediaSources;
      var testTime;
      var updateTestTime = false;

      // opts = streamType, playbackType, mediaType, subtitlesAvailable, subtitlesEnabled noStatsReporter, disableUi
      function setUpPlayerComponent (opts) {
        opts = opts || {};

        playbackElement = document.createElement('div');
        playbackElement.id = 'app';

        corePlaybackData = {
          media: {
            kind: opts.mediaKind || MediaKinds.VIDEO,
            codec: undefined,
            urls: [{url: 'a.mpd', cdn: 'cdn-a'}, {url: 'b.mpd', cdn: 'cdn-b'}, {url: 'c.mpd', cdn: 'cdn-c'}],
            type: opts.type || 'application/dash+xml',
            transferFormat: opts.transferFormat || TransferFormats.DASH,
            bitrate: undefined,
            captionsUrl: opts.subtitlesAvailable ? 'captionsUrl' : undefined
          },
          time: testTime
        };

        mockMediaSources = {
          failover: function (successCallback, errorCallback, failoverParams) {
            if (forceMediaSourcesError) {
              errorCallback();
            } else {
              if (updateTestTime) {
                testTime = {
                  windowStartTime: 744000,
                  windowEndTime: 4344000,
                  correction: 0
                };
              }
              successCallback();
            }
          },
          time: function () {
            return testTime;
          },
          refresh: function (successCallback, errorCallback) {
            if (updateTestTime) {
              testTime = {
                windowStartTime: 744000,
                windowEndTime: 4344000,
                correction: 0
              };
            }
            successCallback();
          }
        };

        var windowType = opts.windowType || WindowTypes.STATIC;

        mockStateUpdateCallback = jasmine.createSpy('mockStateUpdateCallback');

        playerComponent = new PlayerComponentWithMocks(
          playbackElement,
          corePlaybackData,
          mockMediaSources,
          windowType,
          opts.subtitlesEnabled || false,
          mockStateUpdateCallback,
          null
        );
      }

      beforeEach(function (done) {
        injector = new Squire();
        mockSubtitles = jasmine.createSpyObj('Subtitles', ['setEnabled', 'areEnabled', 'areAvailable', 'setPosition', 'tearDown']);
        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled']);

        mockPlugins = {
          interface: mockPluginsInterface
        };

        mockStrategy = MockStrategy();

        function mockSubtitlesConstructor () {
          return mockSubtitles;
        }

        function mockStrategyConstructor () {
          return mockStrategy;
        }

        liveSupport = LiveSupport.SEEKABLE;
        mockStrategyConstructor.getLiveSupport = function () {
          return liveSupport;
        };

        injector.mock({
          'bigscreenplayer/subtitles/subtitles': mockSubtitlesConstructor,
          'bigscreenplayer/playbackstrategy/mockstrategy': mockStrategyConstructor,
          'bigscreenplayer/plugins': mockPlugins
        });
        injector.require(['bigscreenplayer/playercomponent'], function (PlayerComponent) {
          PlayerComponentWithMocks = PlayerComponent;
          done();
        });

        forceMediaSourcesError = false;
        testTime = {
          windowStartTime: 724000,
          windowEndTime: 4324000,
          correction: 0
        };
        updateTestTime = false;
      });

      describe('init', function () {
        it('should fire error cleared on the plugins', function () {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        // TODO: ensure that subtitles is properly constructed
      });

      describe('Pause', function () {
        it('should disable auto resume when playing a video webcast', function () {
          setUpPlayerComponent({windowType: WindowTypes.GROWING});

          spyOn(mockStrategy, 'pause');

          playerComponent.pause();

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: true});
        });

        it('should use options for disable auto resume when playing audio', function () {
          setUpPlayerComponent({windowType: WindowTypes.SLIDING, mediaKind: 'audio'});

          spyOn(mockStrategy, 'pause');

          playerComponent.pause();

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: undefined});

          playerComponent.pause({disableAutoResume: false});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: false});

          playerComponent.pause({disableAutoResume: true});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: true});
        });

        it('should use options for disable auto resume when not playing a webcast', function () {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'pause');

          playerComponent.pause();

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: undefined});

          playerComponent.pause({disableAutoResume: false});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: false});

          playerComponent.pause({disableAutoResume: true});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: true});
        });
      });

      describe('getPlayerElement', function () {
        // This is used within the TALStatsAPI
        it('should return the element from the strategy', function () {
          setUpPlayerComponent();

          var playerElement = document.createElement('video');
          spyOn(mockStrategy, 'getPlayerElement').and.returnValue(playerElement);

          expect(playerComponent.getPlayerElement()).toEqual(playerElement);
        });

        it('should return null if it does not exist on the strategy', function () {
          setUpPlayerComponent();

          var getPlayerElementFunction = mockStrategy.getPlayerElement;

          mockStrategy.getPlayerElement = undefined;

          expect(playerComponent.getPlayerElement()).toEqual(null);

          // Other tests require this to still work and mock strategy is a singleton
          mockStrategy.getPlayerElement = getPlayerElementFunction;
        });
      });

      describe('setSubtitlesEnabled', function () {
        it('should call through to subtitles setEnabled function', function () {
          setUpPlayerComponent();
          playerComponent.setSubtitlesEnabled();

          expect(mockSubtitles.setEnabled).toHaveBeenCalled();
        });
      });

      describe('isSubtitlesEnabled', function () {
        it('should call through to subtitles areEnabled function', function () {
          setUpPlayerComponent();
          playerComponent.isSubtitlesEnabled();

          expect(mockSubtitles.areEnabled).toHaveBeenCalled();
        });
      });

      describe('isSubtitlesAvailable', function () {
        it('should call through to subtitles areAvailable function', function () {
          setUpPlayerComponent();
          playerComponent.isSubtitlesAvailable();

          expect(mockSubtitles.areAvailable).toHaveBeenCalled();
        });
      });

      describe('setTransportControlPosition', function () {
        it('should call through to subtitles setPosition function', function () {
          setUpPlayerComponent();
          playerComponent.setTransportControlPosition();

          expect(mockSubtitles.setPosition).toHaveBeenCalled();
        });
      });

      describe('setCurrentTime', function () {
        var currentStrategy;
        beforeEach(function () {
          currentStrategy = window.bigscreenPlayer.playbackStrategy;

          spyOn(mockStrategy, 'setCurrentTime');
          spyOn(mockStrategy, 'load');
        });

        afterEach(function () {
          window.bigscreenPlayer.playbackStrategy = currentStrategy;

          mockStrategy.setCurrentTime.calls.reset();
          mockStrategy.load.calls.reset();
          mockStrategy.getSeekableRange.calls.reset();
        });

        it('should setCurrentTime on the strategy when in a seekable state', function () {
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          setUpPlayerComponent();

          mockStrategy.load.calls.reset();
          playerComponent.setCurrentTime(10);

          expect(mockStrategy.setCurrentTime).toHaveBeenCalledWith(10);
          expect(mockStrategy.load).not.toHaveBeenCalled();
        });

        it('should reload the element if restartable', function () {
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          window.bigscreenPlayer.playbackStrategy = 'nativestrategy';
          liveSupport = LiveSupport.RESTARTABLE;
          setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: TransferFormats.HLS, type: 'applesomething' });

          updateTestTime = true;
          playerComponent.setCurrentTime(50);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith('applesomething', 30);
        });

        it('should reload the element with no time if the new time is within 30 seconds of the end of the window', function () {
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 70});
          window.bigscreenPlayer.playbackStrategy = 'nativestrategy';
          liveSupport = LiveSupport.RESTARTABLE;
          setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: TransferFormats.HLS, type: 'applesomething' });

          // this will move the window forward by 20 seconds from it's original position
          testTime = {
            windowStartTime: 744000,
            windowEndTime: 4344000,
            correction: 0
          };

          playerComponent.setCurrentTime(50);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith('applesomething', undefined);
        });
      });

      describe('events', function () {
        describe('on playing', function () {
          it('should fire error cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should clear error timeout', function () {
            jasmine.clock().install();
            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            jasmine.clock().tick(30000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should clear fatal error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should fire buffering cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              newCdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should publish a media state update of playing', function () {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.PLAYING);
          });
        });

        describe('on paused', function () {
          it('should publish a media state update event of paused', function () {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.PAUSED);
          });

          it('should clear error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            jasmine.clock().tick(30000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should clear fatal error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should fire error cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should fire buffering cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });
        });

        describe('on buffering', function () {
          it('should publish a media state update of waiting', function () {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.WAITING);
          });

          it('should start the error timeout', function () {
            jasmine.clock().install();

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            jasmine.clock().tick(30000);
            // error timeout when reached will fire a buffering cleared on the plugins.
            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));

            jasmine.clock().uninstall();
          });

          it('should fire error cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should fire on buffering on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.STARTED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockPluginsInterface.onBuffering).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });
        });

        describe('on ended', function () {
          it('should clear error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            jasmine.clock().tick(30000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should clear fatal error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should fire error cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should fire buffering cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should publish a media state update event of ended', function () {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.ENDED);
          });
        });

        describe('on timeUpdate', function () {
          it('should publish a media state update event', function () {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].timeUpdate).toEqual(true);
          });
        });

        describe('on error', function () {
          it('should fire buffering cleared on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent();

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          // raise error
          it('should clear error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            jasmine.clock().tick(29999);

            mockStrategy.mockingHooks.fireErrorEvent();

            jasmine.clock().tick(1);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          // raise error
          it('should publish a media state update of waiting', function () {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent();

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.WAITING);
          });

          // raise error
          it('should fire on error on the plugins', function () {
            var pluginData = {
              status: PluginEnums.STATUS.STARTED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent();

            expect(mockPluginsInterface.onError).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });
        });
      });

      describe('cdn failover', function () {
        var fatalErrorPluginData;
        var currentTime;
        var type;
        var currentTimeSpy;
        var currentStrategy;

        beforeEach(function () {
          jasmine.clock().install();

          fatalErrorPluginData = {
            status: PluginEnums.STATUS.FATAL,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            newCdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          currentTime = 50;
          type = 'application/dash+xml';

          spyOn(mockStrategy, 'load');
          spyOn(mockStrategy, 'reset');
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          currentTimeSpy = spyOn(mockStrategy, 'getCurrentTime');
          currentTimeSpy.and.returnValue(currentTime);
          currentStrategy = window.bigscreenPlayer.playbackStrategy;
        });

        afterEach(function () {
          window.bigscreenPlayer.playbackStrategy = currentStrategy;
          jasmine.clock().uninstall();
        });

        it('should failover after buffering for 30 seconds on initial playback', function () {
          setUpPlayerComponent();
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(29999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime);
        });

        it('should failover after buffering for 20 seconds on normal playback', function () {
          setUpPlayerComponent();
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING); // Set playback cause to normal
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(19999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime);
        });

        it('should failover after 5 seconds if we have not cleared an error from the device', function () {
          setUpPlayerComponent();
          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(4999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime);
          expect(mockStrategy.reset).toHaveBeenCalledWith();
        });

        it('should fire a fatal error on the plugins if failover is not possible', function () {
          setUpPlayerComponent();
          forceMediaSourcesError = true;

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockPluginsInterface.onFatalError).toHaveBeenCalledWith(jasmine.objectContaining(fatalErrorPluginData));
        });

        it('should publish a media state update of fatal if failover is not possible', function () {
          setUpPlayerComponent();
          forceMediaSourcesError = true;

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.FATAL_ERROR);
        });

        it('should failover for with updated failover time when window time data has changed', function () {
          setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: TransferFormats.HLS });
          updateTestTime = true;

          // Set playback cause to normal
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(19999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime - 20);
        });

        it('should clear buffering timeout error timeout', function () {
          setUpPlayerComponent();
          forceMediaSourcesError = true;

          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);
          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(30000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].isBufferingTimeoutError).toBe(false);
        });

        it('should clear fatal error timeout', function () {
          setUpPlayerComponent();

          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);
        });

        it('should fire error cleared on the plugins', function () {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should fire buffering cleared on the plugins', function () {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.BUFFERING,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: true,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });
      });

      describe('teardown', function () {
        it('should reset the strategy', function () {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'reset');

          playerComponent.tearDown();

          expect(mockStrategy.reset).toHaveBeenCalledWith();
        });

        it('should clear error timeout', function () {
          jasmine.clock().install();

          setUpPlayerComponent();

          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          playerComponent.tearDown();

          jasmine.clock().tick(30000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

          jasmine.clock().uninstall();
        });

        it('should clear fatal error timeout', function () {
          jasmine.clock().install();

          setUpPlayerComponent();

          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireErrorEvent();

          playerComponent.tearDown();

          jasmine.clock().tick(5000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

          jasmine.clock().uninstall();
        });

        it('should fire error cleared on the plugins', function () {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          playerComponent.tearDown();

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should fire buffering cleared on the plugins', function () {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.BUFFERING,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: true,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          playerComponent.tearDown();

          expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should tear down the strategy', function () {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'tearDown');

          playerComponent.tearDown();

          expect(mockStrategy.tearDown).toHaveBeenCalledWith();
        });

        it('should call through to tearDown of subtitles', function () {
          setUpPlayerComponent();

          playerComponent.tearDown();

          expect(mockSubtitles.tearDown).toHaveBeenCalled();
        });
      });
    });
  }
);
