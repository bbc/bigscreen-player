define('bigscreenplayer/playbackstrategy/nativehtml5strategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/live/seekable'
  ],
  function (LegacyAdapter, WindowTypes, Html5Player, LiveSeekablePlayer) {
    return function (windowType, mediaKind, timeData, playbackElement, isUHD, config) {
      var mediaPlayer;
      config = {}; // JUST FOR TESTING be warned

      if (windowType === WindowTypes.STATIC) {
        mediaPlayer = new Html5Player();
      } else {
        mediaPlayer = new LiveSeekablePlayer();
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, config, mediaPlayer);
    };
  });
