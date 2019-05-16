define(
  'bigscreenplayer/utils/cdnutils', [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats'
  ],
  function (WindowTypes, LiveSupport, TransferFormats) {
    'use strict';

    function shouldFailover (duration, currentTime, liveSupport, windowType, transferFormat) {
      var aboutToEnd = duration && currentTime > duration - 5;
      var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
      var shouldLiveFailover = windowType !== WindowTypes.STATIC && (transferFormat === TransferFormats.DASH || liveSupport !== LiveSupport.RESTARTABLE);
      return shouldStaticFailover || shouldLiveFailover;
    }

    return {
      shouldFailover: shouldFailover
    };
  }
);
