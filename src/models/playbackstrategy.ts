const PlaybackStrategy = {
  MSE: "msestrategy",
  NATIVE: "nativestrategy",
  BASIC: "basicstrategy",
}

export type PlaybackStrategy = (typeof PlaybackStrategy)[keyof typeof PlaybackStrategy]

export default PlaybackStrategy
