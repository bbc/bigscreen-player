define(
  'bigscreenplayer/resizer',
  function () {
    'use strict';

    function resize (element, top, left, width, height, zIndex) {
      element.style.top = top + 'px';
      element.style.left = left + 'px';
      element.style.width = width + 'px';
      element.style.height = height + 'px';
      element.style.zIndex = zIndex + '';
      element.style.position = 'absolute';
    }

    function clearResize (element) {
      element.style.top = null;
      element.style.left = null;
      element.style.width = null;
      element.style.height = null;
      element.style.zIndex = null;
      element.style.position = null;
    }

    return {
      resize: resize,
      clearResize: clearResize
    };
  }
);

