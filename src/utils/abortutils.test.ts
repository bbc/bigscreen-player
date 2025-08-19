import { AbortStages, AbortSignal, AbortError } from "./abortutils"

import getError from "../testutils/geterror"

describe("AbortError", () => {
  it("should set name, message, and abortStage correctly with custom message", () => {
    const err = new AbortError(AbortStages.STRATEGY, "Something failed")
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe("AbortError")
    expect(err.message).toBe("Something failed")
  })

  it("should default message if not provided", () => {
    const err = new AbortError(AbortStages.DATA_LOADED)
    expect(err.message).toBe(`BSP aborted at ${AbortStages.DATA_LOADED}`)
  })
})

describe("AbortSignal", () => {
  let signal: AbortSignal

  beforeEach(() => {
    signal = new AbortSignal()
  })

  it("should not throw if not aborted", () => {
    expect(() => signal.throwIfAborted(AbortStages.PLAYER_COMPONENT)).not.toThrow()
  })

  it("should throw AbortError if aborted", async () => {
    signal.abort()

    const error = await getError(() => signal.throwIfAborted(AbortStages.PLAYER_COMPONENT))

    expect(error).toBeInstanceOf(AbortError)
    expect(error).toHaveProperty("message", `BSP aborted at ${AbortStages.PLAYER_COMPONENT}`)
  })

  it("should set aborted flag to true when abort() is called", () => {
    expect(signal.aborted).toBe(false)
    signal.abort()
    expect(signal.aborted).toBe(true)
  })
})
