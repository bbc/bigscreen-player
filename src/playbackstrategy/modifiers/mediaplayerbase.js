const STATE = {
  EMPTY: "EMPTY", // No source set
  STOPPED: "STOPPED", // Source set but no playback
  BUFFERING: "BUFFERING", // Not enough data to play, waiting to download more
  PLAYING: "PLAYING", // Media is playing
  PAUSED: "PAUSED", // Media is paused
  COMPLETE: "COMPLETE", // Media has reached its end point
  ERROR: "ERROR", // An error occurred
}

const EVENT = {
  STOPPED: "stopped", // Event fired when playback is stopped
  BUFFERING: "buffering", // Event fired when playback has to suspend due to buffering
  PLAYING: "playing", // Event fired when starting (or resuming) playing of the media
  PAUSED: "paused", // Event fired when media playback pauses
  COMPLETE: "complete", // Event fired when media playback has reached the end of the media
  ERROR: "error", // Event fired when an error condition occurs
  STATUS: "status", // Event fired regularly during play
  METADATA: "metadata", // Event fired when media element loaded the init segment(s)
  SENTINEL_ENTER_BUFFERING: "sentinel-enter-buffering", // Event fired when a sentinel has to act because the device has started buffering but not reported it
  SENTINEL_EXIT_BUFFERING: "sentinel-exit-buffering", // Event fired when a sentinel has to act because the device has finished buffering but not reported it
  SENTINEL_PAUSE: "sentinel-pause", // Event fired when a sentinel has to act because the device has failed to pause when expected
  SENTINEL_PLAY: "sentinel-play", // Event fired when a sentinel has to act because the device has failed to play when expected
  SENTINEL_SEEK: "sentinel-seek", // Event fired when a sentinel has to act because the device has failed to seek to the correct location
  SENTINEL_COMPLETE: "sentinel-complete", // Event fired when a sentinel has to act because the device has completed the media but not reported it
  SENTINEL_PAUSE_FAILURE: "sentinel-pause-failure", // Event fired when the pause sentinel has failed twice, so it is giving up
  SENTINEL_SEEK_FAILURE: "sentinel-seek-failure", // Event fired when the seek sentinel has failed twice, so it is giving up
  SEEK_ATTEMPTED: "seek-attempted", // Event fired when a device using a seekfinishedemitevent modifier sets the source
  SEEK_FINISHED: "seek-finished", // Event fired when a device using a seekfinishedemitevent modifier has seeked successfully
}

const TYPE = {
  VIDEO: "video",
  AUDIO: "audio",
  LIVE_VIDEO: "live-video",
  LIVE_AUDIO: "live-audio",
}

function unpausedEventCheck(event) {
  return event != null && event.state && event.type !== "status" ? event.state !== STATE.PAUSED : undefined
}

export default {
  STATE,
  EVENT,
  TYPE,
  unpausedEventCheck,
}
