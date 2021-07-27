import PlaybackStrategy from './models/playbackstrategy';

export default function (windowType, isUHD) {
  var mseExceptions = window.bigscreenPlayer.mseExceptions || [];

  if (mseExceptions.indexOf(windowType) !== -1) {
    return PlaybackStrategy.NATIVE;
  }

  if (isUHD && mseExceptions.indexOf('uhd') !== -1) {
    return PlaybackStrategy.NATIVE;
  }

  return PlaybackStrategy.MSE;
}
