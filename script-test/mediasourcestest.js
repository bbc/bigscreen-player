require(
  [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/pluginenums',
    'squire',
    'bigscreenplayer/models/playbackstrategy'
  ],
  function (WindowTypes, LiveSupport, TransferFormats, PluginEnums, Squire, PlaybackStrategy) {
    describe('Media Sources', function () {
      var injector;
      var mockPlugins;
      var mockPluginsInterface;
      var mockTimeObject = { windowStartTime: 10, windowEndTime: 100, timeCorrection: 0 };
      var mockTransferFormat = TransferFormats.DASH;
      var MediaSources;

      var testSources;
      var testSubtitlesSources;
      var testMedia;
      var SEGMENT_LENGTH = 3.84;
      var testCallbacks;
      var triggerManifestLoadError = false;

      var mockManifestLoader;

      var currentStrategy = window.bigscreenPlayer.playbackStrategy;
      var triggerFailOnce;
      var hasFailedOnce;

      beforeEach(function (done) {
        injector = new Squire();
        testCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);
        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled']);

        mockPlugins = {
          interface: mockPluginsInterface
        };

        mockManifestLoader = {
          load: function (url, serverDate, callbacks) {
            if (triggerManifestLoadError) {
              if (triggerFailOnce) {
                if (hasFailedOnce) {
                  callbacks.onSuccess({transferFormat: mockTransferFormat, time: mockTimeObject});
                } else {
                  hasFailedOnce = true;
                  callbacks.onError();
                }
              } else {
                callbacks.onError();
              }
            } else {
              callbacks.onSuccess({transferFormat: mockTransferFormat, time: mockTimeObject});
            }
          }
        };

        spyOn(mockManifestLoader, 'load').and.callThrough();
        injector.mock({
          'bigscreenplayer/plugins': mockPlugins,
          'bigscreenplayer/manifest/manifestloader': mockManifestLoader
        });

        injector.require(['bigscreenplayer/mediasources'], function (SquiredMediaSources) {
          MediaSources = SquiredMediaSources;

          testSources = [
            {url: 'http://source1.com/', cdn: 'http://supplier1.com/'},
            {url: 'http://source2.com/', cdn: 'http://supplier2.com/'}
          ];
          testSubtitlesSources = [
            {url: 'http://subtitlessource1.com/', cdn: 'http://supplier1.com/', segmentLength: SEGMENT_LENGTH},
            {url: 'http://subtitlessource2.com/', cdn: 'http://supplier2.com/', segmentLength: SEGMENT_LENGTH}
          ];
          testMedia = {
            urls: testSources,
            captions: testSubtitlesSources
          };
          done();
        });
      });

      afterEach(function () {
        triggerManifestLoadError = false;
        triggerFailOnce = false;
        hasFailedOnce = false;
        testCallbacks.onSuccess.calls.reset();
        testCallbacks.onError.calls.reset();
        mockManifestLoader.load.calls.reset();

        window.bigscreenPlayer.playbackStrategy = currentStrategy;
      });

      describe('init', function () {
        it('throws an error when initialised with no sources', function () {
          expect(function () {
            var mediaSources = new MediaSources();
            testMedia.urls = [];
            mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
            mediaSources.currentSource();
          }).toThrow(new Error('Media Sources urls are undefined'));
        });

        it('clones the urls', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          testSources[0].url = 'clonetest';

          expect(mediaSources.currentSource()).toEqual('http://source1.com/');
        });

        it('throws an error when callbacks are undefined', function () {
          expect(function () {
            var mediaSources = new MediaSources();
            mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {});
          }).toThrow(new Error('Media Sources callbacks are undefined'));

          expect(function () {
            var mediaSources = new MediaSources();
            mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {onSuccess: function () {}});
          }).toThrow(new Error('Media Sources callbacks are undefined'));

          expect(function () {
            var mediaSources = new MediaSources();
            mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {onError: function () {}});
          }).toThrow(new Error('Media Sources callbacks are undefined'));
        });

        it('calls onSuccess callback immediately for STATIC window content', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
        });

        it('calls onSuccess callback immediately for LIVE content on a PLAYABLE device', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.PLAYABLE, testCallbacks);

          expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
        });

        it('calls onSuccess callback when manifest loader returns on success for SLIDING window content', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

          expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
        });

        it('calls onSuccess callback when manifest loader fails and there is a source to failover to that completes', function () {
          triggerManifestLoadError = true;
          triggerFailOnce = true;
          var mediaSources = new MediaSources();

          mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

          expect(testCallbacks.onSuccess).toHaveBeenCalledTimes(1);
        });

        it('calls onError callback when manifest loader fails and there are insufficent sources to failover to', function () {
          triggerManifestLoadError = true;
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

          expect(testCallbacks.onError).toHaveBeenCalledWith({error: 'manifest'});
        });

        it('sets time data correcly when manifest loader successfully returns', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.time()).toEqual(mockTimeObject);
        });

        it('overrides the subtitlesRequestTimeout when set in media object', function () {
          var mediaSources = new MediaSources();
          var overriddenTimeout = 60000;

          testMedia.subtitlesRequestTimeout = overriddenTimeout;
          mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.subtitlesRequestTimeout()).toEqual(overriddenTimeout);
        });
      });

      describe('failover', function () {
        var postFailoverAction;
        var onFailureAction;

        beforeEach(function () {
          postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          onFailureAction = jasmine.createSpy('onFailureAction', function () {});
        });

        it('should load the manifest from the next url if manifest load is required', function () {
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

          mockTransferFormat = TransferFormats.HLS;

          var serverDate = new Date();
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, serverDate, WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

          mockManifestLoader.load.calls.reset();

          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(mockManifestLoader.load).toHaveBeenCalledWith(testSources[1].url, serverDate, jasmine.anything());
        });

        it('When there are sources to failover to, it calls the post failover callback', function () {
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(postFailoverAction).toHaveBeenCalledWith();
          expect(onFailureAction).not.toHaveBeenCalledWith();
        });

        it('When there are no more sources to failover to, it calls failure action callback', function () {
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};
          testMedia.urls.pop();

          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(onFailureAction).toHaveBeenCalledWith();
          expect(postFailoverAction).not.toHaveBeenCalledWith();
        });

        it('When there are sources to failover to, it emits correct plugin event', function () {
          var failoverInfo = {errorMessage: 'test error', isBufferingTimeoutError: true};

          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          var pluginData = {
            status: PluginEnums.STATUS.FAILOVER,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: true,
            cdn: 'http://supplier1.com/',
            newCdn: 'http://supplier2.com/',
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          expect(mockPluginsInterface.onErrorHandled).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('Plugin event not emitted when there are no sources to failover to', function () {
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};
          testMedia.urls.pop();

          var mediaSources = new MediaSources();

          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(mockPluginsInterface.onErrorHandled).not.toHaveBeenCalled();
        });
      });

      describe('isFirstManifest', function () {
        it('does not failover if service location is identical to current source cdn besides path', function () {
          var mediaSources = new MediaSources();

          testMedia.urls = [
            { url: 'http://source1.com/path/to/thing.extension', cdn: 'http://cdn1.com' },
            { url: 'http://source2.com', cdn: 'http://cdn2.com' }];

          mediaSources.init(
            testMedia,
            new Date(),
            WindowTypes.STATIC,
            LiveSupport.SEEKABLE,
            testCallbacks);

          expect(mediaSources.currentSource()).toBe('http://source1.com/path/to/thing.extension');

          mediaSources.failover(
            function () { }, function () { },
            {
              duration: 999,
              currentTime: 1,
              errorMessage: '',
              isBufferingTimeoutError: false,
              serviceLocation: 'http://source1.com/path/to/different/thing.extension'
            });

          expect(mediaSources.currentSource()).toBe('http://source1.com/path/to/thing.extension');
        });

        it('does not failover if service location is identical to current source cdn besides hash and query', function () {
          var mediaSources = new MediaSources();

          testMedia.urls = [
            {url: 'http://source1.com', cdn: 'http://cdn1.com'},
            {url: 'http://source2.com', cdn: 'http://cdn2.com'}];

          mediaSources.init(
            testMedia,
            new Date(),
            WindowTypes.STATIC,
            LiveSupport.SEEKABLE,
            testCallbacks);

          expect(mediaSources.currentSource()).toBe('http://source1.com');

          mediaSources.failover(
            function () {}, function () {},
            {
              duration: 999,
              currentTime: 1,
              errorMessage: '',
              isBufferingTimeoutError: false,
              serviceLocation: 'http://source1.com?key=value#hash'});

          expect(mediaSources.currentSource()).toBe('http://source1.com');
        });
      });

      describe('currentSource', function () {
        beforeEach(function () {
          testSources = [
            {url: 'http://source1.com/', cdn: 'http://supplier1.com/'},
            {url: 'http://source2.com/', cdn: 'http://supplier2.com/'}
          ];
        });

        it('returns the first media source url', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.currentSource()).toBe(testSources[0].url);
        });

        it('returns the second media source following a failover', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(mediaSources.currentSource()).toBe(testSources[1].url);
        });
      });

      describe('currentSubtitlesSource', function () {
        it('returns the first subtitles source url', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.currentSubtitlesSource()).toBe(testSubtitlesSources[0].url);
        });

        it('returns the second subtitle source following a failover', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failoverSubtitles();

          expect(mediaSources.currentSubtitlesSource()).toBe(testSubtitlesSources[1].url);
        });
      });

      describe('currentSubtitlesSegmentLength', function () {
        it('returns the first subtitles segment length', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.currentSubtitlesSegmentLength()).toBe(SEGMENT_LENGTH);
        });
      });

      describe('currentSubtitlesCdn', function () {
        it('returns the first subtitles cdn', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, testSubtitlesSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.currentSubtitlesCdn()).toBe(testSources[0].cdn);
        });
      });

      describe('failoverSubtitles', function () {
        var postFailoverAction;
        var onFailureAction;

        beforeEach(function () {
          postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          onFailureAction = jasmine.createSpy('onFailureAction', function () {});
        });

        it('When there are subtitles sources to failover to, it calls the post failover callback', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failoverSubtitles(postFailoverAction, onFailureAction);

          expect(postFailoverAction).toHaveBeenCalledTimes(1);
          expect(onFailureAction).not.toHaveBeenCalled();
        });

        it('When there are no more subtitles sources to failover to, it calls failure action callback', function () {
          testMedia.captions.pop();

          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failoverSubtitles(postFailoverAction, onFailureAction);

          expect(onFailureAction).toHaveBeenCalledTimes(1);
          expect(postFailoverAction).not.toHaveBeenCalled();
        });
      });

      describe('availableSources', function () {
        it('returns an array of media source urls', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.availableSources()).toEqual(['http://source1.com/', 'http://source2.com/']);
        });
      });

      describe('should Failover', function () {
        var mediaSources;
        describe('when window type is STATIC', function () {
          beforeEach(function () {
            mediaSources = new MediaSources();
            mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          });

          it('should failover if current time is greater than 5 seconds from duration', function () {
            var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);

            var failoverParams = {
              duration: 100,
              currentTime: 94,
              errorMessage: 'test error',
              isBufferingTimeoutError: false
            };

            mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

            expect(mediaSourceCallbacks.onSuccess).toHaveBeenCalledTimes(1);
          });

          it('should not failover if current time is within 5 seconds of duration', function () {
            var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);

            var failoverParams = {
              duration: 100,
              currentTime: 96,
              errorMessage: 'test error',
              isBufferingTimeoutError: false
            };

            mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

            expect(mediaSourceCallbacks.onError).toHaveBeenCalledTimes(1);
          });

          it('should failover if playback has not yet started', function () {
            var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);

            var failoverParams = {
              duration: 0,
              currentTime: undefined,
              errorMessage: 'test error',
              isBufferingTimeoutError: false
            };

            mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

            expect(mediaSourceCallbacks.onSuccess).toHaveBeenCalledTimes(1);
          });
        });

        describe('when window type is not STATIC', function () {
          describe('and transfer format is DASH', function () {
            it('should not reload the manifest', function () {
              mediaSources = new MediaSources();
              mockTransferFormat = TransferFormats.DASH;
              mediaSources.init(testMedia, new Date(), WindowTypes.GROWING, LiveSupport.SEEKABLE, testCallbacks);

              var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);

              var failoverParams = {
                errorMessage: 'test error',
                isBufferingTimeoutError: false
              };

              mockManifestLoader.load.calls.reset();

              mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

              expect(mockManifestLoader.load).not.toHaveBeenCalled();
            });
          });

          describe('and transfer format is HLS', function () {
            it('should reload the manifest', function () {
              mediaSources = new MediaSources();
              mockTransferFormat = TransferFormats.HLS;
              mediaSources.init(testMedia, new Date(), WindowTypes.GROWING, LiveSupport.SEEKABLE, testCallbacks);

              var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);

              var failoverParams = {
                errorMessage: 'test error',
                isBufferingTimeoutError: false
              };

              mockManifestLoader.load.calls.reset();

              mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

              expect(mockManifestLoader.load).toHaveBeenCalledTimes(1);
            });
          });
        });
      });

      describe('refresh', function () {
        var mediaSources;
        beforeEach(function () {
          mediaSources = new MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);
        });

        it('updates the mediasources time data', function () {
          var existingSource = mediaSources.currentSource();

          var expectedTime = {
            windowStartTime: 1000000,
            windowEndTime: 1234567
          };

          // test the current time hasn't changed
          expect(mediaSources.time()).toEqual(mockTimeObject);

          // update it
          mockTimeObject = expectedTime;

          var callbacks = jasmine.createSpyObj('refreshCallbacks', ['onSuccess', 'onError']);
          mediaSources.refresh(callbacks.onSuccess, callbacks.onError);

          expect(mediaSources.time()).toEqual(expectedTime);
          expect(mediaSources.currentSource()).toEqual(existingSource);
        });
      });
    });
  }
);
