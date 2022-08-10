import PlaybackStrategy from '../models/playbackstrategy'
import NativeStrategy from './nativestrategy'
import BasicStrategy from './basicstrategy'

function StrategyPicker (windowType, isUHD) {
  return new Promise((resolve, reject) => {
    const mseExceptions = window.bigscreenPlayer.mseExceptions || []

    if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.HYBRID) {
      if (mseExceptions.indexOf(windowType) !== -1) {
        return resolve(NativeStrategy)
      }

      if (isUHD && mseExceptions.indexOf('uhd') !== -1) {
        return resolve(NativeStrategy)
      }

      return import('./msestrategy').then(({ default: MSEStrategy }) => resolve(MSEStrategy))
        .catch(() => {
          reject({ error: 'strategyDynamicLoadError' })
        })
    } else if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.MSE) {
      return import('./msestrategy').then(({ default: MSEStrategy }) => resolve(MSEStrategy))
        .catch(() => {
          reject({ error: 'strategyDynamicLoadError' })
        })
    } else if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.BASIC) {
      return resolve(BasicStrategy)
    } else {
      return resolve(NativeStrategy)
    }
  })
}

export default StrategyPicker
