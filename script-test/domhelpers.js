require(
  [
    'bigscreenplayer/domhelpers'
  ],
  function (DOMHelpers) {
    'use strict';

    describe('DOMHelpers', function () {
      it('Converts an RGBA tuple string to RGB tripple string', function () {
        expect(DOMHelpers.rgbaToRGB('#FFAAFFAA')).toBe('#FFAAFF');
      });

      it('Will return a RGB as it is', function () {
        expect(DOMHelpers.rgbaToRGB('#FFAAFF')).toBe('#FFAAFF');
      });

      it('Will return a non-RGBA as it is', function () {
        expect(DOMHelpers.rgbaToRGB('black')).toBe('black');
      });
    });
  }
);
