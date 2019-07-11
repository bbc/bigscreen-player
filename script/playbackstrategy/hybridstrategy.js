define('bigscreenplayer/playbackstrategy/hybridstrategy',
  [
    'bigscreenplayer/playbackstrategy/nativestrategy',
    'bigscreenplayer/playbackstrategy/msestrategy',
    'bigscreenplayer/playbackstrategy/strategypicker',
    'bigscreenplayer/models/livesupport'
  ],
  function (Native, MSE, StrategyPicker, LiveSupport) {
    var HybridStrategy = function (mediaSources, windowType, mediaKind, timeCorrection, videoElement, isUHD, device) {
      var strategy = StrategyPicker(windowType, isUHD);

      if (strategy === 'mseStrategy') {
        return MSE(mediaSources, windowType, mediaKind, timeCorrection, videoElement, isUHD, device);
      }

      return Native(mediaSources, windowType, mediaKind, timeCorrection, videoElement, isUHD, device);
    };

    HybridStrategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return HybridStrategy;
  }
);
