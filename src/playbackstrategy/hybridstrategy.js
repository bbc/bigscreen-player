import Native from '../../script/playbackstrategy/nativestrategy';
import MSE from '../../script/playbackstrategy/msestrategy';
import StrategyPicker from '../../script/playbackstrategy/strategypicker';
import LiveSupport from '../../script/models/livesupport';
import PlaybackStrategy from '../../script/models/playbackstrategy';

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

export default HybridStrategy;
