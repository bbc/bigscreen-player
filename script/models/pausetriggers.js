define(
  'bigscreenplayer/models/pausetriggers',
  function () {
    'use strict';

    var PauseTriggers = {
      USER: 1,
      APP: 2,
      DEVICE: 3,
      SEEK: 4
    };

    return PauseTriggers;
  }
);
