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

  it("Calls multiple plugins and defers any error thrown inside a plugin", () =>
    new Promise((done) => {
      const fatalErrorPlugin = {
        onFatalError: jest.fn(),
      }

      const anotherFatalErrorPlugin = {
        onFatalError: jest.fn(),
      }

      fatalErrorPlugin.onFatalError.mockImplementationOnce(() => {
        expect(anotherFatalErrorPlugin.onFatalError).toHaveBeenCalled()
        expect(fatalErrorPlugin.onFatalError).toHaveBeenCalled()
        done()
      })

      plugins.registerPlugin(fatalErrorPlugin)
      plugins.registerPlugin(anotherFatalErrorPlugin)

      jest.useFakeTimers()

      expect(() => {
        plugins.interface.onFatalError()
      }).not.toThrow()
      jest.advanceTimersByTime(1)
    }))
})
