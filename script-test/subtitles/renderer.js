require(
  [
    'squire'
  ],
  function (Squire) {
    describe('Renderer', function () {
      var Renderer;
      var squire;
      var loadURLError = false;
      var pluginInterfaceMock;
      var pluginsMock;

      var loadUrlMock = function (url, callbackObject) {
        if (loadURLError) {
          callbackObject.onError();
        } else {
          callbackObject.onLoad('', 200);
        }
      };
      beforeEach(function (done) {
        loadURLError = false;

        pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesLoadError']);
        pluginsMock = {interface: pluginInterfaceMock};

        squire = new Squire();
        squire.mock({
          'bigscreenplayer/utils/loadurl': loadUrlMock,
          'bigscreenplayer/plugins': pluginsMock
        });
        squire.require(['bigscreenplayer/subtitles/renderer'], function (RendererWithMocks) {
          Renderer = RendererWithMocks;
          done();
        });
      });

      it('should initialise with a url, id and media player', function () {
        // Checking construction, not calling a real url...
        loadURLError = true;
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('http://some-url', 'subtitlesOutputId', mockMediaPlayer);

        expect(renderer).toEqual(jasmine.objectContaining({render: jasmine.any(Function), start: jasmine.any(Function), stop: jasmine.any(Function)}));
      });

      it('should report onSubtitlesLoadError when a captions url fails to load', function () {
        loadURLError = true;
        var mockMediaPlayer = jasmine.createSpy();
        Renderer('http://some-url', 'subtitlesOutputId', mockMediaPlayer);

        expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalled();
      });
    });
  }
);

