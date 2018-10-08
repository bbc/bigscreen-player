require(
  [
    'bigscreenplayer/bigscreenplayer',
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/pausetriggers',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/playbackstrategy/mockstrategy'
  ],
    function (BigscreenPlayer, MediaState, WindowTypes, PauseTriggers, PluginEnums, MockStrategy) {
      var MediaPlayerLiveSupport = {
        NONE: 'none',
        PLAYABLE: 'playable',
        RESTARTABLE: 'restartable',
        SEEKABLE: 'seekable'
      };
      var bigscreenPlayer = BigscreenPlayer();
      var bigscreenPlayerData;
      var playbackElement;
      var mockStrategy = MockStrategy();

      function initialiseBigscreenPlayer (options) {
        // options = subtitlesAvailable, windowType, windowStartTime, windowEndTime
        options = options || {};

        var windowType = options.windowType || WindowTypes.STATIC;
        var liveSupport = options.liveSupport || MediaPlayerLiveSupport.SEEKABLE;
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
            bitrate: 'bitrate'
          },
          initialPlaybackTime: options.initialPlaybackTime
        };

        if (windowType === WindowTypes.SLIDING) {
          bigscreenPlayerData.time = {
            windowStartTime: options.windowStartTime !== undefined ? options.windowStartTime : 724000,
            windowEndTime: options.windowEndTime || 4324000
          };
        }

        if (options.subtitlesAvailable) {
          bigscreenPlayerData.media.captionsUrl = 'captions';
        }

        bigscreenPlayer.init(playbackElement, bigscreenPlayerData, windowType, subtitlesEnabled, liveSupport, device);
      }

      describe('Bigscreen Player', function () {
        var mockPlugin;
        beforeEach(function () {
          mockPlugin = jasmine.createSpyObj('plugin', ['onError', 'onFatalError', 'onErrorHandled', 'onErrorCleared', 'onBufferingCleared', 'onBuffering']);
        });

        afterEach(function () {
          bigscreenPlayer.tearDown();
          mockPlugin = undefined;
        });

        describe('init', function () {
          beforeEach(function () {
            bigscreenPlayer.tearDown();
          });

          it('should set endOfStream to true when playing live and no initial playback time is set', function () {
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(30);

            var callback = jasmine.createSpy();

            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});
            bigscreenPlayer.registerForTimeUpdates(callback);

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(callback).toHaveBeenCalledWith({currentTime: 30, endOfStream: true});
          });

          it('should set endOfStream to false when playing live and initialPlaybackTime is 0', function () {
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(0);

            var callback = jasmine.createSpy('listenerSimulcast');

            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING, initialPlaybackTime: 0});

            bigscreenPlayer.registerForTimeUpdates(callback);

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(callback).toHaveBeenCalledWith({currentTime: 0, endOfStream: false});
          });
        });

        describe('getPlayerElement', function () {
          it('Should call through to getPlayerElement on the playback strategy', function () {
            initialiseBigscreenPlayer();

            var mockedVideo = jasmine.createSpy('mockVideoElement');

            spyOn(mockStrategy, 'getPlayerElement').and.returnValue(mockedVideo);

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
            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(callback).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false});

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(callback).toHaveBeenCalledWith({state: MediaState.WAITING, endOfStream: false});
          });

          it('should set the pause trigger to the one set when a pause event comes back from strategy', function () {
            // set pause trigger to PauseTriggers.USER
            bigscreenPlayer.pause();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(callback).toHaveBeenCalledWith({state: MediaState.PAUSED, trigger: PauseTriggers.USER, endOfStream: false});
          });

          it('should set the pause trigger to device when a pause event comes back from strategy and a trigger is not set', function () {
            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(callback).toHaveBeenCalledWith({state: MediaState.PAUSED, trigger: PauseTriggers.DEVICE, endOfStream: false});
          });

          it('should set isBufferingTimeoutError when a fatal error event comes back from strategy', function () {
            jasmine.clock().install();

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            // five second timeout in playerComponent that triggers attemptCdnFailover,
            // if only one cdn exists then it fires a fatal error.
            jasmine.clock().tick(5000);

            expect(callback).toHaveBeenCalledWith({state: MediaState.FATAL_ERROR, isBufferingTimeoutError: false, endOfStream: false});

            jasmine.clock().uninstall();
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

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            bigscreenPlayer.unregisterForStateChanges(listener2);

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

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

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(listener1).toHaveBeenCalledWith({state: MediaState.PLAYING, endOfStream: false});
          });
        });

        describe('registerForTimeUpdates', function () {
          it('should call the callback when we get a timeupdate event from the strategy', function () {
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(60);

            var callback = jasmine.createSpy('listener1');
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerForTimeUpdates(callback);

            expect(callback).not.toHaveBeenCalled();

            mockStrategy.mockingHooks.fireTimeUpdate();

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

            mockStrategy.mockingHooks.fireTimeUpdate();

            bigscreenPlayer.unregisterForTimeUpdates(listener2);

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(listener1).toHaveBeenCalledTimes(2);
            expect(listener2).toHaveBeenCalledTimes(1);
            expect(listener3).toHaveBeenCalledTimes(2);
          });

          it('should only remove existing callbacks from timeUpdateCallbacks', function () {
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(60);

            initialiseBigscreenPlayer();

            var listener1 = jasmine.createSpy('listener1');
            var listener2 = jasmine.createSpy('listener2');

            bigscreenPlayer.registerForTimeUpdates(listener1);
            bigscreenPlayer.unregisterForTimeUpdates(listener2);

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(listener1).toHaveBeenCalledWith({currentTime: 60, endOfStream: false});
          });
        });

        describe('setCurrentTime', function () {
          it('should setCurrentTime on the strategy/playerComponent', function () {
            spyOn(mockStrategy, 'setCurrentTime');

            initialiseBigscreenPlayer();

            bigscreenPlayer.setCurrentTime(60);

            expect(mockStrategy.setCurrentTime).toHaveBeenCalledWith(60);
          });

          it('should not set current time on the strategy/playerComponent if bigscreen player is not initialised', function () {
            spyOn(mockStrategy, 'setCurrentTime');

            bigscreenPlayer.setCurrentTime(60);

            expect(mockStrategy.setCurrentTime).not.toHaveBeenCalled();
          });

          it('should set endOfStream to true when seeking to the end of a simulcast', function () {
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});
            var callback = jasmine.createSpy();
            var endOfStreamWindow = bigscreenPlayerData.time.windowEndTime - 2;

            bigscreenPlayer.registerForTimeUpdates(callback);

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: bigscreenPlayerData.time.windowStartTime, end: bigscreenPlayerData.time.windowEndTime});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(endOfStreamWindow);

            bigscreenPlayer.setCurrentTime(endOfStreamWindow);

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(callback).toHaveBeenCalledWith({currentTime: endOfStreamWindow, endOfStream: true});
          });

          it('should set endOfStream to false when seeking into a simulcast', function () {
            initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING});

            var callback = jasmine.createSpy();
            bigscreenPlayer.registerForTimeUpdates(callback);

            var middleOfStreamWindow = bigscreenPlayerData.time.windowEndTime / 2;

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: bigscreenPlayerData.time.windowStartTime, end: bigscreenPlayerData.time.windowEndTime});
            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(middleOfStreamWindow);

            bigscreenPlayer.setCurrentTime(middleOfStreamWindow);

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(callback).toHaveBeenCalledWith({currentTime: middleOfStreamWindow, endOfStream: false});
          });
        });

        describe('getCurrentTime', function () {
          it('should return the current time from the strategy', function () {
            initialiseBigscreenPlayer();

            spyOn(mockStrategy, 'getCurrentTime').and.returnValue(10);

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

            spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 10});

            expect(bigscreenPlayer.getSeekableRange().start).toEqual(0);
            expect(bigscreenPlayer.getSeekableRange().end).toEqual(10);
          });

          it('should return an empty object when bigscreen player has not been initialised', function () {
            expect(bigscreenPlayer.getSeekableRange()).toEqual({});
          });
        });

        describe('getDuration', function () {
          it('should get the duration from the strategy', function () {
            initialiseBigscreenPlayer();

            spyOn(mockStrategy, 'getDuration').and.returnValue(10);

            expect(bigscreenPlayer.getDuration()).toEqual(10);
          });

          it('should return undefined when not initialised', function () {
            expect(bigscreenPlayer.getDuration()).toBeUndefined();
          });
        });

        describe('isPaused', function () {
          it('should get the paused state from the strategy', function () {
            initialiseBigscreenPlayer();

            spyOn(mockStrategy, 'isPaused').and.returnValue(true);

            expect(bigscreenPlayer.isPaused()).toBe(true);
          });

          it('should return true if bigscreenPlayer has not been initialised', function () {
            expect(bigscreenPlayer.isPaused()).toBe(true);
          });
        });

        describe('isEnded', function () {
          it('should get the ended state from the strategy', function () {
            initialiseBigscreenPlayer();

            spyOn(mockStrategy, 'isEnded').and.returnValue(true);

            expect(bigscreenPlayer.isEnded()).toBe(true);
          });

          it('should return false if bigscreenPlayer has not been initialised', function () {
            expect(bigscreenPlayer.isEnded()).toBe(false);
          });
        });

        describe('play', function () {
          it('should call play on the strategy', function () {
            initialiseBigscreenPlayer();

            spyOn(mockStrategy, 'play');

            bigscreenPlayer.play();

            expect(mockStrategy.play).toHaveBeenCalledWith();
          });
        });

        describe('pause', function () {
          it('should call pause on the strategy', function () {
            var opts = {disableAutoResume: true};

            initialiseBigscreenPlayer();

            spyOn(mockStrategy, 'pause');

            bigscreenPlayer.pause(opts);

            expect(mockStrategy.pause).toHaveBeenCalledWith(jasmine.objectContaining({disableAutoResume: true}));
          });

          it('should set pauseTrigger to an app pause if user pause is false', function () {
            var opts = {userPause: false};

            initialiseBigscreenPlayer();

            var callback = jasmine.createSpy();

            bigscreenPlayer.registerForStateChanges(callback);

            bigscreenPlayer.pause(opts);

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(callback).toHaveBeenCalledWith(jasmine.objectContaining({trigger: PauseTriggers.APP}));
          });

          it('should set pauseTrigger to a user pause if user pause is true', function () {
            var opts = {userPause: true};

            initialiseBigscreenPlayer();

            var callback = jasmine.createSpy();

            bigscreenPlayer.registerForStateChanges(callback);

            bigscreenPlayer.pause(opts);

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(callback).toHaveBeenCalledWith(jasmine.objectContaining({trigger: PauseTriggers.USER}));
          });
        });

        describe('setSubtitlesEnabled', function () {
          it('should turn subtitles on/off when a value is passed in and they are available', function () {
            initialiseBigscreenPlayer({ subtitlesAvailable: true });

            expect(bigscreenPlayer.isSubtitlesEnabled()).toBe(false);

            bigscreenPlayer.setSubtitlesEnabled(true);

            expect(bigscreenPlayer.isSubtitlesEnabled()).toBe(true);

            bigscreenPlayer.setSubtitlesEnabled(false);

            expect(bigscreenPlayer.isSubtitlesEnabled()).toBe(false);
          });
        });

        describe('isSubtitlesEnabled', function () {
          it('should return true when setup with subtitles', function () {
            initialiseBigscreenPlayer({ subtitlesAvailable: true, subtitlesEnabled: true });

            expect(bigscreenPlayer.isSubtitlesEnabled()).toBe(true);
          });

          it('should return false if not specified on setup', function () {
            initialiseBigscreenPlayer({ subtitlesAvailable: true });

            expect(bigscreenPlayer.isSubtitlesEnabled()).toBe(false);
          });
        });

        describe('isSubtitlesAvailable', function () {
          it('should return true when subtitles are available', function () {
            initialiseBigscreenPlayer({ subtitlesAvailable: true });

            expect(bigscreenPlayer.isSubtitlesAvailable()).toBe(true);
          });

          it('should return false when subtitles are not available', function () {
            initialiseBigscreenPlayer({ subtitlesAvailable: false });

            expect(bigscreenPlayer.isSubtitlesAvailable()).toBe(false);
          });
        });

        describe('canSeek', function () {
          it('VOD should return true', function () {
            initialiseBigscreenPlayer();

            expect(bigscreenPlayer.canSeek()).toBe(true);
          });

          describe('live', function () {
            it('should return true when it can seek', function () {
              spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 60});

              initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING, liveSupport: MediaPlayerLiveSupport.SEEKABLE});

              expect(bigscreenPlayer.canSeek()).toBe(true);
            });

            it('should return false when seekable range is infinite', function () {
              spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: Infinity});

              initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING, liveSupport: MediaPlayerLiveSupport.SEEKABLE});

              expect(bigscreenPlayer.canSeek()).toBe(false);
            });

            it('should return false when window length less than four minutes', function () {
              spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 60});

              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING,
                liveSupport: MediaPlayerLiveSupport.SEEKABLE,
                windowStartTime: 0,
                windowEndTime: 239999
              });

              expect(bigscreenPlayer.canSeek()).toBe(false);
            });

            it('should return false when device does not support seeking', function () {
              spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 60});

              initialiseBigscreenPlayer({windowType: WindowTypes.SLIDING, liveSupport: MediaPlayerLiveSupport.RESTARTABLE});

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
              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING,
                liveSupport: MediaPlayerLiveSupport.RESTARTABLE
              });

              expect(bigscreenPlayer.canPause()).toBe(true);
            });

            it('should return false when window length less than four minutes', function () {
              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING,
                windowStartTime: 0,
                windowEndTime: 239999,
                liveSupport: MediaPlayerLiveSupport.RESTARTABLE
              });

              expect(bigscreenPlayer.canPause()).toBe(false);
            });

            it('should return false when device does not support pausing', function () {
              initialiseBigscreenPlayer({
                windowType: WindowTypes.SLIDING,
                liveSupport: MediaPlayerLiveSupport.PLAYABLE
              });

              expect(bigscreenPlayer.canPause()).toBe(false);
            });
          });
        });

        describe('convertVideoTimeSecondsToEpochMs', function () {
          it('converts video time to epoch time when windowStartTime is supplied', function () {
            initialiseBigscreenPlayer({
              windowType: WindowTypes.SLIDING,
              windowStartTime: 1500000000000
            });

            expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBe(1500001000000);
          });

          it('does not convert video time to epoch time when windowStartTime is not supplied', function () {
            initialiseBigscreenPlayer();

            expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBeUndefined();
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

          it('should call the plugin when we get an error from the strategy', function () {
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerPlugin(mockPlugin);

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            expect(mockPlugin.onError).toHaveBeenCalledWith(jasmine.objectContaining({status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.ERROR}));
          });

          it('should call the plugin when we fatal error', function () {
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerPlugin(mockPlugin);

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            jasmine.clock().tick(5000);

            expect(mockPlugin.onFatalError).toHaveBeenCalledWith(jasmine.objectContaining({status: PluginEnums.STATUS.FATAL, stateType: PluginEnums.TYPE.ERROR}));
          });

          it('should call the plugin when we failover', function () {
            initialiseBigscreenPlayer();
            bigscreenPlayerData.media.urls.push({url: 'b', cdn: 'cdn-b'}); // Add another cdn so we have one to failover too.

            bigscreenPlayer.registerPlugin(mockPlugin);

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            jasmine.clock().tick(5000);

            expect(mockPlugin.onErrorHandled).toHaveBeenCalledWith(jasmine.objectContaining({status: PluginEnums.STATUS.FAILOVER, stateType: PluginEnums.TYPE.ERROR}));
          });

          it('should call the plugin when we dismiss an error', function () {
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerPlugin(mockPlugin);

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockPlugin.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR}));
          });

          it('should call the plugin when we get a buffering event from the strategy', function () {
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerPlugin(mockPlugin);

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockPlugin.onBuffering).toHaveBeenCalledWith(jasmine.objectContaining({status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.BUFFERING}));
          });

          it('should call the plugin when we dismiss buffering', function () {
            initialiseBigscreenPlayer();
            bigscreenPlayer.registerPlugin(mockPlugin);

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockPlugin.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.BUFFERING}));
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
          });

          it('should remove a specific plugin', function () {
            bigscreenPlayer.unregisterPlugin(mockPlugin);

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            expect(mockPlugin.onError).not.toHaveBeenCalled();
            expect(mockPluginTwo.onError).toHaveBeenCalled();
          });

          it('should remove all plugins', function () {
            bigscreenPlayer.unregisterPlugin();

            mockStrategy.mockingHooks.fireErrorEvent({errorProperties: {}});

            expect(mockPlugin.onError).not.toHaveBeenCalled();
            expect(mockPluginTwo.onError).not.toHaveBeenCalled();
          });
        });
      });
    }
  );

