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
          ['initialize', 'getDebug', 'getSource', 'on', 'off', 'time', 'duration', 'attachSource',
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

      describe('Load', function () {
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

        it('should initialise MediaPlayer with the expected parameters', function () {
          setUpMSE();
          mseStrategy.load('src', null, 0);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src', true);
        });

        it('should initialise MediaPlayer with the expected parameters when no start time is present', function () {
          setUpMSE();
          mseStrategy.load('src', null, undefined);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src', true);
        });

        it('should initialise MediaPlayer with the expected parameters when startTime is set', function () {
          setUpMSE();
          mseStrategy.load('src', null, 15);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#t=15', true);
        });

        it('should initialise MediaPlayer with the expected parameters when startTime is set and there is a time correction', function () {
          setUpMSE(1922);
          mseStrategy.load('src', null, 15);
          // [ <video style="position: absolute; width: 100%; height: 100%;">, 'src#t=1937', true ]
          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#t=1937', true);
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

        it('should attach a new source when CDN Failover occurs', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, 0);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src', true);

          mseStrategy.load('src2', null, 0);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith('src2#t=0');
        });

        it('should correctly continue playback from resume point when CDN failover occurs before we have a valid currentTime', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, 45);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#t=45', true);

          mseStrategy.load('src2', null, 0);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith('src2#t=45');

          mseStrategy.load('src3', null, 0);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith('src3#t=45');
        });

        it('should correctly continue playback from reached time when CDN failover occurs', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');
          mockVideoElement.currentTime = 86;

          mseStrategy.load('src', null, 45);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#t=45', true);

          mseStrategy.load('src2', null, 86);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith('src2#t=86');
        });

        it('should playback from relative live start time for video simulcast', function () {
          setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

          mockDashInstance.getSource.and.returnValue('src');

            // Actual live point requested
          mseStrategy.load('src', null, 0);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#r=-1', true);
        });

        it('should playback from relative start time for video simulcast', function () {
          setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

          mockDashInstance.getSource.and.returnValue('src');

            // Somewhat live, playbackUtils forces 0.1 for TAL related reasons!
          mseStrategy.load('src', null, 0.1);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#r=0', true);
        });

        it('should playback from derived start time for webcast', function () {
          setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000);

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, 0.1);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#t=101', true);
        });

        it('should playback from the provided time of a webcast', function () {
          setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000);

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, 60);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src#t=160', true);
        });

        it('should playback from the live point of a webcast', function () {
          setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000);

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load('src', null, undefined);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, 'src', true);
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

      describe('getMediaPlayerInfo', function () {
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

        it('should call plugins with playback bitrate', function () {
          setUpMSE();
          mockDashInstance.getBitrateInfoListFor.and.returnValue([{bitrate: 1000}, {bitrate: 2000}, {bitrate: 3000}]);
          mseStrategy.load(null, null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, mockEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).toHaveBeenCalledWith({
            downloadBitrate: undefined,
            playbackBitrate: 2,
            bufferLength: undefined
          });
        });

        it('should call plugins with playback buffer length', function () {
          var mockBufferEvent = {
            mediaType: 'video',
            metric: 'BufferLevel'
          };

          setUpMSE();

          mockDashInstance.getMetricsFor.and.returnValue(true);
          mockDashInstance.getDashMetrics.and.returnValue({
            getCurrentBufferLevel: function () {
              return 'buffer';
            }
          });
          mseStrategy.load(null, null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).toHaveBeenCalledWith({
            downloadBitrate: undefined,
            playbackBitrate: undefined,
            bufferLength: 'buffer'
          });
        });

        it('should call plugins with playback download bitrate', function () {
          setUpMSE();
          mseStrategy.load(null, null, 0);

          mockDashInstance.getMetricsFor.and.returnValue(true);
          mockDashInstance.getDashMetrics.and.returnValue({
            getCurrentBufferLevel: function () {
              return 'buffer';
            }
          });
          mockDashInstance.getAverageThroughput.and.returnValue('bitrate');

          var mockBufferEvent = {
            mediaType: 'video',
            metric: 'BufferLevel'
          };

          dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).toHaveBeenCalledWith({
            downloadBitrate: 'bitrate',
            playbackBitrate: undefined,
            bufferLength: 'buffer'
          });
        });
      });
    });
  });
