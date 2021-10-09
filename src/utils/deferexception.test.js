import deferExceptions from './deferexceptions'

describe('deferExceptions', () => {
  it('calls the callback once', () => {
    const callback = jest.fn()

    deferExceptions(callback)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not let an exception through', () => {
    jest.useFakeTimers()

    const error = new Error('oops')

    try {
      expect(() => {
        deferExceptions(() => {
          throw error
        })
      }).not.toThrow()
      jest.advanceTimersByTime(1)
    } catch (e) {
      expect(e).toBe(error)
    }

    jest.useRealTimers()
  })
})
