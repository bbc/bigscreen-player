import deferExceptions from './deferexceptions'

function CallCallbacks (callbacks, data) {
  for (var i = callbacks.length - 1; i >= 0; i--) {
    var originalLength = callbacks.length

    deferExceptions(() => callbacks[i](data))
    var newLength = callbacks.length
    if (originalLength - newLength > 1) {
      i = i - (originalLength - newLength)
    }
  }
}

export default CallCallbacks
