define('bigscreenplayer/playbackstrategy/talstrategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes'
  ],
  function (LegacyAdapter, WindowTypes) {
    var TALStrategy = function (windowType, mediaKind, timeData, playbackElement, isUHD, device) {
      var mediaPlayer;

      if (windowType === WindowTypes.STATIC) {
        mediaPlayer = device.getMediaPlayer();
      } else {
        mediaPlayer = device.getLivePlayer();
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, device.getConfig(), mediaPlayer);
    };

    TALStrategy.getLiveSupport = function (device) {
      return device.getLiveSupport();
    };

    return TALStrategy;
  });
