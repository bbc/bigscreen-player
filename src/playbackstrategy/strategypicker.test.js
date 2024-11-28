import StrategyPicker from "./strategypicker"
import NativeStrategy from "./nativestrategy"
import MSEStrategy from "./msestrategy"
import BasicStrategy from "./basicstrategy"

jest.mock("./nativestrategy")
jest.mock("./basicstrategy")
jest.mock("./msestrategy", () => jest.fn)

class NoErrorThrownError extends Error {}

const getError = async (call) => {
  try {
    await call()

    throw new NoErrorThrownError()
  } catch (error) {
    return error
  }
}

describe("Strategy Picker", () => {
  beforeEach(() => {
    window.bigscreenPlayer = {}
    jest.resetModules()
  })

  afterEach(() => {
    delete window.bigscreenPlayer
  })

  it("should default to native strategy", () =>
    StrategyPicker().then((strategy) => {
      expect(strategy).toEqual(NativeStrategy)
    }))

  it("should use basic strategy when defined", () => {
    window.bigscreenPlayer = {
      playbackStrategy: "basicstrategy",
    }

    return StrategyPicker().then((strategy) => {
      expect(strategy).toEqual(BasicStrategy)
    })
  })

  it("should use mse strategy when configured", () => {
    window.bigscreenPlayer.playbackStrategy = "msestrategy"

    return StrategyPicker().then((strategy) => {
      expect(strategy).toEqual(MSEStrategy)
    })
  })

  it("should reject when mse strategy cannot be loaded", async () => {
    window.bigscreenPlayer.playbackStrategy = "msestrategy"

    jest.doMock("./msestrategy", () => {
      throw new Error("Could not construct MSE Strategy!")
    })

    const error = await getError(async () => StrategyPicker())

    expect(error).not.toBeInstanceOf(NoErrorThrownError)
    expect(error.name).toBe("StrategyDynamicLoadError")
    expect(error.message).toBe("Could not construct MSE Strategy!")
  })
})
