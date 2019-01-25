define('bigscreenplayer/playbackstrategy/nativestrategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/live/' + window.bigscreenPlayer.liveSupport || 'playable'
  ],
  function (LegacyAdapter, WindowTypes, Html5Player, LivePlayer) {
    return function (windowType, mediaKind, timeData, playbackElement, isUHD, device) {
      var mediaPlayer;
      var tempConfig = device._config || {};
      if (windowType === WindowTypes.STATIC) {
        mediaPlayer = Html5Player();
      } else {
        mediaPlayer = LivePlayer(tempConfig);
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, device._config, mediaPlayer);
    };
  });
