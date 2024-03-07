import deferExceptions from "./deferexceptions"
import utils from "./playbackutils"

export default function CallCallbacks(callbacks: ((param: unknown) => void)[], data?: unknown) {
  const originalCallbacks = utils.deepClone(callbacks)
  for (let index = callbacks.length - 1; index >= 0; index--) {
    const originalLength = callbacks.length

    deferExceptions(() => callbacks[index](data))

    const newLength = callbacks.length
    const callbackRemovedSelf = callbacks.indexOf(originalCallbacks[index]) === -1

    if (originalLength !== newLength && !callbackRemovedSelf) {
      index = index - (originalLength - newLength)
    }
  }
}
