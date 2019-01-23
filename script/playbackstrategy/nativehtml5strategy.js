define('bigscreenplayer/playbackstrategy/nativehtml5strategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/live/seekable'
  ],
  function (LegacyAdapter, WindowTypes, Html5Player, LiveSeekablePlayer) {
    return function (windowType, mediaKind, timeData, playbackElement, isUHD, device) {
      var mediaPlayer;
      var tempConfig = device._config || {};
      if (windowType === WindowTypes.STATIC) {
        mediaPlayer = Html5Player();
      } else {
        mediaPlayer = LiveSeekablePlayer(tempConfig);
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, device._config, mediaPlayer);
    };
  });
