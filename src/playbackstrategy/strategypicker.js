import PlaybackStrategy from "../models/playbackstrategy"
import NativeStrategy from "./nativestrategy"
import BasicStrategy from "./basicstrategy"
import isError from "../utils/iserror"

function StrategyPicker(registry) {
  return new Promise((resolve, reject) => {
    // Custom options from strategyRegistry

    const customStrategy = registry?.hasOwnProperty(window.bigscreenPlayer.playbackStrategy) ? registry[window.bigscreenPlayer.playbackStrategy] : null

    if (customStrategy) {
      return import(customStrategy).then(({ default: CustomStrategy }) => resolve(CustomStrategy))
    }

    if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.MSE) {
      return import("./msestrategy")
        .then(({ default: MSEStrategy }) => resolve(MSEStrategy))
        .catch((reason) => {
          const error = new Error(isError(reason) ? reason.message : undefined)
          error.name = "StrategyDynamicLoadError"

          reject(error)
        })
    } else if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.BASIC) {
      return resolve(BasicStrategy)
    }
    return resolve(NativeStrategy)
  })
}

export default StrategyPicker