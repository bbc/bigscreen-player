require(
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/playbackstrategy/mockstrategy',
    'bigscreenplayer/models/transportcontrolposition',
    'bigscreenplayer/pluginenums',
    'squire'
  ],
  function (MediaState, WindowTypes, MediaKinds, MockStrategy, TransportControlPosition, PluginEnums, Squire) {
    'use strict';

    describe('Player Component', function () {
      var injector;
      var playerComponent;
      var playbackElement;
      var mockStrategy;
      var mockCaptionsContainer;
      var mockPlugins;
      var mockPluginsInterface;
      var PlayerComponentWithMocks;
      var mockStateUpdateCallback;
      var corePlaybackData;

      // opts = streamType, playbackType, mediaType, subtitlesAvailable, subtitlesEnabled noStatsReporter, disableUi
      function setUpPlayerComponent (opts) {
        opts = opts || {};

        playbackElement = document.createElement('div');
        playbackElement.id = 'app';

        corePlaybackData = {
          media: {
            kind: opts.mediaKind || MediaKinds.VIDEO,
            codec: undefined,
            urls: opts.multiCdn ? [{url: 'a', cdn: 'cdn-a'}, {url: 'b', cdn: 'cdn-b'}, {url: 'c', cdn: 'cdn-c'}] : [{url: 'a', cdn: 'cdn-a'}],
            type: 'application/dash+xml',
            manifestType: opts.manifestType || 'mpd',
            bitrate: undefined,
            captionsUrl: opts.subtitlesAvailable ? 'captionsUrl' : undefined
          },
          time: {
            windowStartTime: 724,
            windowEndTime: 4324,
            correction: 0
          }
        };

        var windowType = opts.windowType || WindowTypes.STATIC;

        mockStateUpdateCallback = jasmine.createSpy('mockStateUpdateCallback');

        playerComponent = new PlayerComponentWithMocks(
          playbackElement,
          corePlaybackData,
          windowType,
          opts.subtitlesEnabled || false,
          mockStateUpdateCallback
        );
      }

      beforeEach(function (done) {
        injector = new Squire();
        mockCaptionsContainer = jasmine.createSpyObj('CaptionsContainer', ['start', 'stop', 'updatePosition', 'tearDown']);
        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled']);

        mockPlugins = {
          interface: mockPluginsInterface
        };

        mockStrategy = MockStrategy();

        function mockCaptionsContainerConstructor () {
          return mockCaptionsContainer;
        }

        function mockStrategyConstructor () {
          return mockStrategy;
        }

        injector.mock({
          'bigscreenplayer/captionscontainer': mockCaptionsContainerConstructor,
          'bigscreenplayer/playbackstrategy/mockstrategy': mockStrategyConstructor,
          'bigscreenplayer/plugins': mockPlugins
        });

        injector.require(['bigscreenplayer/playercomponent'], function (PlayerComponent) {
          PlayerComponentWithMocks = PlayerComponent;
          done();
        });
      });

      describe('init', function () {
        it('should fire error cleared on the plugins', function () {
          var errorProperties = {
            seekable_range: '0 to 100',
            current_time: 10,
            duration: 100,
            dismissed_by: 'device'
          };

          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            properties: errorProperties,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);

          setUpPlayerComponent();

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });
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
        describe('when available', function () {
          it('should start subtitles', function () {
            setUpPlayerComponent({subtitlesAvailable: true});

            playerComponent.setSubtitlesEnabled(true);

            expect(mockCaptionsContainer.start).toHaveBeenCalledWith();
          });

          it('should stop subtitles', function () {
            setUpPlayerComponent({subtitlesAvailable: true});

            playerComponent.setSubtitlesEnabled(false);

            expect(mockCaptionsContainer.stop).toHaveBeenCalledWith();
          });
        });

        describe('when unavailable', function () {
          it('should not start subtitles', function () {
            setUpPlayerComponent({subtitlesAvailable: false});

            playerComponent.setSubtitlesEnabled(true);

            expect(mockCaptionsContainer.start).not.toHaveBeenCalled();
          });

          it('should not stop subtitles', function () {
            setUpPlayerComponent({subtitlesAvailable: false});

            playerComponent.setSubtitlesEnabled(false);

            expect(mockCaptionsContainer.stop).not.toHaveBeenCalled();
          });
        });
      });

      describe('isSubtitlesEnabled', function () {
        it('should return true if subtitles are enabled', function () {
          setUpPlayerComponent({subtitlesEnabled: true});

          expect(playerComponent.isSubtitlesEnabled()).toEqual(true);
        });

        it('should return false if subtitles are disabled', function () {
          setUpPlayerComponent({subtitlesEnabled: false});

          expect(playerComponent.isSubtitlesEnabled()).toEqual(false);
        });
      });

      describe('setTransportControlPosition', function () {
        it('should update the postion of subtitles', function () {
          setUpPlayerComponent();

          playerComponent.setTransportControlPosition(TransportControlPosition.CONTROLS_ONLY);

          expect(mockCaptionsContainer.updatePosition).toHaveBeenCalledWith(TransportControlPosition.CONTROLS_ONLY);
        });
      });

      describe('setCurrentTime', function () {
        it('should setCurrentTime on the strategy when in a seekable state', function () {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'setCurrentTime');

          playerComponent.setCurrentTime(10);

          expect(mockStrategy.setCurrentTime).toHaveBeenCalledWith(10);
        });
      });

      describe('events', function () {
        describe('on playing', function () {
          // playout logic
          it('should fire error cleared on the plugins', function () {
            var errorProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'device'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              properties: errorProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          // playout logic
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

          // playout logic
          it('should clear fatal error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          // playout logic
          it('should fire buffering cleared on the plugins', function () {
            var bufferingProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'device'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              properties: bufferingProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

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

          // playout logic
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

          // playout logic
          it('should clear fatal error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          // playout logic
          it('should fire error cleared on the plugins', function () {
            var errorProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'device'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              properties: errorProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          // playout logic
          it('should fire buffering cleared on the plugins', function () {
            var bufferingProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'device'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              properties: bufferingProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

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

            var bufferingProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'timeout'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              properties: bufferingProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            jasmine.clock().tick(30000);
            // error timeout when reached will fire a buffering cleared on the plugins.
            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));

            jasmine.clock().uninstall();
          });

          it('should fire error cleared on the plugins', function () {
            var errorProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'device'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              properties: errorProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should fire on buffering on the plugins', function () {
            var errorProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100
            };

            var pluginData = {
              status: PluginEnums.STATUS.STARTED,
              stateType: PluginEnums.TYPE.BUFFERING,
              properties: errorProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockPluginsInterface.onBuffering).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });
        });

        describe('on ended', function () {
          // playout logic
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

          // playout logic
          it('should clear fatal error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          // playout logic
          it('should fire error cleared on the plugins', function () {
            var errorProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'device'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              properties: errorProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          // playout logic
          it('should fire buffering cleared on the plugins', function () {
            var bufferingProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'device'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              properties: bufferingProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

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
            var bufferingProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              dismissed_by: 'error'
            };

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              properties: bufferingProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {code: '2110'}});

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

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            jasmine.clock().tick(1);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          // raise error
          it('should publish a media state update of waiting', function () {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.WAITING);
          });

          // raise error
          it('should fire on error on the plugins', function () {
            var errorProperties = {
              seekable_range: '0 to 100',
              current_time: 10,
              duration: 100,
              code: '2110'
            };

            var pluginData = {
              status: PluginEnums.STATUS.STARTED,
              stateType: PluginEnums.TYPE.ERROR,
              properties: errorProperties,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
            spyOn(mockStrategy, 'getDuration').and.returnValue(100);

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {code: '2110'}});

            expect(mockPluginsInterface.onError).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          // raise error
          it('should start the fatal error timeout', function () {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });
        });
      });

      describe('cdn failover', function () {
        var errorProperties;
        var pluginData;

        beforeEach(function () {
          jasmine.clock().install();
          errorProperties = {
            seekable_range: '0 to 100',
            current_time: 94,
            duration: 100
          };

          pluginData = {
            status: PluginEnums.STATUS.FATAL,
            stateType: PluginEnums.TYPE.ERROR,
            properties: errorProperties,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };
        });

        afterEach(function () {
          jasmine.clock().uninstall();
        });

        it('should failover after buffering for 30 seconds on initial playback', function () {
          var secondCdn = 'b';
          var currentTime = 10;
          var type = 'application/dash+xml';

          spyOn(mockStrategy, 'load');
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(currentTime);

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(29999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);

          expect(mockStrategy.load).toHaveBeenCalledWith(secondCdn, type, currentTime);
        });

        it('should failover after buffering for 20 seconds on normal playback', function () {
          var secondCdn = 'b';
          var currentTime = 10;
          var type = 'application/dash+xml';

          spyOn(mockStrategy, 'load');
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(currentTime);

          setUpPlayerComponent({multiCdn: true});

          // Set playback cause to normal
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(19999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(corePlaybackData.media.urls.length).toBe(3);
          expect(corePlaybackData.media.urls).toContain(jasmine.objectContaining({cdn: 'cdn-a'}));

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);

          expect(mockStrategy.load).toHaveBeenCalledWith(secondCdn, type, currentTime);

          expect(corePlaybackData.media.urls.length).toBe(2);
          expect(corePlaybackData.media.urls).not.toContain(jasmine.objectContaining({cdn: 'cdn-a'}));
        });

        it('should failover after 5 seconds if we have not cleared an error from the device', function () {
          var secondCdn = 'b';
          var currentTime = 10;
          var type = 'application/dash+xml';

          spyOn(mockStrategy, 'load');
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(currentTime);

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(4999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);

          expect(mockStrategy.load).toHaveBeenCalledWith(secondCdn, type, currentTime);
        });

        it('should fire a fatal error on the plugins if there is only one cdn', function () {
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(94);
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'load');

          setUpPlayerComponent();

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockPluginsInterface.onFatalError).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should publish a media state update of fatal if there is only one cdn', function () {
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(94);
          spyOn(mockStrategy, 'load');

          setUpPlayerComponent();

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.FATAL_ERROR);
        });

        it('should publish a media state update of fatal if playback is live hls', function () {
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(94);
          spyOn(mockStrategy, 'load');

          setUpPlayerComponent({multiCdn: true, manifestType: 'm3u8', windowType: WindowTypes.SLIDING});

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.FATAL_ERROR);
        });

        it('should failover after buffering for 20 seconds on live dash playback', function () {
          var secondCdn = 'b';
          var currentTime = 94;
          var type = 'application/dash+xml';

          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(currentTime);
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'load');

          setUpPlayerComponent({windowType: WindowTypes.SLIDING, multiCdn: true});

          // Set playback cause to normal
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(19999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);

          expect(mockStrategy.load).toHaveBeenCalledWith(secondCdn, type, currentTime);
        });

        it('should fire a fatal error on the plugins if we are in the last 5 seconds of playback', function () {
          errorProperties.current_time = 96;

          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(96);
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'load');

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockPluginsInterface.onFatalError).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should publish a media state update of fatal if we are in the last 5 seconds of playback', function () {
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(96);
          spyOn(mockStrategy, 'load');

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.FATAL_ERROR);
        });

        it('should fire an error handled event on the plugins with the new CDN', function () {
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(94);
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          var pluginData = {
            status: PluginEnums.STATUS.FAILOVER,
            stateType: PluginEnums.TYPE.ERROR,
            properties: errorProperties,
            isBufferingTimeoutError: false,
            cdn: 'cdn-b',
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          expect(mockPluginsInterface.onErrorHandled).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should reset the strategy', function () {
          spyOn(mockStrategy, 'reset');

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockStrategy.reset).toHaveBeenCalledWith();
        });

        // playout logic
        it('should clear error timeout', function () {
          setUpPlayerComponent({multiCdn: true});

          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(30000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);
        });

        // playout logic
        it('should clear fatal error timeout', function () {
          setUpPlayerComponent({multiCdn: true});

          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);
        });

        // playout logic
        it('should fire error cleared on the plugins', function () {
          var errorProperties = {
            seekable_range: '0 to 100',
            current_time: 10,
            duration: 100,
            dismissed_by: 'teardown'
          };

          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            properties: errorProperties,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent({multiCdn: true});

          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          jasmine.clock().tick(5000);

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        // playout logic
        it('should fire buffering cleared on the plugins', function () {
          var bufferingProperties = {
            seekable_range: '0 to 100',
            current_time: 10,
            duration: 100,
            dismissed_by: 'teardown'
          };

          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.BUFFERING,
            properties: bufferingProperties,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: true,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent({multiCdn: true});

          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);

          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

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

        // playout logic
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

        // playout logic
        it('should clear fatal error timeout', function () {
          jasmine.clock().install();

          setUpPlayerComponent();

          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

          playerComponent.tearDown();

          jasmine.clock().tick(5000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

          jasmine.clock().uninstall();
        });

        // playout logic
        it('should fire error cleared on the plugins', function () {
          var errorProperties = {
            seekable_range: '0 to 100',
            current_time: 10,
            duration: 100,
            dismissed_by: 'teardown'
          };

          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            properties: errorProperties,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);

          playerComponent.tearDown();

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        // playout logic
        it('should fire buffering cleared on the plugins', function () {
          var bufferingProperties = {
            seekable_range: '0 to 100',
            current_time: 10,
            duration: 100,
            dismissed_by: 'teardown'
          };

          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.BUFFERING,
            properties: bufferingProperties,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: true,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);

          playerComponent.tearDown();

          expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should tear down the strategy', function () {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'tearDown');

          playerComponent.tearDown();

          expect(mockStrategy.tearDown).toHaveBeenCalledWith();
        });

        it('should stop the captions container', function () {
          setUpPlayerComponent();

          playerComponent.tearDown();

          expect(mockCaptionsContainer.stop).toHaveBeenCalledWith();
        });
      });
    });
  }
);
