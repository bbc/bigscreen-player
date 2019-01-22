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

      if (windowType === WindowTypes.STATIC) {
        mediaPlayer = Html5Player();
      } else {
        mediaPlayer = LiveSeekablePlayer();
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, device.getConfig(), mediaPlayer);
    };
  });
