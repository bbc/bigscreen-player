define('bigscreenplayer/playbackstrategy/hybridstrategy',
  [
    'bigscreenplayer/playbackstrategy/nativestrategy',
    'bigscreenplayer/playbackstrategy/msestrategy',
    'bigscreenplayer/playbackstrategy/strategypicker',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/playbackstrategy'
  ],
  function (Native, MSE, StrategyPicker, LiveSupport, PlaybackStrategy) {
    var HybridStrategy = function (mediaSources, windowType, mediaKind, videoElement, isUHD) {
      var strategy = StrategyPicker(windowType, isUHD);

      if (strategy === PlaybackStrategy.MSE) {
        return MSE(mediaSources, windowType, mediaKind, videoElement, isUHD);
      }

      return Native(mediaSources, windowType, mediaKind, videoElement, isUHD);
    };

    HybridStrategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return HybridStrategy;
  }
);
