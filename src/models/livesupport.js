define(
  'bigscreenplayer/models/livesupport',
  function () {
    'use strict';

    var LiveSupport = {
      NONE: 'none',
      PLAYABLE: 'playable',
      RESTARTABLE: 'restartable',
      SEEKABLE: 'seekable'
    };

    return LiveSupport;
  }
);
