require(
  [
    'bigscreenplayer/domhelpers'
  ],
  function (DOMHelpers) {
    'use strict';

    describe('DOMHelpers', function () {
      it('returns false when attribute does not exist', function () {
        var pTag = document.createElement('p');

        expect(DOMHelpers.hasAttribute(pTag, 'thing')).toBeFalse();
      });

      it('returns true when attribute exists', function () {
        var pTag = document.createElement('p');
        pTag.setAttribute('thing', 'exists');

        expect(DOMHelpers.hasAttribute(pTag, 'thing')).toBeTrue();
      });

      it('Converts an RGBA tuple string to RGB tripple string', function () {
        expect(DOMHelpers.rgbaToRGB('#FFAAFFAA')).toBe('#FFAAFF');
      });

      it('Will return a RGB as it is', function () {
        expect(DOMHelpers.rgbaToRGB('#FFAAFF')).toBe('#FFAAFF');
      });

      it('Will return a non-RGBA as it is', function () {
        expect(DOMHelpers.rgbaToRGB('black')).toBe('black');
      });

      it('Will delete a node which has a parent', function () {
        var body = document.createElement('body');
        var child = document.createElement('p');
        body.appendChild(child);

        DOMHelpers.safeRemoveElement(child);

        expect(body.hasChildNodes()).toBeFalse();
      });

      it('Will do nothing when the node is detatched', function () {
        var node = document.createElement('p');

        expect(function () {
          DOMHelpers.safeRemoveElement(node);
        }).not.toThrow();
      });
    });
  }
);
