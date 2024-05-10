import { version } from "../package.json"

describe("Version", () => {
  it("should return a semver string", () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
