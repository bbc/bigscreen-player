define(
  'bigscreenplayer/mediaresilience', [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/playbackstrategy'
  ],
  function (WindowTypes, PlaybackStrategy) {
    'use strict';

    function shouldFailover (remainingUrls, duration, currentTime, liveSupport, windowType, transferFormat) {
      var aboutToEnd = duration && currentTime > duration - 5;
      var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
      var shouldLiveFailover = windowType !== WindowTypes.STATIC && window.bigscreenPlayer.playbackStrategy !== PlaybackStrategy.TAL && !window.bigscreenPlayer.disableLiveFailover;
      return remainingUrls > 1 && (shouldStaticFailover || shouldLiveFailover);
    }

    return {
      shouldFailover: shouldFailover
    };
  }
);
