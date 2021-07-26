define(
  'bigscreenplayer/utils/callcallbacks',
  [
    'bigscreenplayer/utils/deferexceptions'
  ],
  function (deferExceptions) {
    'use strict';
    return function callCallbacks (callbacks, data) {
      callbacks.forEach(function (callback) {
        deferExceptions(function () {
          callback(data);
        });
      });
    };
  }
);
