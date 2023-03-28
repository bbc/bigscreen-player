import findTemplate from "./findtemplate"

it("expects a string", () => {
  expect(() => findTemplate()).toThrow(TypeError)
})

describe("strings without segment template pattern", () => {
  it.each(["mock://some.media/subtitles/captions.xml", "string"])("returns null for %s", (string) => {
    expect(findTemplate(string)).toBeNull()
  })
})

describe("strings with segment template pattern", () => {
  it.each([
    ["mock://some.media/subtitles/$segment$.m4s", "$segment$"],
    ["$segment$", "$segment$"],
    ["mock://subtitles/$Number$.ext", "$Number$"],
  ])("returns segment template substring for %s", (string, segmentTemplate) => {
    expect(findTemplate(string)).toBe(segmentTemplate)
  })
})
