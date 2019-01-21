define('bigscreenplayer/playbackstrategy/nativehtml5strategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/modifiers/html5'
  ],
  function (LegacyAdapter, WindowTypes, Html5Player) {
    return function (windowType, mediaKind, timeData, playbackElement, isUHD, config) {
      var mediaPlayer;
      config = {};

      if (windowType === WindowTypes.STATIC) {
        mediaPlayer = new Html5Player();
      } else {
        mediaPlayer = undefined; // device.getLivePlayer();
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, config, mediaPlayer);
    };
  });
