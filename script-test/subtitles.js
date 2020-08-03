require(
  ['bigscreenplayer/subtitles'],
  function (Subtitles) {
    'use strict';
    describe('Subtitles ', function () {
      beforeEach(function () {
        // mock out hbbtv bits, squire out the network/render/ dependencies.
      });

      it('should be enabled when HBBTV subtitlesEnabled capability is true', function () {
        var subtitles = // Subtitles(url, mockDomElement, subtitlesStateCallback);

        expect(subtitles.enabled()).toBeTrue();
      });
    });
  }
);

