require(
  [
    'bigscreenplayer/playbackstrategy/growingwindowrefresher'
  ],
    function (GrowingWindowRefresher) {
      describe('GrowingWindowRefresher', function () {
        var mediaPlayerSpy;
        var eventHandlers;
        var dashEventCallback;
        var seekCallbacksSpy;

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

          seekCallbacksSpy = jasmine.createSpy('seekCallbacksSpy');
        });

        it('should instruct the media player to refresh the manifest', function () {
          GrowingWindowRefresher(mediaPlayerSpy, seekCallbacksSpy);

          expect(mediaPlayerSpy.refreshManifest).toHaveBeenCalledTimes(1);
        });

        it('calls the given callback on media player MANIFEST_LOADED event', function () {
          GrowingWindowRefresher(mediaPlayerSpy, seekCallbacksSpy);
          dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, {data: {mediaPresentationDuration: 100}});

          expect(seekCallbacksSpy).toHaveBeenCalled();
        });

        it('removes MANIFEST_LOADED listener following manifest load event', function () {
          GrowingWindowRefresher(mediaPlayerSpy, seekCallbacksSpy);
          dashEventCallback(dashjsMediaPlayerEvents.MANIFEST_LOADED, {data: {mediaPresentationDuration: 100}});

          expect(mediaPlayerSpy.off).toHaveBeenCalledWith('manifestLoaded', eventHandlers.manifestLoaded);
        });
      });
    });

