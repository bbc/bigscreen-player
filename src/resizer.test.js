import Resizer from "./resizer"

describe("Resizer", () => {
  let resizer, element

  beforeEach(() => {
    element = document.createElement("div")
    element.style.top = "0px"
    element.style.left = "0px"
    element.style.width = "1280px"
    element.style.height = "720px"
    resizer = Resizer()
  })

  describe("resize", () => {
    it("Resizes and positions the element with the correct values", () => {
      resizer.resize(element, 10, 20, 3, 4, 5)

      expect(element.style.top).toBe("10px")
      expect(element.style.left).toBe("20px")
      expect(element.style.width).toBe("3px")
      expect(element.style.height).toBe("4px")
      expect(element.style.zIndex).toBe("5")
      expect(element.style.position).toBe("absolute")
    })
  })

  describe("clear", () => {
    it("resets the css properties", () => {
      resizer.resize(element, 1, 2, 3, 4, 5)
      resizer.clear(element)

      expect(element.style.top).toBe("")
      expect(element.style.left).toBe("")
      expect(element.style.width).toBe("")
      expect(element.style.height).toBe("")
      expect(element.style.zIndex).toBe("")
      expect(element.style.position).toBe("")
    })
  })

  describe("isResized", () => {
    it("should return false if no call to resize or clear has been made", () => {
      expect(resizer.isResized()).toBe(false)
    })

    it("should return true if the last call was to resized", () => {
      resizer.clear(element)
      resizer.resize(element, 1, 2, 3, 4, 5)

      expect(resizer.isResized()).toBe(true)
    })

    it("should return true if the last call was to clear", () => {
      resizer.resize(element, 1, 2, 3, 4, 5)
      resizer.clear(element)

      expect(resizer.isResized()).toBe(false)
    })
  })
})
