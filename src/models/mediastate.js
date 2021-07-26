var MediaState = {
  /** Media is stopped and is not attempting to start. */
  STOPPED: 0,
  /** Media is paused. */
  PAUSED: 1,
  /** Media is playing successfully. */
  PLAYING: 2,
  /** Media is waiting for data (buffering). */
  WAITING: 4,
  /** Media has ended. */
  ENDED: 5,
  /** Media has thrown a fatal error. */
  FATAL_ERROR: 6
};

/**
* Provides an enumeration of possible media states.
*/
export default MediaState;
