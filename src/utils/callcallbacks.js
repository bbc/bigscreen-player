import deferExceptions from './deferexceptions'
import utils from './playbackutils'

function CallCallbacks (callbacks, data) {
  var originalCallbacks = utils.deepClone(callbacks)
  for (var i = callbacks.length - 1; i >= 0; i--) {
    var originalLength = callbacks.length

    deferExceptions(() => callbacks[i](data))

    var newLength = callbacks.length
    var callbackRemovedSelf = !callbacks.includes(originalCallbacks[i])

    if (originalLength !== newLength) {
      i = i - (originalLength - newLength)
      if (callbackRemovedSelf) {
        i++
      }
    }
  }
}

export default CallCallbacks
