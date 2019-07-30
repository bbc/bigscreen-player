define('bigscreenplayer/playbackstrategy/nativestrategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayer',
    'bigscreenplayer/playbackstrategy/modifiers/live/' + (window.bigscreenPlayer.liveSupport || 'playable')
  ],
  function (LegacyAdapter, WindowTypes, MediaPlayer, LivePlayer) {
    var NativeStrategy = function (windowType, mediaKind, timeData, playbackElement, isUHD, device) {
      var mediaPlayer;
      var tempConfig = device.getConfig();

      mediaPlayer = MediaPlayer(tempConfig);
      if (windowType !== WindowTypes.STATIC) {
        mediaPlayer = LivePlayer(mediaPlayer, tempConfig, windowType, timeData);
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, device.getConfig(), mediaPlayer);
    };

    NativeStrategy.getLiveSupport = function () {
      return window.bigscreenPlayer.liveSupport;
    };

    return NativeStrategy;
  });
