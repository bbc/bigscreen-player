define('bigscreenplayer/playbackstrategy/nativestrategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/live/' + (window.bigscreenPlayer.liveSupport || 'playable'),
    'bigscreenplayer/models/livesupport'
  ],
  function (LegacyAdapter, WindowTypes, Html5Player, LivePlayer, LiveSupport) {
    var NativeStrategy = function (windowType, mediaKind, timeData, playbackElement, isUHD, device) {
      var mediaPlayer;
      var logger = device.getLogger();
      var tempConfig = device.getConfig();

      if (windowType !== WindowTypes.STATIC) {
        var useFakeTime = window.bigscreenPlayer.liveSupport === LiveSupport.RESTARTABLE;
        var html5Player = Html5Player(logger, useFakeTime, windowType, timeData);
        mediaPlayer = LivePlayer(html5Player, tempConfig);
      } else {
        mediaPlayer = Html5Player(logger);
      }

      return LegacyAdapter(windowType, mediaKind, timeData, playbackElement, isUHD, device.getConfig(), mediaPlayer);
    };

    NativeStrategy.getLiveSupport = function () {
      return window.bigscreenPlayer.liveSupport;
    };

    return NativeStrategy;
  });
