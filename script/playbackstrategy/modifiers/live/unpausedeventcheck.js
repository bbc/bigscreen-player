define('bigscreenplayer/playbackstrategy/modifiers/live/unpausedeventcheck',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
  function (MediaPlayerBase) {
    return function unpausedEventCheck (event) {
      return event.state !== MediaPlayerBase.STATE.PAUSED ;
    }
  }
);