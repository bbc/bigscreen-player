import deferExceptions from './deferexceptions'

function CallCallbacks (callbacks, data) {
  callbacks.forEach(function (callback) {
    if (callback.name !== 'handleTimeUpdate') {
      console.log('callback loop: ' + callback.name)
    }
    deferExceptions(() => callback(data))
  })
  // callbacks.forEach((callback) => deferExceptions(() => callback(data)))
}

export default CallCallbacks
