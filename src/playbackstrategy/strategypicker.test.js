import StrategyPicker from "./strategypicker"
import NativeStrategy from "./nativestrategy"
import MSEStrategy from "./msestrategy"
import BasicStrategy from "./basicstrategy"

jest.mock("./nativestrategy")
jest.mock("./basicstrategy")
jest.mock("./msestrategy", () => jest.fn)

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

  it("should reject when mse strategy cannot be loaded", () => {
    window.bigscreenPlayer.playbackStrategy = "msestrategy"

    jest.doMock("./msestrategy", () => {
      throw new Error("Could not construct MSE Strategy!")
    })

    return StrategyPicker().catch((rejection) => {
      expect(rejection).toEqual({ error: "strategyDynamicLoadError" })
    })
  })

  it("should reject when mse strategy cannot be loaded for hybrid strategy configuration", () => {
    window.bigscreenPlayer.playbackStrategy = "hybridstrategy"

    jest.doMock("./msestrategy", () => {
      throw new Error("Could not construct MSE Strategy!")
    })

    return StrategyPicker().catch((rejection) => {
      expect(rejection).toEqual({ error: "strategyDynamicLoadError" })
    })
  })
})
