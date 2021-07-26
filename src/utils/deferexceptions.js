define(
  'bigscreenplayer/utils/deferexceptions',
  function () {
    'use strict';
    return function deferExceptions (cb) {
      try {
        cb();
      } catch (e) {
        setTimeout(function () {
          throw e;
        }, 0);
      }
    };
  }
);
