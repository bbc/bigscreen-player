define('bigscreenplayer/playbackstrategy/nativestrategy',
  [
    'bigscreenplayer/playbackstrategy/legacyplayeradapter',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/modifiers/' + (window.bigscreenPlayer.mediaPlayer || 'html5'),
    'bigscreenplayer/playbackstrategy/modifiers/live/' + (window.bigscreenPlayer.liveSupport || 'playable')
  ],
  function (LegacyAdapter, WindowTypes, MediaPlayer, LivePlayer) {
    var NativeStrategy = function (mediaSources, windowType, mediaKind, playbackElement, isUHD) {
      var mediaPlayer;

      mediaPlayer = MediaPlayer();
      if (windowType !== WindowTypes.STATIC) {
        mediaPlayer = LivePlayer(mediaPlayer, windowType, mediaSources);
      }

      return LegacyAdapter(mediaSources, windowType, playbackElement, isUHD, mediaPlayer);
    };

    NativeStrategy.getLiveSupport = function () {
      return window.bigscreenPlayer.liveSupport;
    };

    return NativeStrategy;
  });
