import { AbortStages } from "../models/abortstages"

export class AbortError extends Error {
  constructor(abortStage: AbortStages) {
    super(`bigscreen-player aborted at ${abortStage}`)
    this.name = "AbortError"
  }
}

export class AbortSignal {
  aborted: boolean

  constructor() {
    this.aborted = false
  }

  throwIfAborted(abortStage: AbortStages) {
    if (!this.aborted) return

    throw new AbortError(abortStage)
  }

  abort() {
    this.aborted = true
  }
}
