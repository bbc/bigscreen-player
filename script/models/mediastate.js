define(
  'bigscreenplayer/models/mediastate',
  /**
   * Provides an enumeration of possible media states.
   */
  function () {
    'use strict';

    /**
     * Enumeration of possible media states.
     */
    var MediaState = {
      /** Media is stopped and is not attempting to start. */
      STOPPED: 0,
      /** Media is paused. */
      PAUSED: 1,
      /** Media is playing successfully. */
      PLAYING: 2,
      /** Media is waiting for data (buffering). */
      WAITING: 4,
      /** Media is seeking backwards or forwards. */
      ENDED: 5,
      /** Media has thrown a fatal error. */
      FATAL_ERROR: 6,
      /** Manifest has failed to load/parse. */
      MANIFEST_ERROR: 7
    };

    return MediaState;
  }
);
