define(
  'bigscreenplayer/utils/deferexceptions',
  ['bigscreenplayer/debugger/debugtool'],
  function (DebugTool) {
    'use strict';
    return function deferExceptions (cb) {
      try {
        cb();
      } catch (e) {
        DebugTool.info('Exception: ' + e);
        setTimeout(function () {
          throw e;
        }, 0);
      }
    };
  }
);
