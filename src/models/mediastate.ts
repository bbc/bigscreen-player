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
  FATAL_ERROR: 6
};

export default MediaState;
