require(
  [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/pluginenums',
    'squire'
  ],
  function (WindowTypes, LiveSupport, TransferFormats, PluginEnums, Squire) {
    describe('Media Sources', function () {
      var injector;
      var mockPlugins;
      var mockPluginsInterface;
      var mockTimeObject = { windowStartTime: 10, windowEndTime: 100, timeCorrection: 0 };
      var mockTransferFormat = 'dash';
      var MediaSources;

      var testSources;
      var testCallbacks;
      var triggerManifestLoadError = false;

      var mockManifestLoader;

      beforeEach(function (done) {
        injector = new Squire();
        testCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);
        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled']);

        mockPlugins = {
          interface: mockPluginsInterface
        };

        mockManifestLoader = {
          load: function (urls, serverDate, callbacks) {
            if (triggerManifestLoadError) {
              callbacks.onError();
            } else {
              callbacks.onSuccess({transferFormat: mockTransferFormat, time: mockTimeObject});
            }
          }
        };

        injector.mock({
          'bigscreenplayer/plugins': mockPlugins,
          'bigscreenplayer/manifest/manifestloader': mockManifestLoader
        });

        injector.require(['bigscreenplayer/mediasources'], function (SquiredMediaSources) {
          MediaSources = SquiredMediaSources;

          testSources = [
            {url: 'source1', cdn: 'supplier1'},
            {url: 'source2', cdn: 'supplier2'}
          ];
          done();
        });
      });

      afterEach(function () {
        triggerManifestLoadError = false;
        testCallbacks.onSuccess.calls.reset();
        testCallbacks.onError.calls.reset();
      });

      describe('construction', function () {
        it('throws an error when constructed with no sources', function () {
          expect(function () {
            var mediaSources = new MediaSources();
            mediaSources.init([], new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
            mediaSources.currentSource();
          }).toThrow(new Error('Media Sources urls are undefined'));
        });

        it('clones the urls', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          testSources[0].url = 'clonetest';

          expect(mediaSources.currentSource()).toEqual('source1');
        });

        it('throws an error when callbacks are undefined', function () {
          expect(function () {
            var mediaSources = new MediaSources();
            mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {});
            mediaSources.currentSource();
          }).toThrow(new Error('Media Sources callbacks are undefined'));

          expect(function () {
            var mediaSources = new MediaSources();
            mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {onSuccess: function () {}});
            mediaSources.currentSource();
          }).toThrow(new Error('Media Sources callbacks are undefined'));

          expect(function () {
            var mediaSources = new MediaSources();
            mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {onError: function () {}});
            mediaSources.currentSource();
          }).toThrow(new Error('Media Sources callbacks are undefined'));
        });

        it('calls onSuccess callback immediately for STATIC window content', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.currentSource();

          expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
        });

        it('calls onSuccess callback immediately for LIVE content on a PLAYABLE device', function () {
          testCallbacks.onSuccess.calls.reset();
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.SLIDING, LiveSupport.PLAYABLE, testCallbacks);
          mediaSources.currentSource();

          expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
        });

        it('calls onSuccess callback when manifest loader returns on success for SLIDING window content', function () {
          testCallbacks.onSuccess.calls.reset();
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.currentSource();

          expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
        });

        it('sets time data correcly when manifest loader successfully returns', function () {
          testCallbacks.onSuccess.calls.reset();
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.time()).toEqual(mockTimeObject);
        });

        it('calls onError callback when manifest loader fails and there are insufficent sources to failover to', function () {
          testCallbacks.onError.calls.reset();
          triggerManifestLoadError = true;
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.currentSource();

          expect(testCallbacks.onError).toHaveBeenCalledWith({error: 'manifest'});
        });
      });

      describe('failover', function () {
        it('When there are sources to failover to, it calls the post failover callback', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(postFailoverAction).toHaveBeenCalledWith();
          expect(onFailureAction).not.toHaveBeenCalledWith();
        });

        it('When there are no more sources to failover to, it calls failure action callback', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

          var mediaSources = new MediaSources();
          mediaSources.init([{url: 'source1', cdn: 'supplier1'}], new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(onFailureAction).toHaveBeenCalledWith();
          expect(postFailoverAction).not.toHaveBeenCalledWith();
        });

        it('When there are sources to failover to, it emits correct plugin event', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});

          var failoverInfo = {
            errorMessage: 'test error',
            isBufferingTimeoutError: true
          };

          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          var pluginData = {
            status: PluginEnums.STATUS.FAILOVER,
            stateType: PluginEnums.TYPE.ERROR,
            properties: {error_mssg: 'test error'},
            isBufferingTimeoutError: true,
            cdn: 'supplier1',
            newCdn: 'supplier2',
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          expect(mockPluginsInterface.onErrorHandled).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('Plugin event not emitted when there are no sources to failover to', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

          var mediaSources = new MediaSources();
          mediaSources.init([{url: 'source1', cdn: 'supplier1'}], new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(mockPluginsInterface.onErrorHandled).not.toHaveBeenCalled();
        });
      });

      describe('currentSource', function () {
        beforeEach(function () {
          testSources = [
            {url: 'source1', cdn: 'supplier1'},
            {url: 'source2', cdn: 'supplier2'}
          ];
        });

        it('returns the first media source url', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.currentSource()).toBe(testSources[0].url);
        });

        it('returns the second media source following a failover', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});
          var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
          mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

          expect(mediaSources.currentSource()).toBe(testSources[1].url);
        });
      });

      describe('availableSources', function () {
        it('returns an array of media source urls', function () {
          var mediaSources = new MediaSources();
          mediaSources.init(testSources, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

          expect(mediaSources.availableSources()).toEqual(['source1', 'source2']);
        });
      });

      // describe('shouldFailover', function () {
      //   var mediaSources;
      //   it('should return false when there are insufficient urls to failover', function () {
      //     var mediaSources = new MediaSources();
      // mediaSources.init([{url: 'source1', cdn: 'supplier1'}], new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

      //     expect(mediaSources.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(false);
      //   });

      //   describe('when window type is STATIC', function () {
      //     beforeEach(function () {
      //       mediaSources = new MediaSources();
      // mediaSources.init([{url: 'source1', cdn: 'supplier1'}], new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      //     });

      //     it('should return true if current time is 5 seconds from duration', function () {
      //       expect(mediaSources.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(true);
      //       expect(mediaSources.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(true);
      //     });

      //     it('should return false if current time is within 5 seconds of duration', function () {
      //       expect(mediaSources.shouldFailover(100, 96, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(false);
      //       expect(mediaSources.shouldFailover(100, 96, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(false);
      //     });

      //     it('should return true if playback has not yet started', function () {
      //       expect(mediaSources.shouldFailover(0, undefined, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(true);
      //       expect(mediaSources.shouldFailover(0, undefined, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(true);
      //     });
      //   });

      //   describe('when window type is GROWING', function () {
      //     beforeEach(function () {
      //       mediaSources = new MediaSources();
      // mediaSources.init([{url: 'source1', cdn: 'supplier1'}], new Date(), WindowTypes.GROWING, LiveSupport.SEEKABLE, testCallbacks);
      //     });

      //     describe('and transfer format is DASH', function () {
      //       it('should return true', function () {
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
      //       });
      //     });

      //     describe('and transfer format is HLS', function () {
      //       it('should return correct value for live support', function () {
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(false);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
      //       });
      //     });
      //   });

      //   describe('when window type is SLIDING', function () {
      //     beforeEach(function () {
      //       mediaSources = new MediaSources();
      // mediaSources.init([{url: 'source1', cdn: 'supplier1'}], new Date(), WindowTypes.GROWING, LiveSupport.SEEKABLE, testCallbacks);
      //     });

      //     describe('with transfer format DASH', function () {
      //       it('will return true', function () {
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
      //       });
      //     });

      //     describe('with transfer format HLS', function () {
      //       it('should return the correct value for live support', function () {
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(false);
      //         expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
      //       });
      //     });
      //   });
      // });
    });
  }
);
