export const AbortStages = {
  DATA_LOADED: "bigscreen-player-data-loaded",
  PLAYER_COMPONENT: "bigscreen-player-player-component",
  STRATEGY: "bigscreen-player-strategy",
} as const

export type AbortStages = (typeof AbortStages)[keyof typeof AbortStages]
