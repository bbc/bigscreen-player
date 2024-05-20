import plugins from "./plugins"

describe("Plugins", () => {
  it("Calls a registered plugin on interface invocation", () => {
    const fatalErrorPlugin = {
      onFatalError: jest.fn(),
    }

    plugins.registerPlugin(fatalErrorPlugin)

    plugins.interface.onFatalError()
    expect(fatalErrorPlugin.onFatalError).toHaveBeenCalled()
  })

  it("Calls multiple plugins and defers any error thrown inside a plugin", () => {
    const fatalErrorPlugin = {
      onFatalError: jest.fn(),
    }

    const newError = new Error("oops")

    fatalErrorPlugin.onFatalError.mockImplementationOnce(() => {
      throw newError
    })

    const anotherFatalErrorPlugin = {
      onFatalError: jest.fn(),
    }

    plugins.registerPlugin(fatalErrorPlugin)
    plugins.registerPlugin(anotherFatalErrorPlugin)

    jest.useFakeTimers()

    try {
      expect(() => {
        plugins.interface.onFatalError()
      }).not.toThrow()
      jest.advanceTimersByTime(1)
    } catch (error) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(error).toBe(newError)
      // eslint-disable-next-line jest/no-conditional-expect
      expect(anotherFatalErrorPlugin.onFatalError).toHaveBeenCalled()
      // eslint-disable-next-line jest/no-conditional-expect
      expect(fatalErrorPlugin.onFatalError).toHaveBeenCalled()
    }
  })
})
