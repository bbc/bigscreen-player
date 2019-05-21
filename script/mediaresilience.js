define(
  'bigscreenplayer/mediaresilience', [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats'
  ],
  function (WindowTypes, LiveSupport, TransferFormats) {
    'use strict';

    function shouldFailover (remainingUrls, duration, currentTime, liveSupport, windowType, transferFormat) {
      var aboutToEnd = duration && currentTime > duration - 5;
      var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
      var shouldLiveFailover = windowType !== WindowTypes.STATIC && (transferFormat === TransferFormats.DASH || liveSupport !== LiveSupport.RESTARTABLE);
      return remainingUrls > 1 && (shouldStaticFailover || shouldLiveFailover);
    }

    return {
      shouldFailover: shouldFailover
    };
  }
);
