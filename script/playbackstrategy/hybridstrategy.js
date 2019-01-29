define('bigscreenplayer/playbackstrategy/hybridstrategy',
  [
    'bigscreenplayer/playbackstrategy/nativestrategy',
    'bigscreenplayer/playbackstrategy/msestrategy',
    'bigscreenplayer/playbackstrategy/strategypicker'
  ],
  function (Native, MSE, StrategyPicker) {
    return function (windowType, mediaKind, timeCorrection, videoElement, isUHD, device) {
      var strategy = StrategyPicker(windowType, isUHD);

      if (strategy === 'mseStrategy') {
        return MSE(windowType, mediaKind, timeCorrection, videoElement, isUHD);
      }

      return Native(windowType, mediaKind, timeCorrection, videoElement, isUHD, device);
    };
  }
);
