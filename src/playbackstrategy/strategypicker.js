import PlaybackStrategy from "../models/playbackstrategy"
import NativeStrategy from "./nativestrategy"
import BasicStrategy from "./basicstrategy"
import isError from "../utils/iserror"

function StrategyPicker() {
  return new Promise((resolve, reject) => {
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
