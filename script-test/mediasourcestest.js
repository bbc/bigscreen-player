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
      var MediaSources;

      var mediaSources;
      var testSources;

      beforeEach(function (done) {
        injector = new Squire();

        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled']);

        mockPlugins = {
          interface: mockPluginsInterface
        };

        injector.mock({
          'bigscreenplayer/plugins': mockPlugins
        });

        injector.require(['bigscreenplayer/mediasources'], function (SquiredMediaSources) {
          MediaSources = SquiredMediaSources;

          testSources = [
            {url: 'source1', cdn: 'supplier1'},
            {url: 'source2', cdn: 'supplier1'}
          ];
          mediaSources = new MediaSources(testSources);

          done();
        });
      });

      afterEach(function () {

      });

      // API Design - Command/Query segregation - explicit not implicit behaviour
      // failover - do something, its a command...
      // currentSource - query, just returns a value.
      // shouldFailover - query, doesn't feel right (tell don't ask)
      // availableSources - query, runs the risk of maintaining state somewhere else.

      describe('failover', function () {
        it('When there are sources to failover to, it calls the post failover callback', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});

          mediaSources.failover(postFailoverAction, onFailureAction);

          expect(postFailoverAction).toHaveBeenCalledWith();
          expect(onFailureAction).not.toHaveBeenCalledWith();
        });

        it('When there are no more sources to failover to, it calls failure action callback', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});

          mediaSources = new MediaSources([]);
          mediaSources.failover(postFailoverAction, onFailureAction);

          expect(onFailureAction).toHaveBeenCalledWith();
          expect(postFailoverAction).not.toHaveBeenCalledWith();
        });

        xit('When there are sources to failover to, it emits correct plugin event', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});

          mediaSources.failover(postFailoverAction, onFailureAction);

          var pluginData = {
            status: PluginEnums.STATUS.FAILOVER,
            stateType: PluginEnums.TYPE.ERROR,
            // properties: errorProperties,
            isBufferingTimeoutError: false,
            cdn: 'source1',
            newCdn: 'source2'
          };

          expect(mockPluginsInterface.onErrorHandled).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });
      });

      describe('currentSource', function () {
        it('returns the first media source url', function () {
          expect(mediaSources.currentSource()).toBe(testSources[0].url);
        });

        it('returns the second media source following a failover', function () {
          var postFailoverAction = jasmine.createSpy('postFailoverAction', function () {});
          var onFailureAction = jasmine.createSpy('onFailureAction', function () {});

          mediaSources.failover(postFailoverAction, onFailureAction);

          expect(mediaSources.currentSource()).toBe(testSources[1].url);
        });

        it('returns empty string if querying when there are no sources', function () {
          mediaSources = new MediaSources([]);

          expect(mediaSources.currentSource()).toBe('');
        });
      });

      describe('availableSources', function () {
        it('returns an array of media source urls', function () {
          expect(mediaSources.availableSources()).toEqual(['source1', 'source2']);
        });
      });

      describe('shouldFailover', function () {
        it('should return false when there are insufficient urls to failover', function () {
          mediaSources = new MediaSources([{url: 'source1', cdn: 'supplier1'}]);

          expect(mediaSources.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(false);
        });

        describe('when window type is STATIC', function () {
          it('should return true if current time is 5 seconds from duration', function () {
            expect(mediaSources.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(true);
            expect(mediaSources.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(true);
          });

          it('should return false if current time is within 5 seconds of duration', function () {
            expect(mediaSources.shouldFailover(100, 96, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(false);
            expect(mediaSources.shouldFailover(100, 96, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(false);
          });

          it('should return true if playback has not yet started', function () {
            expect(mediaSources.shouldFailover(0, undefined, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(true);
            expect(mediaSources.shouldFailover(0, undefined, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(true);
          });
        });

        describe('when window type is GROWING', function () {
          describe('and transfer format is DASH', function () {
            it('should return true', function () {
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
            });
          });

          describe('and transfer format is HLS', function () {
            it('should return correct value for live support', function () {
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(false);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
            });
          });
        });

        describe('when window type is SLIDING', function () {
          describe('and transfer format is DASH', function () {
            it('should return true', function () {
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
            });
          });

          describe('and transfer format is HLS', function () {
            it('should return correct value for live support', function () {
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(false);
              expect(mediaSources.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
            });
          });
        });
      });
    });
  }
);
