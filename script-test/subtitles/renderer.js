require(
  [
    'squire'
  ],
  function (Squire) {
    describe('Renderer', function () {
      var Renderer;
      var squire;
      beforeEach(function (done) {
        squire = new Squire();
        squire.mock({
          'bigscreenplayer/utils/loadurl': jasmine.createSpy()
        });
        squire.require(['bigscreenplayer/subtitles/renderer'], function (RendererWithMocks) {
          Renderer = RendererWithMocks;
          done();
        });
      });

      it('should initialise with a url, id and media player', function () {
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('http://some-url', 'subtitlesOutputId', mockMediaPlayer);

        expect(renderer).toEqual(jasmine.objectContaining({render: jasmine.any(Function), start: jasmine.any(Function), stop: jasmine.any(Function)}));
      });
    });
  }
);

