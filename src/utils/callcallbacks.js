import deferExceptions from './deferexceptions'

function CallCallbacks (callbacks, data) {
  callbacks.forEach(function (callback) {
    console.log('callback loop: ' + callback)
    deferExceptions(() => callback(data))
  })
  // callbacks.forEach((callback) => deferExceptions(() => callback(data)))
}

export default CallCallbacks
