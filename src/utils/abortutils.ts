export const AbortStages = {
  DATA_LOADED: "bigscreen-player-data-loaded",
  PLAYER_COMPONENT: "bigscreen-player-player-component",
  STRATEGY: "bigscreen-player-strategy",
}

export class AbortError extends Error {
  constructor(abortStage: string, message?: string) {
    super(message ?? `BSP aborted at ${abortStage}`)
    this.name = "AbortError"
  }
}

export class AbortSignal {
  aborted: boolean

  constructor() {
    this.aborted = false
  }

  throwIfAborted(abortStage: string) {
    if (!this.aborted) return

    throw new AbortError(abortStage)
  }

  abort() {
    this.aborted = true
  }
}
