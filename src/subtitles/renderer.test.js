require(
  [
    'squire'
  ],
  function (Squire) {
    describe('Renderer', function () {
      var Renderer;
      var squire;
      var transformerMock;

      beforeEach(function (done) {
        transformerMock = function () {
          return {
            transformXML: function () {
              return {
                baseStyle: '',
                subtitlesForTime: function () {}
              };
            }
          };
        };

        squire = new Squire();
        squire.mock({
          'bigscreenplayer/subtitles/transformer': transformerMock
        });
        squire.require(['bigscreenplayer/subtitles/renderer'], function (RendererWithMocks) {
          Renderer = RendererWithMocks;
          done();
        });
      });

      it('should initialise with a id, xml object, media player', function () {
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer);

        expect(renderer).toEqual(jasmine.objectContaining({render: jasmine.any(Function), start: jasmine.any(Function), stop: jasmine.any(Function)}));
      });

      it('should set the output elements display style on initialisation', function () {
        var mockMediaPlayer = jasmine.createSpy();
        var renderer = Renderer('subtitlesOutputId', '', mockMediaPlayer);
        var outputElement = renderer.render();

        expect(outputElement.style.display).toBe('block');
      });
    });
  }
);

