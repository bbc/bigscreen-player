import deferExceptions from "./deferexceptions"

describe("deferExceptions", () => {
  it("calls the callback once", () => {
    const callback = jest.fn()

    deferExceptions(callback)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("does not let an exception through", () => {
    jest.useFakeTimers()

    const newError = new Error("oops")

    try {
      expect(() => {
        deferExceptions(() => {
          throw newError
        })
      }).not.toThrow()
      jest.advanceTimersByTime(1)
    } catch (error) {
      expect(error).toBe(newError)
    }

    jest.useRealTimers()
  })
})
