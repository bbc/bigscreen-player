define('bigscreenplayer/playbackstrategy/hybridstrategy',
  [
    'bigscreenplayer/playbackstrategy/talstrategy',
    'bigscreenplayer/playbackstrategy/msestrategy',
    'bigscreenplayer/playbackstrategy/strategypicker'
  ],
  function (TAL, MSE, StrategyPicker) {
    return function (windowType, mediaKind, timeCorrection, videoElement, isUHD, device) {
      var strategy = StrategyPicker(windowType, isUHD);

      if (strategy === 'mseStrategy') {
        return MSE(windowType, mediaKind, timeCorrection, videoElement, isUHD);
      }

      return TAL(windowType, mediaKind, timeCorrection, videoElement, isUHD, device);
    };
  }
);
