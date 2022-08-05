const MediaState = {
  /** Media is stopped and is not attempting to start. */
  STOPPED: 'stopped',
  /** Media is paused. */
  PAUSED: 'paused',
  /** Media is playing successfully. */
  PLAYING: 'playing',
  /** Media is waiting for data (buffering). */
  WAITING: 'waiting',
  /** Media has ended. */
  ENDED: 'ended',
  /** Media has thrown a fatal error. */
  FATAL_ERROR: 'fatal-error'
}

/**
* Provides an enumeration of possible media states.
*/
export default MediaState
