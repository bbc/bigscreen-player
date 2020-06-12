define(
  'bigscreenplayer/models/seekstate',
  /**
   * Provides an enumeration of possible media states.
   */
  function () {
    'use strict';

    /**
     * Enumeration of possible seek states.
     */
    var SeekState = {
      /** No seek in progress. */
      NONE: 0,
      /** A seek is about to be processed. */
      QUEUED: 1,
      /** A seek is in progress. */
      IN_FLIGHT: 2
    };

    return SeekState;
  }
);
