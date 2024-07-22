/* eslint-disable jest/no-conditional-expect */
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
    expect.assertions(4)

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
      // Test for the async error case, linting hates it!
      expect(error).toBe(newError)
      expect(anotherFatalErrorPlugin.onFatalError).toHaveBeenCalled()
      expect(fatalErrorPlugin.onFatalError).toHaveBeenCalled()
    }
  })

  it("Calls plugins including context and defers any errors thrown", () => {
    expect.assertions(4)

    const fatalErrorPlugin = {
      onFatalError: jest.fn(),
    }

    class ErrorHandlingClass {
      constructor() {
        this.state = "bad"
      }

      report() {
        return this.state
      }

      onFatalError() {
        this.report()
      }
    }

    const classBasedErrorHandler = new ErrorHandlingClass()

    const classSpy = jest.spyOn(classBasedErrorHandler, "report")

    const newError = new Error("oops")

    fatalErrorPlugin.onFatalError.mockImplementationOnce(() => {
      throw newError
    })

    plugins.registerPlugin(classBasedErrorHandler)
    plugins.registerPlugin(fatalErrorPlugin)

    jest.useFakeTimers()

    try {
      expect(() => {
        plugins.interface.onFatalError()
      }).not.toThrow()
      jest.advanceTimersByTime(1)
    } catch (error) {
      // Test for the async error case, linting hates it!
      expect(error).toBe(newError)
      expect(fatalErrorPlugin.onFatalError).toHaveBeenCalled()
      expect(classSpy).toHaveBeenCalled()
    }
  })
})
