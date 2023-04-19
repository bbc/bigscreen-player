import PlaybackStrategy from "../models/playbackstrategy"
import NativeStrategy from "./nativestrategy"
import BasicStrategy from "./basicstrategy"

function StrategyPicker() {
  return new Promise((resolve, reject) => {
    if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.MSE) {
      return import("./msestrategy")
        .then(({ default: MSEStrategy }) => resolve(MSEStrategy))
        .catch(() => {
          reject({ error: "strategyDynamicLoadError" })
        })
    } else if (window.bigscreenPlayer.playbackStrategy === PlaybackStrategy.BASIC) {
      return resolve(BasicStrategy)
    }
    return resolve(NativeStrategy)
  })
}

export default StrategyPicker
