require(
  ['bigscreenplayer/subtitles/renderer'],
  function (Renderer) {
    describe('Renderer', function () {
      it('should initialise with a url, id and media player', function () {
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('http://some-url', 'subtitlesOutputId', mockMediaPlayer);

        expect(renderer).toEqual(jasmine.objectContaining({render: jasmine.any(Function), start: jasmine.any(Function), stop: jasmine.any(Function)}));
      });
    });
  }
);

