import callCallbacks from './callcallbacks'

describe('callCallbacks', () => {
  it('calls all the callbacks once with the provided data', () => {
    const callbacks = [ jest.fn(), jest.fn() ]
    const data = 'data'

    callCallbacks(callbacks, data)

    callbacks.forEach((callback) => {
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(data)
    })
  })

  // Note: Forgive the time hack, async deferred errors can be flakey in other tests if not caught!
  it('calls later callbacks if an earlier one errors', () => {
    jest.useFakeTimers()
    const callback = jest.fn()

    const failingCallCallbacks = () => {
      callCallbacks([
        () => { throw new Error('oops') },
        callback
      ])
      jest.advanceTimersByTime(1)
    }

    expect(failingCallCallbacks).toThrowError()

    expect(callback).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })
})
