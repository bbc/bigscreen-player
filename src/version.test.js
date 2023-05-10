import Version from "./version"

describe("Version", () => {
  it("should return a semver string", () => {
    expect(Version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
