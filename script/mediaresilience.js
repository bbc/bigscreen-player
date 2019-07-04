define(
  'bigscreenplayer/mediaresilience', [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/playbackstrategy',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats'
  ],
  function (WindowTypes, PlaybackStrategy, LiveSupport, TransferFormats) {
    'use strict';

    function shouldFailover (remainingUrls, duration, currentTime, liveSupport, windowType, transferFormat) {
      var aboutToEnd = duration && currentTime > duration - 5;
      var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
      var shouldLiveFailover = windowType !== WindowTypes.STATIC && window.bigscreenPlayer.playbackStrategy !== PlaybackStrategy.TAL;
      return remainingUrls > 1 && (shouldStaticFailover || shouldLiveFailover);
    }

    return {
      shouldFailover: shouldFailover
    };
  }
);
