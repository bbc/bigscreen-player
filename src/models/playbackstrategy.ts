export const PlaybackStrategy = {
  MSE: "msestrategy",
  NATIVE: "nativestrategy",
  BASIC: "basicstrategy",
} as const

export type PlaybackStrategy = (typeof PlaybackStrategy)[keyof typeof PlaybackStrategy]
