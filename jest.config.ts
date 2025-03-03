import type { Config } from "jest"

const config: Config = {
  testEnvironment: "jsdom",
  showSeed: true,
  transform: {
    "\\.[j]sx?$": "babel-jest",
    "\\.[t]sx?$": "ts-jest",
  },
}

export default config
