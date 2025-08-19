import { AbortSignal, AbortError } from "./abortutils"
import { AbortStages } from "../models/abortstages"

import getError from "../testutils/geterror"

describe("AbortError", () => {
  it("should set name and message correctly", () => {
    const err = new AbortError(AbortStages.STRATEGY)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe("AbortError")
    expect(err.message).toBe(`bigscreen-player aborted at ${AbortStages.STRATEGY}`)
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
    expect(error).toHaveProperty("message", `bigscreen-player aborted at ${AbortStages.PLAYER_COMPONENT}`)
  })

  it("should set aborted flag to true when abort() is called", () => {
    expect(signal.aborted).toBe(false)
    signal.abort()
    expect(signal.aborted).toBe(true)
  })
})
