import type { Config } from "jest"

const config: Config = {
  testEnvironment: "jsdom",
  showSeed: true,
  transform: {
    "\\.[j]sx?$": "babel-jest",
    "(\\.d)?\\.[t]s?$": "ts-jest",
  },
  moduleFileExtensions: ["js", "ts", "d.ts", "json"],
}

export default config
