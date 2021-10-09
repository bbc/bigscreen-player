import deferExceptions from './deferexceptions'

function CallCallbacks (callbacks, data) {
  callbacks.forEach((callback) => deferExceptions(() => callback(data)))
}

export default CallCallbacks
