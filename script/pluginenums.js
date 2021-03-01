define(
  'bigscreenplayer/pluginenums',
  function () {
    'use strict';

    return {
      STATUS: {
        STARTED: 'started',
        DISMISSED: 'dismissed',
        FATAL: 'fatal',
        FAILOVER: 'failover'
      },
      TYPE: {
        BUFFERING: 'buffering',
        ERROR: 'error'
      }
    };
  }
);

