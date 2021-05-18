require(
  [
    'squire',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/mediasources',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/domhelpers'
  ],
  function (Squire, MediaKinds, WindowTypes, MediaSources, LiveSupport, DOMHelpers) {
    var injector = new Squire();
    var MSEStrategy;
    var mseStrategy;
    var eventCallbacks;
    var dashEventCallback;
    var eventHandlers = {};
    var playbackElement;
    var cdnArray = [];
    var mediaSources;
    var mediaSourcesTimeSpy;

    var mockDashjs;
    var mockDashInstance;
    var mockDashMediaPlayer;
    var mockPlugins;
    var mockPluginsInterface;
    var mockDynamicWindowUtils;
    var mockAudioElement = document.createElement('audio');
    var mockVideoElement = document.createElement('video');
    var testManifestObject;
    var timeUtilsMock;

    var dashjsMediaPlayerEvents = {
      ERROR: 'error',
      MANIFEST_LOADED: 'manifestLoaded',
      MANIFEST_VALIDITY_CHANGED: 'manifestValidityChanged',
      QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
      BASE_URL_SELECTED: 'baseUrlSelected',
      METRIC_ADDED: 'metricAdded',
      METRIC_CHANGED: 'metricChanged'
    };

    var mockTimeModel;

    describe('Media Source Extensions Playback Strategy', function () {
      beforeAll(function () {
        mockDashjs = jasmine.createSpyObj('mockDashjs', ['MediaPlayer']);
        mockDashMediaPlayer = jasmine.createSpyObj('mockDashMediaPlayer', ['create']);
        mockDashInstance = jasmine.createSpyObj('mockDashInstance',
          ['initialize', 'retrieveManifest', 'getDebug', 'getSource', 'on', 'off', 'time', 'duration', 'attachSource',
            'reset', 'isPaused', 'pause', 'play', 'seek', 'isReady', 'refreshManifest', 'getDashMetrics', 'getDashAdapter',
            'getBitrateInfoListFor', 'getAverageThroughput', 'getDVRWindowSize', 'updateSettings', 'setDuration', 'setPlaybackRate', 'getPlaybackRate']);
        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled', 'onPlayerInfoUpdated']);
        mockPlugins = {
          interface: mockPluginsInterface
        };
        mockDynamicWindowUtils = jasmine.createSpyObj('mockDynamicWindowUtils', ['autoResumeAtStartOfRange']);

        spyOn(mockVideoElement, 'addEventListener');
        spyOn(mockVideoElement, 'removeEventListener');

        mockVideoElement.addEventListener.and.callFake(function (eventType, handler) {
          eventHandlers[eventType] = handler;

          eventCallbacks = function (event) {
            eventHandlers[event].call(event);
          };
        });

        timeUtilsMock = jasmine.createSpyObj('timeUtilsMock', ['calculateSlidingWindowSeekOffset']);
        timeUtilsMock.calculateSlidingWindowSeekOffset.and.callFake(function (time) {
          return time;
        });

        mockDashjs.MediaPlayer.and.returnValue(mockDashMediaPlayer);
        mockDashMediaPlayer.create.and.returnValue(mockDashInstance);

        // For DVRInfo Based Seekable Range
        mockDashInstance.duration.and.returnValue(101);
        mockDashInstance.isReady.and.returnValue(true);
        mockDashInstance.getDVRWindowSize.and.returnValue(101);

        mockDashInstance.on.and.callFake(function (eventType, handler) {
          eventHandlers[eventType] = handler;

          dashEventCallback = function (eventType, event) {
            eventHandlers[eventType].call(eventType, event);
          };
        });

        mockDashInstance.getDashMetrics.and.returnValue({
          getCurrentDVRInfo: function () {
            return {
              range: {
                start: 0,
                end: 101
              }
            };
          },
          getCurrentBufferLevel: function () {
            return 'buffer';
          },
          getCurrentRepresentationSwitch: function () {
            return 0;
          },
          getCurrentIndexForRepresentation: function () {
            return 1;
          }
        });

        mockDashInstance.getDashAdapter.and.returnValue({
          getIndexForRepresentation: function () {
            return 0;
          }
        });
      });

      beforeEach(function (done) {
        window.dashjs = mockDashjs;
        playbackElement = document.createElement('div');
        playbackElement.id = 'app';
        document.body.appendChild(playbackElement);

        cdnArray = [
          { url: 'http://testcdn1/test/', cdn: 'http://testcdn1/test/' },
          { url: 'http://testcdn2/test/', cdn: 'http://testcdn2/test/' },
          { url: 'http://testcdn3/test/', cdn: 'http://testcdn3/test/' }
        ];

        var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);
        mediaSources = new MediaSources();
        mediaSourcesTimeSpy = spyOn(mediaSources, 'time');
        mediaSourcesTimeSpy.and.callThrough();
        spyOn(mediaSources, 'failover').and.callThrough();
        mediaSources.init({urls: cdnArray, captions: []}, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, mediaSourceCallbacks);

        testManifestObject = {
          type: 'manifestLoaded',
          data: {
            Period: {
              BaseURL: 'dash/'
            }
          }
        };

        injector.mock({
          'dashjs': mockDashjs,
          'bigscreenplayer/plugins': mockPlugins,
          'bigscreenplayer/dynamicwindowutils': mockDynamicWindowUtils,
          'bigscreenplayer/utils/timeutils': timeUtilsMock
        });

        injector.require(['bigscreenplayer/playbackstrategy/msestrategy'], function (SquiredMSEStrategy) {
          MSEStrategy = SquiredMSEStrategy;

          spyOn(document, 'createElement').and.callFake(function (elementType) {
            if (elementType === 'audio') {
              return mockAudioElement;
            } else if (elementType === 'video') {
              return mockVideoElement;
            }
          });
          done();
        });
      });

      afterEach(function () {
        mockVideoElement.currentTime = 0;
        DOMHelpers.safeRemoveElement(playbackElement);
        mockPluginsInterface.onErrorHandled.calls.reset();
        mockDashInstance.attachSource.calls.reset();
        mockDashInstance.seek.calls.reset();
        timeUtilsMock.calculateSlidingWindowSeekOffset.calls.reset();
      });

      function setUpMSE (timeCorrection, windowType, mediaKind, windowStartTimeMS, windowEndTimeMS) {
        var defaultWindowType = windowType || WindowTypes.STATIC;
        var defaultMediaKind = mediaKind || MediaKinds.VIDEO;

        mockTimeModel = {
          correction: timeCorrection || 0,
          windowStartTime: windowStartTimeMS || 0,
          windowEndTime: windowEndTimeMS || 0
        };

        mseStrategy = MSEStrategy(mediaSources, defaultWindowType, defaultMediaKind, playbackElement, {}, false);
      }

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

          mseStrategy.load(null, 0);

          expect(playbackElement.firstChild).toBe(mockVideoElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should create an audio element and add it to the media element', function () {
          setUpMSE(null, null, MediaKinds.AUDIO);

          expect(playbackElement.childElementCount).toBe(0);

          mseStrategy.load(null, 0);

          expect(playbackElement.firstChild).toBe(mockAudioElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should initialise MediaPlayer with the expected parameters when no start time is present', function () {
          setUpMSE();
          mseStrategy.load(null, undefined);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url);
        });

        it('should modify the manifest when dashjs fires a manifest loaded event', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject);

          var baseUrlArray = [
            {
              __text: cdnArray[0].url + 'dash/',
              'dvb:priority': 0,
              serviceLocation: cdnArray[0].url
            },
            {
              __text: cdnArray[1].url + 'dash/',
              'dvb:priority': 1,
              serviceLocation: cdnArray[1].url
            },
            {
              __text: cdnArray[2].url + 'dash/',
              'dvb:priority': 2,
              serviceLocation: cdnArray[2].url
            }
          ];

          expect(testManifestObject.data.BaseURL_asArray).toEqual(baseUrlArray);
        });

        describe('for STATIC window', function () {
          it('should initialise MediaPlayer with the expected parameters when startTime is zero', function () {
            setUpMSE();
            mseStrategy.load(null, 0);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url);
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set', function () {
            setUpMSE();
            mseStrategy.load(null, 15);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#t=15');
          });
        });

        describe('for SLIDING window', function () {
          it('should initialise MediaPlayer with the expected parameters when startTime is zero', function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load(null, 0);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url);
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set to 0.1', function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load(null, 0.1);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#r=0');
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set', function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO);

            mockDashInstance.getSource.and.returnValue('src');

            mseStrategy.load(null, 100);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#r=100');
          });
        });

        describe('for GROWING window', function () {
          beforeEach(function () {
            setUpMSE(0, WindowTypes.GROWING, MediaKinds.VIDEO, 100000, 200000);
            mediaSources.time.and.returnValue(mockTimeModel);
            mockDashInstance.getSource.and.returnValue('src');
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is zero', function () {
            mseStrategy.load(null, 0);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#t=101');
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set to 0.1', function () {
            mseStrategy.load(null, 0.1);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#t=101');
          });

          it('should initialise MediaPlayer with the expected parameters when startTime is set', function () {
            mseStrategy.load(null, 60);

            expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
            expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#t=160');
          });
        });

        it('should set up bindings to MediaPlayer Events correctly', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

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

      describe('Load when a mediaPlayer exists (e.g. CDN failover)', function () {
        var noop;
        var failoverInfo;
        beforeEach(function () {
          noop = function () { };
          failoverInfo = { errorMessage: 'failover', isBufferingTimeoutError: false };
        });

        it('should attach a new source with the expected parameters', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load(null, 0);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url);

          // Player component would do this with its buffering timeout logic
          mediaSources.failover(noop, noop, failoverInfo);

          mseStrategy.load(null, 0);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[1].url);
        });

        it('should attach a new source with the expected parameters called before we have a valid currentTime', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load(null, 45);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#t=45');

          mediaSources.failover(noop, noop, failoverInfo);
          mseStrategy.load(null, 0);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[1].url + '#t=45');

          mediaSources.failover(noop, noop, failoverInfo);
          mseStrategy.load(null, 0);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[2].url + '#t=45');
        });

        it('should attach a new source with expected parameters at the current playback time', function () {
          setUpMSE();

          mockDashInstance.getSource.and.returnValue('src');

          mseStrategy.load(null, 45);

          expect(mockDashInstance.initialize).toHaveBeenCalledWith(mockVideoElement, null, true);
          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[0].url + '#t=45');

          mediaSources.failover(noop, noop, failoverInfo);

          mockVideoElement.currentTime = 86;
          eventHandlers.timeupdate();
          mseStrategy.load(null, 0);

          expect(mockDashInstance.attachSource).toHaveBeenCalledWith(cdnArray[1].url + '#t=86');
        });

        it('should fire download error event when in growing window', function () {
          setUpMSE();

          mseStrategy.load(cdnArray, WindowTypes.GROWING, 3);

          eventHandlers.error({
            errorMessage: 'Boom'
          });

          expect(mockPluginsInterface.onErrorHandled).not.toHaveBeenCalledWith();
        });

        it('should call plugin handler on dash download manifest error', function () {
          setUpMSE();
          var mockErrorCallback = jasmine.createSpy();
          mseStrategy.addErrorCallback(null, mockErrorCallback);
          mseStrategy.load(cdnArray, WindowTypes.GROWING, 3);

          var testError = {
            error: {
              event: {
                id: 'manifest'
              }
            }
          };

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, testError);

          expect(mockErrorCallback).toHaveBeenCalled();
        });

        it('should call mediaSources failover on dash baseUrl changed event', function () {
          setUpMSE();
          mseStrategy.load(WindowTypes.STATIC, 10);

          expect(mediaSources.availableSources().length).toBe(3);
          dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject);

          eventHandlers.baseUrlSelected({
            baseUrl: {
              url: cdnArray[1].cdn,
              serviceLocation: cdnArray[1].cdn
            }
          });

          expect(mediaSources.availableSources().length).toBe(2);
        });

        it('should call mediaSources failover on dash baseUrl changed event but do nothing on the current url', function () {
          setUpMSE();
          mseStrategy.load(WindowTypes.STATIC, 10);

          expect(mediaSources.availableSources().length).toBe(3);
          dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, testManifestObject);

          eventHandlers.baseUrlSelected({
            baseUrl: {
              url: cdnArray[0].cdn,
              serviceLocation: cdnArray[0].cdn
            }
          });

          expect(mediaSources.availableSources().length).toBe(3);
        });
      });

      describe('getSeekableRange()', function () {
        it('returns the correct start and end time', function () {
          setUpMSE();
          mseStrategy.load(null, 45);

          expect(mseStrategy.getSeekableRange()).toEqual({ start: 0, end: 101 });
        });
      });

      describe('getCurrentTime()', function () {
        it('returns the correct time from the DASH Mediaplayer', function () {
          setUpMSE();
          mockVideoElement.currentTime = 10;

          mseStrategy.load(null, 0);

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

          mseStrategy.load(null, 0);

          expect(mseStrategy.getDuration()).toBe(101);
        });

        it('returns 0 when the MediaPlayer is undefined', function () {
          setUpMSE();

          expect(mseStrategy.getDuration()).toBe(0);
        });
      });

      describe('tearDown()', function () {
        it('should reset the MediaPlayer', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.tearDown();

          expect(mockDashInstance.reset).toHaveBeenCalledWith();
        });

        it('should tear down bindings to MediaPlayer Events correctly', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

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
          mseStrategy.load(null, 0);

          expect(playbackElement.childElementCount).toBe(1);

          mseStrategy.tearDown();

          expect(playbackElement.childElementCount).toBe(0);
        });

        it('should empty the eventCallbacks array and stop emitting events', function () {
          setUpMSE();
          function tearDownAndError () {
            mseStrategy.load(null, 0);
            mseStrategy.tearDown();
            dashEventCallback('pause');
          }

          expect(tearDownAndError).not.toThrowError();
        });
      });

      describe('isEnded()', function () {
        it('should be set to false on initialisation of the strategy', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          expect(mseStrategy.isEnded()).toBe(false);
        });

        it('should be set to true when we get an ended event', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          eventCallbacks('ended');

          expect(mseStrategy.isEnded()).toBe(true);
        });

        it('should be set to false when we get a playing event', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          eventCallbacks('playing');

          expect(mseStrategy.isEnded()).toBe(false);
        });

        it('should be set to false when we get a waiting event', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          eventCallbacks('waiting');

          expect(mseStrategy.isEnded()).toBe(false);
        });

        it('should be set to true when we get a completed event then false when we start initial buffering from playing', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          eventCallbacks('ended');

          expect(mseStrategy.isEnded()).toBe(true);

          eventCallbacks('waiting');

          expect(mseStrategy.isEnded()).toBe(false);
        });
      });

      describe('isPaused()', function () {
        it('should correctly return the paused state from the MediaPlayer when not paused', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mockDashInstance.isPaused.and.returnValue(false);

          expect(mseStrategy.isPaused()).toBe(false);
        });

        it('should correctly return the paused state from the MediaPlayer when paused', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mockDashInstance.isPaused.and.returnValue(true);

          expect(mseStrategy.isPaused()).toBe(true);
        });
      });

      describe('pause()', function () {
        it('should call through to MediaPlayer\'s pause function', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.pause();

          expect(mockDashInstance.pause).toHaveBeenCalledWith();
        });
      });

      describe('play()', function () {
        it('should call through to MediaPlayer\'s play function', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.play();

          expect(mockDashInstance.play).toHaveBeenCalledWith();
        });
      });

      describe('setCurrentTime()', function () {
        it('should call through to MediaPlayer\'s seek function', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.setCurrentTime(12);

          expect(mockDashInstance.seek).toHaveBeenCalledWith(12);
        });

        it('should clamp the seek to the start of the seekable range', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.setCurrentTime(-0.1);

          expect(mockDashInstance.seek).toHaveBeenCalledWith(0);
        });

        it('should clamp the seek to 1.1s before the end of the seekable range', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.setCurrentTime(101);

          expect(mockDashInstance.seek).toHaveBeenCalledWith(99.9);
        });

        describe('sliding window', function () {
          beforeEach(function () {
            setUpMSE(0, WindowTypes.SLIDING, MediaKinds.VIDEO, 100, 1000);
            mseStrategy.load(null, 0);
            mockDynamicWindowUtils.autoResumeAtStartOfRange.calls.reset();
            mockDashInstance.play.calls.reset();
          });

          it('should set current time on the video element', function () {
            mseStrategy.setCurrentTime(12);

            expect(mockDashInstance.seek).toHaveBeenCalledWith(12);
          });

          it('should always clamp the seek to the start of the seekable range', function () {
            mseStrategy.setCurrentTime(-0.1);

            expect(mockVideoElement.currentTime).toBe(0);
          });

          it('should always clamp the seek to 1.1s before the end of the seekable range', function () {
            mseStrategy.setCurrentTime(101);

            expect(mockDashInstance.seek).toHaveBeenCalledWith(99.9);
          });

          it('should start autoresume timeout when paused', function () {
            mseStrategy.pause();

            expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1);
          });

          it('should not start autoresume timeout when paused and disableAutoResume is set', function () {
            var opts = {
              disableAutoResume: true
            };

            mseStrategy.pause(opts);

            expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled();
          });

          it('It should calculate seek offset time when paused before seeking', function () {
            mseStrategy.pause();
            mseStrategy.setCurrentTime(101);

            expect(timeUtilsMock.calculateSlidingWindowSeekOffset).toHaveBeenCalledTimes(1);
          });

          it('should start auto resume timeout when paused and seeking', function () {
            mockDashInstance.isPaused.and.returnValue(true);

            mseStrategy.pause();
            mseStrategy.setCurrentTime();

            eventCallbacks('seeked');

            expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(2);
          });

          it('should not try to autoresume when playing and seeking', function () {
            mockDashInstance.isPaused.and.returnValue(false);

            mseStrategy.setCurrentTime();
            eventCallbacks('seeked');

            expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled();
          });
        });

        describe('growing window', function () {
          beforeEach(function () {
            setUpMSE(0, WindowTypes.GROWING);
            mseStrategy.load(null, 0);
            mockVideoElement.currentTime = 50;
            mockDashInstance.refreshManifest.calls.reset();
          });

          it('should perform a seek without refreshing the manifest if seek time is less than current time', function () {
            mseStrategy.setCurrentTime(40);

            expect(mockDashInstance.refreshManifest).not.toHaveBeenCalled();

            expect(mockDashInstance.seek).toHaveBeenCalledWith(40);
          });

          it('should call seek on media player with the original user requested seek time when manifest refreshes but doesnt have a duration', function () {
            mockDashInstance.refreshManifest.and.callFake(function (callback) {
              callback({});
            });

            mseStrategy.setCurrentTime(60);

            expect(mockDashInstance.seek).toHaveBeenCalledWith(60);
          });

          it('should call seek on media player with the time clamped to new end when manifest refreshes and contains a duration', function () {
            mockDashInstance.refreshManifest.and.callFake(function (callback) {
              callback({mediaPresentationDuration: 80});
            });

            mseStrategy.setCurrentTime(90);

            expect(mockDashInstance.seek).toHaveBeenCalledWith(78.9);
          });
        });
      });

      describe('Playback Rate', function () {
        it('should call through to MediaPlayer\'s setPlaybackRate function', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.setPlaybackRate(2);

          expect(mockDashInstance.setPlaybackRate).toHaveBeenCalledWith(2);
        });

        it('should call through to MediaPlayer\'s getPlaybackRate function', function () {
          setUpMSE();
          mseStrategy.load(null, 0);

          mseStrategy.getPlaybackRate();

          expect(mockDashInstance.getPlaybackRate).toHaveBeenCalled();
        });
      });

      describe('mseDurationOverride', function () {
        beforeEach(function () {
          // due to interaction with emitPlayerInfo()
          mockDashInstance.getBitrateInfoListFor.and.returnValue([{ bitrate: 1024000 }, { bitrate: 200000 }, { bitrate: 3000000 }]);
        });

        afterEach(function () {
          mockDashInstance.setDuration.calls.reset();
          delete window.bigscreenPlayer.overrides;
        });

        describe('overrides dynamic stream duration', function () {
          it('when mseDurationOverride configration property is true and window type is sliding', function () {
            window.bigscreenPlayer.overrides = {
              mseDurationOverride: true
            };

            setUpMSE(0, WindowTypes.SLIDING);
            mseStrategy.load(null, 0);

            eventHandlers.streamInitialized();

            expect(mockDashInstance.setDuration).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
          });

          it('when mseDurationOverride configration property is true and window type is growing', function () {
            window.bigscreenPlayer.overrides = {
              mseDurationOverride: true
            };

            setUpMSE(0, WindowTypes.GROWING);
            mseStrategy.load(null, 0);

            eventHandlers.streamInitialized();

            expect(mockDashInstance.setDuration).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
          });
        });

        describe('does not override stream duration', function () {
          it('when mseDurationOverride configration property is true and window type is static', function () {
            window.bigscreenPlayer.overrides = {
              mseDurationOverride: true
            };

            setUpMSE(0, WindowTypes.STATIC);
            mseStrategy.load(null, 0);

            eventHandlers.streamInitialized();

            expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
          });

          it('when mseDurationOverride configration property is false and window type is static', function () {
            window.bigscreenPlayer.overrides = {
              mseDurationOverride: false
            };

            setUpMSE(0, WindowTypes.STATIC);
            mseStrategy.load(null, 0);

            eventHandlers.streamInitialized();

            expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
          });

          it('when mseDurationOverride configration property is false and window type is sliding', function () {
            window.bigscreenPlayer.overrides = {
              mseDurationOverride: false
            };

            setUpMSE(0, WindowTypes.SLIDING);
            mseStrategy.load(null, 0);

            eventHandlers.streamInitialized();

            expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
          });

          it('when mseDurationOverride configration property is false and window type is growing', function () {
            window.bigscreenPlayer.overrides = {
              mseDurationOverride: false
            };

            setUpMSE(0, WindowTypes.GROWING);
            mseStrategy.load(null, 0);

            eventHandlers.streamInitialized();

            expect(mockDashInstance.setDuration).not.toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
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

        beforeEach(function () {
          mockPluginsInterface.onPlayerInfoUpdated.calls.reset();
        });

        it('should call plugins with the combined playback bitrate', function () {
          setUpMSE();
          mockDashInstance.getBitrateInfoListFor.and.returnValue([{ bitrate: 1024000 }, { bitrate: 200000 }, { bitrate: 3000000 }]);
          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.QUALITY_CHANGE_RENDERED, mockEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).toHaveBeenCalledWith({
            playbackBitrate: 2048,
            bufferLength: undefined
          });
        });

        it('should call plugins with video playback buffer length', function () {
          var mockBufferEvent = {
            mediaType: 'video',
            metric: 'BufferLevel'
          };

          setUpMSE();
          mseStrategy.load(null, 0);

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
          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.METRIC_ADDED, mockBufferEvent);

          expect(mockPluginsInterface.onPlayerInfoUpdated).not.toHaveBeenCalledWith();
        });
      });

      describe('dashJS BASE_URL_SELECTED event', function () {
        beforeEach(function () {
          mockPluginsInterface.onErrorHandled.calls.reset();
        });

        it('should not fire error handled event on initial load', function () {
          var mockEvent = {
            mediaType: 'video',
            type: 'baseUrlSelected',
            baseUrl: {
              serviceLocation: 'cdn1'
            }
          };

          setUpMSE();
          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.BASE_URL_SELECTED, mockEvent);

          expect(mockPluginsInterface.onErrorHandled).not.toHaveBeenCalledWith();
        });

        it('should not publish error event on initial segment download error', function () {
          var mockEvent = {
            error: {
              message: 'initial segment download error',
              code: 28
            }
          };

          setUpMSE();

          var mockErrorCallback = jasmine.createSpy();
          mseStrategy.addErrorCallback(null, mockErrorCallback);

          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent);

          expect(mockErrorCallback).not.toHaveBeenCalled();
        });

        it('should not publish error event on segment index download error', function () {
          var mockEvent = {
            error: {
              message: 'segment index download error',
              code: 26
            }
          };

          setUpMSE();

          var mockErrorCallback = jasmine.createSpy();
          mseStrategy.addErrorCallback(null, mockErrorCallback);

          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent);

          expect(mockErrorCallback).not.toHaveBeenCalled();
        });

        it('should not publish error event on content download error', function () {
          var mockEvent = {
            error: {
              message: 'content download error',
              code: 27
            }
          };

          setUpMSE();

          var mockErrorCallback = jasmine.createSpy();
          mseStrategy.addErrorCallback(null, mockErrorCallback);

          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent);

          expect(mockErrorCallback).not.toHaveBeenCalled();
        });

        it('should not publish error event on manifest download error', function () {
          var mockEvent = {
            error: {
              message: 'manifest download error',
              code: 25
            }
          };

          setUpMSE();

          var mockErrorCallback = jasmine.createSpy();
          mseStrategy.addErrorCallback(null, mockErrorCallback);

          mseStrategy.load(null, 0);

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent);

          expect(mockErrorCallback).not.toHaveBeenCalled();
        });

        it('should initiate a failover with correct parameters on manifest download error', function () {
          var mockEvent = {
            error: {
              message: 'manifest download error',
              code: 25
            }
          };

          setUpMSE();

          mseStrategy.load(null, 0);
          mockVideoElement.currentTime = 10;

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent);

          var failoverParams = {
            errorMessage: 'manifest-refresh',
            isBufferingTimeoutError: false,
            currentTime: mseStrategy.getCurrentTime(),
            duration: mseStrategy.getDuration()
          };

          expect(mediaSources.failover).toHaveBeenCalledWith(mseStrategy.load, jasmine.any(Function), failoverParams);
        });

        it('should publish an error event on manifest download error but there are no more sources to CDN failover to', function () {
          var mockEvent = {
            error: {
              message: 'manifest download error',
              code: 25
            }
          };

          var noop = function () {};
          mediaSources.failover(noop, noop, { errorMessage: 'failover', isBufferingTimeoutError: false });
          mediaSources.failover(noop, noop, { errorMessage: 'failover', isBufferingTimeoutError: false });

          setUpMSE();

          var mockErrorCallback = jasmine.createSpy();
          mseStrategy.addErrorCallback(null, mockErrorCallback);

          mseStrategy.load(null, 0);
          mockVideoElement.currentTime = 10;

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, mockEvent);

          expect(mockErrorCallback).toHaveBeenCalled();
        });
      });

      describe('seeking and waiting events', function () {
        var eventCallbackSpy;

        beforeEach(function () {
          setUpMSE();
          eventCallbackSpy = jasmine.createSpy();
          mseStrategy.addEventCallback(this, eventCallbackSpy);
          mseStrategy.load(null, 0);
          mseStrategy.play();
        });

        it('should call the event callback once when seeking', function () {
          mseStrategy.pause();

          mseStrategy.setCurrentTime(60);

          eventCallbacks('seeking');
          eventCallbacks('waiting');

          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should call the event callback more than once when not seeking', function () {
          eventCallbacks('waiting');
          eventCallbacks('waiting');

          expect(eventCallbackSpy).toHaveBeenCalledTimes(2);
        });
      });
    });
  });
