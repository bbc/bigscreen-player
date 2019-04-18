define(
  'bigscreenplayer/models/livesupportenum',
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
