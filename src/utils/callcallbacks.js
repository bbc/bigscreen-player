import deferExceptions from './deferexceptions'

export default function callCallbacks (callbacks, data) {
  callbacks.forEach(function (callback) {
    deferExceptions(function () {
      callback(data)
    })
  })
}
