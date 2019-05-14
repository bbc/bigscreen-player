define('bigscreenplayer/playbackstrategy/hybridstrategy',
  [
    'bigscreenplayer/playbackstrategy/nativestrategy',
    'bigscreenplayer/playbackstrategy/msestrategy',
    'bigscreenplayer/playbackstrategy/strategypicker',
    'bigscreenplayer/models/livesupport'
  ],
  function (Native, MSE, StrategyPicker, LiveSupport) {
    var HybridStrategy = function (windowType, mediaKind, timeCorrection, videoElement, isUHD, device, cdnDebugOutput) {
      var strategy = StrategyPicker(windowType, isUHD);

      if (strategy === 'mseStrategy') {
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
