import Resizer from './resizer'

describe('Resizer', function () {
  var resizer, element;

  beforeEach(function () {
    element = document.createElement('div');
    element.style.top = '0px';
    element.style.left = '0px';
    element.style.width = '1280px';
    element.style.height = '720px';
    resizer = Resizer();
  });

  describe('resize', function () {
    it('Resizes and positions the element with the correct values', function () {
      resizer.resize(element, 10, 20, 3, 4, 5);

      expect(element.style.top).toEqual('10px');
      expect(element.style.left).toEqual('20px');
      expect(element.style.width).toEqual('3px');
      expect(element.style.height).toEqual('4px');
      expect(element.style.zIndex).toEqual('5');
      expect(element.style.position).toEqual('absolute');
    });
  });

  describe('clear', function () {
    it('resets the css properties', function () {
      resizer.resize(element, 1, 2, 3, 4, 5);
      resizer.clear(element);

      expect(element.style.top).toEqual('');
      expect(element.style.left).toEqual('');
      expect(element.style.width).toEqual('');
      expect(element.style.height).toEqual('');
      expect(element.style.zIndex).toEqual('');
      expect(element.style.position).toEqual('');
    });
  });

  describe('isResized', function () {
    it('should return false if no call to resize or clear has been made', function () {
      expect(resizer.isResized()).toBe(false);
    });

    it('should return true if the last call was to resized', function () {
      resizer.clear(element);
      resizer.resize(element, 1, 2, 3, 4, 5);

      expect(resizer.isResized()).toBe(true);
    });

    it('should return true if the last call was to clear', function () {
      resizer.resize(element, 1, 2, 3, 4, 5);
      resizer.clear(element);

      expect(resizer.isResized()).toBe(false);
    });
  });
});

