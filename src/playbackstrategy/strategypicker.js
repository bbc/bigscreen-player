import PlaybackStrategy from '../models/playbackstrategy'
import NativeStrategy from './nativestrategy'

export default function (windowType, isUHD) {
  return Promise(function (resolve, reject) {
    var mseExceptions = window.bigscreenPlayer.mseExceptions || []
  
    if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.HYBRID) {
      if (mseExceptions.indexOf(windowType) !== -1) {
        return resolve(NativeStrategy)
      }
    
      if (isUHD && mseExceptions.indexOf('uhd') !== -1) {
        return resolve(NativeStrategy)
      }
  
      return import('./msestrategy').then(({default: MSEStrategy}) => resolve(MSEStrategy))
    } else if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.MSE) {
      return import('./msestrategy').then(({default: MSEStrategy}) => resolve(MSEStrategy))
    } else {
      return resolve(NativeStrategy)
    }
  })
}
