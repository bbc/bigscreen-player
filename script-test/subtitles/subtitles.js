require(
  ['squire'],
  function (Squire) {
    var originalBSPWindowConfig = window.bigscreenPlayer;

    describe('Subtitles', function () {
      beforeAll(function () {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true
          }
        };
      });

      afterAll(function () {
        window.bigscreenPlayer = originalBSPWindowConfig;
      });

      describe('initialises with legacy implementation', function () {
        var captionsMockSpy;
        var Subtitles;
        beforeEach(function (done) {
          var injector = new Squire();
          captionsMockSpy = jasmine.createSpy();
          window.bigscreenPlayer = {
            overrides: {
              legacySubtitles: true
            }
          };
          injector.mock({ 'bigscreenplayer/subtitles/legacysubtitles': captionsMockSpy });
          injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
            Subtitles = Subs;
            done();
          });
        });

        it('initialise with the legacy captions', function () {
          Subtitles();

          expect(captionsMockSpy).toHaveBeenCalled();
        });
      });

      describe('initialises with imsc library implementation', function () {
        var captionsMockSpy;
        var Subtitles;
        beforeEach(function (done) {
          var injector = new Squire();
          captionsMockSpy = jasmine.createSpy();
          window.bigscreenPlayer = {
            overrides: {
              legacySubtitles: false
            }
          };
          injector.mock({ 'bigscreenplayer/subtitles/imscsubtitles': captionsMockSpy });
          injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
            Subtitles = Subs;
            done();
          });
        });

        it('initialise with the imscjs captions', function () {
          Subtitles();

          expect(captionsMockSpy).toHaveBeenCalled();
        });
      });
      // TODO : interface check in each strategy

      //   expect(subtitles).toEqual(jasmine.objectContaining({
      //     start: jasmine.any(Function),
      //     stop: jasmine.any(Function),
      //     setTransportControlsPosition: jasmine.any(Function) }));
    });
  }
);
