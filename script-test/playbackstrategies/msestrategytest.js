require(
  [
    'squire',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/models/windowtypes'
  ],
  function (Squire, MediaKinds, WindowTypes) {
    describe('Media Source Extensions Playback Strategy', function () {
      var injector = new Squire();
      var playbackElement;
      var MSEStrategy;
      var mseStrategy;
      var mockDashInstance;
      var mockDashMediaPlayer;
      var mockDashDebug;
      var mockVideoElement;
      var eventCallbacks;
      var dashEventCallback;
      var eventHandlers = {};
      var mockPlugins;
      var mockPluginsInterface;

      var mockAudioElement = document.createElement('audio');

      var dashjsMediaPlayerEvents = {
        ERROR: 'error',
        MANIFEST_LOADED: 'manifestLoaded',
        MANIFEST_VALIDITY_CHANGED: 'manifestValidityChanged',
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
        METRIC_ADDED: 'metricAdded'
      };

      var mockDashjs = jasmine.createSpyObj('mockDashjs', ['MediaPlayer']);
      mockDashMediaPlayer = jasmine.createSpyObj('mockDashMediaPlayer', ['create']);

      beforeEach(function (done) {
        injector.mock({
          'dashjs': mockDashjs
        });

        injector.require(['bigscreenplayer/playbackstrategy/msestrategy'], function (SquiredMSEStrategy) {
          MSEStrategy = SquiredMSEStrategy;
          done();
        });
      });

      function setUpMSE (timeCorrection, windowType, mediaKind, windowStartTimeMS, windowEndTimeMS) {
        var defaultWindowType = windowType || WindowTypes.STATIC;
        var defaultMediaKind = mediaKind || MediaKinds.VIDEO;

        var timeModel = {
          correction: timeCorrection || 0,
          windowStartTime: windowStartTimeMS || 0,
          windowEndTime: windowEndTimeMS || 0
        };

        mockVideoElement = document.createElement('video');

        mockVideoElement.currentTime = 0;

        spyOn(mockVideoElement, 'addEventListener');
        spyOn(mockVideoElement, 'removeEventListener');

        playbackElement = document.createElement('div');
        playbackElement.id = 'app';
        document.body.appendChild(playbackElement);

        mseStrategy = MSEStrategy(defaultWindowType, defaultMediaKind, timeModel, playbackElement);

        mockDashDebug = jasmine.createSpyObj('mockDashDebug', ['setLogToBrowserConsole']);

        mockDashInstance = jasmine.createSpyObj('mockDashInstance',
          ['initialize', 'retrieveManifest', 'getDebug', 'getSource', 'on', 'off', 'time', 'duration', 'attachSource',
            'reset', 'isPaused', 'pause', 'play', 'seek', 'isReady', 'refreshManifest', 'getDashMetrics', 'getMetricsFor', 'setBufferToKeep',
            'setBufferAheadToKeep', 'setBufferTimeAtTopQuality', 'setBufferTimeAtTopQualityLongForm', 'getBitrateInfoListFor', 'getAverageThroughput']);

        mockDashInstance.duration.and.returnValue(101);

        mockDashjs.MediaPlayer.and.returnValue(mockDashMediaPlayer);
        mockDashMediaPlayer.create.and.returnValue(mockDashInstance);

        mockDashInstance.on.and.callFake(function (eventType, handler) {
          eventHandlers[eventType] = handler;

          dashEventCallback = function (eventType, event) {
            eventHandlers[eventType].call(eventType, event);
          };
        });

        mockVideoElement.addEventListener.and.callFake(function (eventType, handler) {
          eventHandlers[eventType] = handler;

          eventCallbacks = function (event) {
            eventHandlers[event].call(event);
          };
        });

        // For DVRInfo Based Seekable Range
        mockDashInstance.isReady.and.returnValue(true);
        mockDashInstance.getDashMetrics.and.returnValue({
          getCurrentDVRInfo: function () {
            return {range: {
              start: 0,
              end: 101
            }};
          }
        });

        window.dashjs = mockDashjs;

        spyOn(document, 'createElement').and.callFake(function (elementType) {
          if (elementType === 'audio') {
            return mockAudioElement;
          } else if (elementType === 'video') {
            return mockVideoElement;
          }
        });

        mockDashInstance.getDebug.and.returnValue(mockDashDebug);
      }

      afterEach(function () {
        mockVideoElement.currentTime = 0;
        document.body.removeChild(playbackElement);
      });

      describe('Transitions', function () {
        it('canBePaused() Transition is true', function () {
          setUpMSE();

          expect(mseStrategy.transitions.canBePaused()).toBe(true);
        });

        it('canBeginSeek() Transition is true', function () {
          setUpMSE();

          expect(mseStrategy.transitions.canBeginSeek()).toBe(true);
        });
      });

      describe('Load when there is no mediaPlayer', function () {
        it('should create a video element and add it to the media element', function () {
          setUpMSE(null, null, MediaKinds.VIDEO);

          expect(playbackElement.childElementCount).toBe(0);

          mseStrategy.load('src', null, 0);

          expect(playbackElement.firstChild).toBe(mockVideoElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should create an audio element and add it to the media element', function () {
          setUpMSE(null, null, MediaKinds.AUDIO);

          expect(playbackElement.childElementCount).toBe(0);

          mseStrategy.load('src', null, 0);

          expect(playbackElement.firstChild).toBe(mockAudioElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should initialise MediaPlayer with the expected parameters when no start time is present', function () {
          setUpMSE();
          mseStrategy.load('src', null, undefined);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src', jasmine.any(Function));
        });

        describe('for STATIC window', function () {
          it('should initialise MediaPlayer with the expected parameters when startTime is zero', function () {
            setUpMSE();
            mseStrategy.load('src', null, 0);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src', jasmine.any(Function));
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set', function () {
            setUpMSE();
            mseStrategy.load('src', null, 15);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#t=15', jasmine.any(Function));
          });
        });

        describe('for SLIDING window', function () {
          it('should initialise MediaPlayer with the expected parameters when startTime is zero', function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load('src', null, 0);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src', jasmine.any(Function));
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set to 0.1', function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load('src', null, 0.1);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#r=0', jasmine.any(Function));
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set', function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load('src', null, 100);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#r=100', jasmine.any(Function));
          });
        });

        describe('for GROWING window', function () {
          it('should initialise MediaPlayer with the expected parameters when startTime is zero', function () {
            setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load('src', null, 0);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#t=101', jasmine.any(Function));
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set to 0.1', function () {
            setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load('src', null, 0.1);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#t=101', jasmine.any(Function));
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set', function () {
            setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load('src', null, 60);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#t=160', jasmine.any(Function));
          });
        });

        it('should set up bindings to MediaPlayer Events correctly', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('timeupdate', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('playing', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('pause', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('waiting', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('seeking', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('seeked', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('ended', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
          expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.ERROR, jasmine.any(Function));
          expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.MANIFEST_LOADED, jasmine.any(Function));
          expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, jasmine.any(Function));
          expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, jasmine.any(Function));
          expect(mockDashInstance.on).toHaveBeenCalledWith(dashjsMediaPlayerEvents.METRIC_ADDED, jasmine.any(Function));
        });
      });

      describe('Load when there a mediaPlayer exists (e.g. CDN failover)', function () {
        it('should attach a new source with the expected parameters', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, 0);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src', jasmine.any(Function));

          mseStrategy.load('src2', null, 0);

          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src2', jasmine.any(Function));
        });

        it('should a new source with the expected parameters called before we have a valid currentTime', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, 45);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#t=45', jasmine.any(Function));

          mseStrategy.load('src2', null, 0);

          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src2#t=45', jasmine.any(Function));

          mseStrategy.load('src3', null, 0);

          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src3#t=45', jasmine.any(Function));
        });

        it('should attach a new source with expected parameters at the current playback time', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, 45);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src#t=45', jasmine.any(Function));

          mockVideoElement.currentTime = 86;
          eventHandlers.timeupdate();
          mseStrategy.load('src2', null, 0);

          expect(mockDashInstance.retrieveManifest).toHaveBeenCalledWith('src2#t=86', jasmine.any(Function));
        });
      });

      describe('getSeekableRange()', function () {
        it('returns the correct start and end time', function () {
          setUpMSE();
          mseStrategy.load('src', null, 45);

          expect(mseStrategy.getSeekableRange()).toEqual({start: 0, end: 101});
        });
      });

      describe('getCurrentTime()', function () {
        it('returns the correct time from the DASH Mediaplayer', function () {
          setUpMSE();
          mockVideoElement.currentTime = 10;

          mseStrategy.load('src', null, 0);

          expect(mseStrategy.getCurrentTime()).toBe(10);
        });

        it('returns 0 when MediaPlayer is undefined', function () {
          setUpMSE();

          expect(mseStrategy.getCurrentTime()).toBe(0);
        });
      });

      describe('getDuration()', function () {
        it('returns the correct duration from the DASH Mediaplayer', function () {
          setUpMSE();

          mseStrategy.load('src', null, 0);

          expect(mseStrategy.getDuration()).toBe(101);
        });

        it('returns 0 when MediaPlayer is undefined', function () {
          setUpMSE();

          expect(mseStrategy.getDuration()).toBe(0);
        });
      });

      describe('tearDown()', function () {
        it('should reset the MediaPlayer', function () {
          setUpMSE();
          mseStrategy.load('src', null, 0);

          mseStrategy.tearDown();

          expect(mockDashInstance.reset).toHaveBeenCalled();
        });

        it('should tear down bindings to MediaPlayer Events correctly', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mseStrategy.tearDown();

          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('timeupdate', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('playing', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('pause', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('waiting', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('seeking', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('seeked', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('ended', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
          expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.ERROR, jasmine.any(Function));
          expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, jasmine.any(Function));
          expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.METRIC_ADDED, jasmine.any(Function));
          expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.MANIFEST_LOADED, jasmine.any(Function));
          expect(mockDashInstance.off).toHaveBeenCalledWith(dashjsMediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, jasmine.any(Function));
        });

        it('should remove the video element', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          expect(playbackElement.childElementCount).toBe(1);

          mseStrategy.tearDown();

          expect(playbackElement.childElementCount).toBe(0);
        });
      });

      describe('isEnded()', function () {
        it('should be set to false on initialisation of the strategy', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          expect(mseStrategy.isEnded()).toBe(false);
        });

        it('should be set to true when we get an ended event', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          eventCallbacks('ended');

          expect(mseStrategy.isEnded()).toBe(true);
        });

        it('should be set to false when we get a playing event', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          eventCallbacks('playing');

          expect(mseStrategy.isEnded()).toBe(false);
        });

        it('should be set to false when we get a waiting event', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          eventCallbacks('waiting');

          expect(mseStrategy.isEnded()).toBe(false);
        });

        it('should be set to true when we get a completed event then false when we start initial buffering from playing', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          eventCallbacks('ended');

          expect(mseStrategy.isEnded()).toBe(true);

          eventCallbacks('waiting');

          expect(mseStrategy.isEnded()).toBe(false);
        });
      });

      describe('isPaused()', function () {
        it('should correctly return the paused state from the MediaPlayer when not paused', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mockDashInstance.isPaused.and.returnValue(false);

          expect(mseStrategy.isPaused()).toBe(false);
        });

        it('should correctly return the paused state from the MediaPlayer when paused', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mockDashInstance.isPaused.and.returnValue(true);

          expect(mseStrategy.isPaused()).toBe(true);
        });
      });

      describe('pause()', function () {
        it('should call through to MediaPlayer\'s pause function', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mseStrategy.pause();

          expect(mockDashInstance.pause).toHaveBeenCalled();
        });
      });

      describe('play()', function () {
        it('should call through to MediaPlayer\'s play function', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mseStrategy.play();

          expect(mockDashInstance.play).toHaveBeenCalled();
        });
      });

      describe('setCurrentTime()', function () {
        it('should call through to MediaPlayer\'s seek function', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mseStrategy.setCurrentTime(12);

          expect(mockDashInstance.seek).toHaveBeenCalledWith(12);
        });

        it('should clamp the seek to the start of the seekable range', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mseStrategy.setCurrentTime(-0.1);

          expect(mockDashInstance.seek).toHaveBeenCalledWith(0);
        });

        it('should clamp the seek to 1.1s before the end of the seekable range', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mseStrategy.setCurrentTime(101);

          expect(mockDashInstance.seek).toHaveBeenCalledWith(99.9);
        });

        it('should refresh the DASH manifest before seeking  within a growing window asset', function () {
          setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO);
          mseStrategy.load(null, null, 0);

          mseStrategy.setCurrentTime(102);

          expect(mockDashInstance.refreshManifest).toHaveBeenCalled();
          expect(mockDashInstance.seek).toHaveBeenCalledWith(99.9);
        });

        describe('sliding window', function () {
          beforeEach(function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);
            mseStrategy.load(null, null, 0);
          });

          it('should set current time on the video element', function () {
            mseStrategy.setCurrentTime(12);

            expect(mockVideoElement.currentTime).toBe(12);
          });

          it('should clamp the seek to the start of the seekable range', function () {
            mseStrategy.setCurrentTime(-0.1);

            expect(mockVideoElement.currentTime).toBe(0);
          });

          it('should clamp the seek to 1.1s before the end of the seekable range', function () {
            mseStrategy.setCurrentTime(101);

            expect(mockVideoElement.currentTime).toBe(99.9);
          });
        });
      });

      describe('onMetricAdded and onQualityChangeRendered', function () {
        var mockEvent = {
          mediaType: 'video',
          oldQuality: 0,
          newQuality: 1,
          type: 'qualityChangeRendered'
        };

        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled', 'onPlayerInfoUpdated']);

        mockPlugins = {
          interface: mockPluginsInterface
        };

        injector.mock({'bigscreenplayer/plugins': mockPlugins});

        beforeEach(function () {
          mockPluginsInterface.onPlayerInfoUpdated.calls.reset();
        });

        it('should call plugins with video playback bitrate', function () {
          setUpMSE();
          mockDashInstance.getBitrateInfoListFor.and.returnValue([{bitrate: 1000}, {bitrate: 2048}, {bitrate: 3000}]);
          mseStrategy.load(null, null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, mockEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).toHaveBeenCalledWith({
            playbackBitrate: 2.048,
            bufferLength: undefined
          });
        });

        it('should not call plugins with audio playback bitrate when mediaKind is video', function () {
          var mockEvent = {
            mediaType: 'audio',
            oldQuality: 0,
            newQuality: 1,
            type: 'qualityChangeRendered'
          };

          setUpMSE();
          mockDashInstance.getBitrateInfoListFor.and.returnValue([{bitrate: 1000}, {bitrate: 2048}, {bitrate: 3000}]);
          mseStrategy.load(null, null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, mockEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).not.toHaveBeenCalled();
        });

        it('should call plugins with video playback buffer length', function () {
          var mockBufferEvent = {
            mediaType: 'video',
            metric: 'BufferLevel'
          };

          setUpMSE();
          mseStrategy.load(null, null, 0);

          mockDashInstance.getMetricsFor.and.returnValue(true);
          mockDashInstance.getDashMetrics.and.returnValue({
            getCurrentBufferLevel: function () {
              return 'buffer';
            }
          });

          dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).toHaveBeenCalledWith({
            playbackBitrate: undefined,
            bufferLength: 'buffer'
          });
        });

        it('should not call plugins with audio playback buffer length when mediaKind is video', function () {
          var mockBufferEvent = {
            mediaType: 'audio',
            metric: 'BufferLevel'
          };

          setUpMSE();
          mseStrategy.load(null, null, 0);

          mockDashInstance.getMetricsFor.and.returnValue(true);
          mockDashInstance.getDashMetrics.and.returnValue({
            getCurrentBufferLevel: function () {
              return 'buffer';
            }
          });

          dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).not.toHaveBeenCalled();
        });
      });
    });
  });
