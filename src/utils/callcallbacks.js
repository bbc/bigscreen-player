import deferExceptions from './deferexceptions'

function CallCallbacks (callbacks, data) {
  callbacks.forEach(function (callback) {
    deferExceptions(function () {
      callback(data)
    })
  })
}

export default CallCallbacks
