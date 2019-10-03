require(
  [
    'bigscreenplayer/playbackstrategy/growingwindowrefresher'
  ],
    function (GrowingWindowRefresher) {
      describe('GrowingWindowRefresher', function () {
        var mediaPlayerSpy;
        var growingWindowRefresher;
        var eventHandlers;
        var dashEventCallback;

        var dashjsMediaPlayerEvents = {
          ERROR: 'error',
          MANIFEST_LOADED: 'manifestLoaded'
        };

        beforeEach(function () {
          eventHandlers = {};
          mediaPlayerSpy = jasmine.createSpyObj('mediaPlayer', ['refreshManifest', 'on', 'off']);
          mediaPlayerSpy.on.and.callFake(function (eventType, handler) {
            eventHandlers[eventType] = handler;
          });

          dashEventCallback = function (eventType, event) {
            eventHandlers[eventType](event);
          };

          growingWindowRefresher = GrowingWindowRefresher(mediaPlayerSpy);
          jasmine.clock().install();
        });

        afterEach(function () {
          jasmine.clock().uninstall();
        });

        it('Start() refreshes the manifest at interval timeout ', function () {
          growingWindowRefresher.start();

          expect(mediaPlayerSpy.refreshManifest).not.toHaveBeenCalled();
          jasmine.clock().tick(60000);

          expect(mediaPlayerSpy.refreshManifest).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(60000);

          expect(mediaPlayerSpy.refreshManifest).toHaveBeenCalledTimes(2);
        });

        it('Stop() clears the refresh interval', function () {
          growingWindowRefresher.start();

          growingWindowRefresher.stop();
          jasmine.clock().tick(60000);

          expect(mediaPlayerSpy.refreshManifest).not.toHaveBeenCalled();
        });

        it('Seek() calls the given callback on media player load manifest event', function () {
          var seekCallbacksSpy = jasmine.createSpyObj('seekCallbacksSpy', ['onSuccess', 'onError']);
          growingWindowRefresher.seek(seekCallbacksSpy);

          dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, {});

          expect(seekCallbacksSpy.onSuccess).toHaveBeenCalled();
        });

        it('Seek() calls the given callback on manifest load error event', function () {
          var seekCallbacksSpy = jasmine.createSpyObj('seekCallbacksSpy', ['onSuccess', 'onError']);
          growingWindowRefresher.seek(seekCallbacksSpy);

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, {code: 25});

          expect(seekCallbacksSpy.onError).toHaveBeenCalled();
        });

        it('Seek() does not call the given error callback on dashjs non manifest load error', function () {
          var seekCallbacksSpy = jasmine.createSpyObj('seekCallbacksSpy', ['onSuccess', 'onError']);
          growingWindowRefresher.seek(seekCallbacksSpy);

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, {code: 100});

          expect(seekCallbacksSpy.onError).not.toHaveBeenCalled();
        });

        it('Seek() removes all listeners following manifest load event', function () {
          var seekCallbacksSpy = jasmine.createSpyObj('seekCallbacksSpy', ['onSuccess', 'onError']);
          growingWindowRefresher.seek(seekCallbacksSpy);

          dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, {});

          expect(mediaPlayerSpy.off).toHaveBeenCalledWith('manifestLoaded', eventHandlers.manifestLoaded);
          expect(mediaPlayerSpy.off).toHaveBeenCalledWith('error', eventHandlers.error);
        });

        it('Seek() removes all the listeners following a manifest error event', function () {
          var seekCallbacksSpy = jasmine.createSpyObj('seekCallbacksSpy', ['onSuccess', 'onError']);
          growingWindowRefresher.seek(seekCallbacksSpy);

          dashEventCallback(dashjsMediaPlayerEvents.ERROR, {code: 25});

          expect(mediaPlayerSpy.off).toHaveBeenCalledWith('manifestLoaded', eventHandlers.manifestLoaded);
          expect(mediaPlayerSpy.off).toHaveBeenCalledWith('error', eventHandlers.error);
        });

        it('Seek() attempts to refresh the manifest', function () {
          var seekCallbacksSpy = jasmine.createSpyObj('seekCallbacksSpy', ['onSuccess', 'onError']);
          growingWindowRefresher.seek(seekCallbacksSpy);

          expect(mediaPlayerSpy.refreshManifest).toHaveBeenCalledTimes(1);
        });
      });
    });

