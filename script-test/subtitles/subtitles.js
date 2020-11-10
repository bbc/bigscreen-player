require(
  ['squire'],
  function (Squire) {
    var originalBSPWindowConfig = window.bigscreenPlayer;

    describe('Subtitles', function () {
      afterAll(function () {
        window.bigscreenPlayer = originalBSPWindowConfig;
      });

      describe('legacy implementation', function () {
        var captionsMockSpy;
        var Subtitles;

        beforeEach(function (done) {
          window.bigscreenPlayer = {
            overrides: {
              legacySubtitles: true
            }
          };

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

        it('initialises with the legacy subtitles module', function () {
          Subtitles();

          expect(captionsMockSpy).toHaveBeenCalled();
        });
      });

      describe('imsc library implementation', function () {
        var captionsMockSpy;
        var Subtitles;

        beforeEach(function (done) {
          window.bigscreenPlayer = {
            overrides: {
              legacySubtitles: false
            }
          };

          var injector = new Squire();
          captionsMockSpy = jasmine.createSpy();

          injector.mock({ 'bigscreenplayer/subtitles/imscsubtitles': captionsMockSpy });
          injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
            Subtitles = Subs;
            done();
          });
        });

        it('initialises with the imscjs module', function () {
          Subtitles();

          expect(captionsMockSpy).toHaveBeenCalled();
        });
      });
    });
  }
);
