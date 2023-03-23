import DOMHelpers from "./domhelpers"

describe("DOMHelpers", () => {
  it("Converts an RGBA tuple string to RGB tripple string", () => {
    expect(DOMHelpers.rgbaToRGB("#FFAAFFAA")).toBe("#FFAAFF")
  })

  it("Will return a RGB as it is", () => {
    expect(DOMHelpers.rgbaToRGB("#FFAAFF")).toBe("#FFAAFF")
  })

  it("Will return a non-RGBA as it is", () => {
    expect(DOMHelpers.rgbaToRGB("black")).toBe("black")
  })

  it("Will delete a node which has a parent", () => {
    const body = document.createElement("body")
    const child = document.createElement("p")
    body.appendChild(child)

    DOMHelpers.safeRemoveElement(child)

    expect(body.hasChildNodes()).toBe(false)
  })

  it("Will do nothing when the node is detatched", () => {
    const node = document.createElement("p")

    expect(() => {
      DOMHelpers.safeRemoveElement(node)
    }).not.toThrow()
  })
})
