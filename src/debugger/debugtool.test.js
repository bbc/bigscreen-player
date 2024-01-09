import Chronicle from "./chronicle.ts"
import DebugTool from "./debugtool"
import DebugView from "./debugview"

jest.mock("./debugview")

describe("Debug Tool", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: 1234 })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    DebugTool.tearDown()
    Chronicle.tearDown()

    Chronicle.init()
  })

  describe("logging an error", () => {
    it("takes a string", () => {
      DebugTool.error("something went wrong")

      expect(Chronicle.retrieve()).toEqual([
        { type: "error", error: new Error("something went wrong"), timestamp: 1234 },
      ])

      DebugTool.toggleVisibility()

      expect(DebugView.render).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamic: [expect.stringContaining("Error: something went wrong")],
        })
      )
    })

    it("takes an Error", () => {
      DebugTool.error(new TypeError("something went REALLY wrong"))

      expect(Chronicle.retrieve()).toEqual([
        { type: "error", error: new TypeError("something went REALLY wrong"), timestamp: 1234 },
      ])

      DebugTool.toggleVisibility()

      expect(DebugView.render).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamic: [expect.stringContaining("TypeError: something went REALLY wrong")],
        })
      )
    })
  })

  describe("logging a warning", () => {
    it("takes a string", () => {
      DebugTool.warn("you're using a deprecated thingie!")

      expect(Chronicle.retrieve()).toEqual([
        { type: "warning", warning: "you're using a deprecated thingie!", timestamp: 1234 },
      ])

      DebugTool.toggleVisibility()

      expect(DebugView.render).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamic: [expect.stringContaining("Warning: you're using a deprecated thingie!")],
        })
      )
    })
  })

  describe("intercepting keyvalue calls", () => {
    it("should always add entry to chronicle if the key does not match one of the defined static keys", () => {
      const testObj1 = { key: "bitrate", value: "1000" }
      const testObj2 = { key: "imNotSpecial", value: "nobodylovesme" }
      const testObj3 = { key: "idontmatch", value: "pleaseaddme" }

      const expectedArray = [
        { type: "keyvalue", keyvalue: testObj1, timestamp: 1234 },
        { type: "keyvalue", keyvalue: testObj2, timestamp: 1234 },
        { type: "keyvalue", keyvalue: testObj3, timestamp: 1234 },
      ]

      DebugTool.keyValue(testObj1)
      DebugTool.keyValue(testObj2)
      DebugTool.keyValue(testObj3)

      const chronicle = Chronicle.retrieve()

      expect(chronicle).toEqual(expectedArray)
    })

    it("overwrites a keyvalue entry to the chronicle if that keyvalue already exists", () => {
      const testObj = { key: "akey", value: "something" }
      const testObj1 = { key: "bitrate", value: "1000" }
      const testObj2 = { key: "bitrate", value: "1001" }

      const expectedArray = [
        { type: "keyvalue", keyvalue: { key: "akey", value: "something" }, timestamp: 1234 },
        { type: "keyvalue", keyvalue: { key: "bitrate", value: "1001" }, timestamp: 1234 },
      ]

      DebugTool.keyValue(testObj)
      DebugTool.keyValue(testObj1)
      DebugTool.keyValue(testObj2)

      const chronicle = Chronicle.retrieve()

      expect(chronicle).toEqual(expectedArray)
    })
  })
})
