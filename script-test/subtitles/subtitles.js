require(
  ['squire'],
  function (Squire) {
    var originalBSPWindowConfig = window.bigscreenPlayer;
    var loadURLError = false;
    var pluginInterfaceMock;
    var pluginsMock;

    var loadUrlMock = function (url, callbackObject) {
      if (loadURLError) {
        callbackObject.onError();
      } else {
        callbackObject.onLoad('', '', 200);
      }
    };

    describe('Subtitles', function () {
      afterAll(function () {
        window.bigscreenPlayer = originalBSPWindowConfig;
      });

      afterEach(function () {
        loadURLError = false;
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

          pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesLoadError']);
          pluginsMock = {interface: pluginInterfaceMock};

          var injector = new Squire();
          captionsMockSpy = jasmine.createSpy();
          window.bigscreenPlayer = {
            overrides: {
              legacySubtitles: true
            }
          };
          injector.mock({
            'bigscreenplayer/subtitles/legacysubtitles': captionsMockSpy,
            'bigscreenplayer/utils/loadurl': loadUrlMock,
            'bigscreenplayer/plugins': pluginsMock
          });
          injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
            Subtitles = Subs;
            done();
          });
        });

        it('initialises with the legacy subtitles module', function () {
          Subtitles();

          expect(captionsMockSpy).toHaveBeenCalled();
        });

        it('fires onSubtitlesLoadError plugin if loading of XML fails', function () {
          loadURLError = true;
          Subtitles();

          expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalled();
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

          injector.mock({
            'bigscreenplayer/subtitles/imscsubtitles': captionsMockSpy,
            'bigscreenplayer/utils/loadurl': loadUrlMock
          });
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
