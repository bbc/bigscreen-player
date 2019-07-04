define('bigscreenplayer/playbackstrategy/hybridstrategy',
  [
    'bigscreenplayer/playbackstrategy/nativestrategy',
    'bigscreenplayer/playbackstrategy/msestrategy',
    'bigscreenplayer/playbackstrategy/strategypicker',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/playbackstrategy'
  ],
  function (Native, MSE, StrategyPicker, LiveSupport, PlaybackStrategy) {
    var HybridStrategy = function (windowType, mediaKind, timeCorrection, videoElement, isUHD, device, cdnDebugOutput) {
      var strategy = StrategyPicker(windowType, isUHD);

      if (strategy === PlaybackStrategy.MSE) {
        return MSE(windowType, mediaKind, timeCorrection, videoElement, isUHD, device, cdnDebugOutput);
      }

      return Native(windowType, mediaKind, timeCorrection, videoElement, isUHD, device, cdnDebugOutput);
    };

    HybridStrategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return HybridStrategy;
  }
);
