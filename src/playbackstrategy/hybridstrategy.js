import Native from './playbackstrategy/nativestrategy'
import MSE from './playbackstrategy/msestrategy'
import StrategyPicker from './playbackstrategy/strategypicker'
import LiveSupport from './models/livesupport'
import PlaybackStrategy from './models/playbackstrategy'

var HybridStrategy = function (mediaSources, windowType, mediaKind, videoElement, isUHD) {
  var strategy = StrategyPicker(windowType, isUHD)

  if (strategy === PlaybackStrategy.MSE) {
    return MSE(mediaSources, windowType, mediaKind, videoElement, isUHD)
  }

  return Native(mediaSources, windowType, mediaKind, videoElement, isUHD)
}

HybridStrategy.getLiveSupport = function () {
  return LiveSupport.SEEKABLE
}

export default HybridStrategy
