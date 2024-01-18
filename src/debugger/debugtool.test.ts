import DebugTool, { LogLevels } from "./debugtool"
import ViewController, { DebugViewController } from "./debugviewcontroller"

jest.mock("./debugviewcontroller")

function getMockViewController(): DebugViewController {
  const [instance] = jest.mocked(ViewController).mock.instances
  return instance
}

describe("Debug Tool", () => {
  let mockViewController: DebugViewController

  beforeAll(() => {
    jest.useFakeTimers({ now: 1234 })

    mockViewController = getMockViewController()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockViewController.isVisible = false

    DebugTool.tearDown()
  })

  describe("getDebugLogs", () => {
    it("retrieves logs", () => {
      DebugTool.info("Hello")
      DebugTool.info("World")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ data: "Hello" }),
        expect.objectContaining({ data: "World" }),
      ])
    })
  })

  describe("teardown", () => {
    it("wipes previous logs", () => {
      DebugTool.info("Hello")
      DebugTool.info("World")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ data: "Hello" }),
        expect.objectContaining({ data: "World" }),
      ])

      DebugTool.tearDown()

      expect(DebugTool.getDebugLogs()).toEqual([])
    })

    it("tears down the view if it was visible", () => {
      mockViewController.isVisible = true

      DebugTool.tearDown()

      expect(mockViewController.hideView).toHaveBeenCalledTimes(1)
    })
  })

  describe("logging a debug", () => {
    it("takes a string", () => {
      DebugTool.setLogLevel(LogLevels.DEBUG)

      DebugTool.debug("Detailed information")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ level: "debug", data: "Detailed information" }),
      ])
    })
  })

  describe("logging an error", () => {
    it("takes a string", () => {
      DebugTool.error("something went wrong")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ level: "error", data: new Error("something went wrong") }),
      ])
    })

    it("takes an instance of Error", () => {
      DebugTool.error(new TypeError("something went REALLY wrong"))

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ level: "error", data: new TypeError("something went REALLY wrong") }),
      ])
    })
  })

  describe("logging info", () => {
    it("takes a string", () => {
      DebugTool.info("Hello World")

      expect(DebugTool.getDebugLogs()).toEqual([expect.objectContaining({ level: "info", data: "Hello World" })])
    })
  })

  describe("logging a warning", () => {
    it("takes a string", () => {
      DebugTool.warn("you're using a deprecated thingie!")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ level: "warning", data: "you're using a deprecated thingie!" }),
      ])
    })
  })

  describe("logging metrics", () => {
    it("appends the metric to the log", () => {
      DebugTool.metric("bitrate", 1000)
      DebugTool.metric("seeking", true)
      DebugTool.metric("seeking", false)

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ key: "bitrate", data: 1000 }),
        expect.objectContaining({ key: "seeking", data: true }),
        expect.objectContaining({ key: "seeking", data: false }),
      ])
    })
  })

  describe("logging events", () => {
    it("appens the event trace to the log", () => {
      DebugTool.event("playing")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "event", eventType: "playing", eventTarget: "unknown" }),
      ])
    })
  })

  describe("show", () => {
    it("provides the chronicle so far to the view controller", () => {
      expect(mockViewController.addEntries).toHaveBeenCalledTimes(0)

      DebugTool.show()

      expect(mockViewController.addEntries).toHaveBeenCalledTimes(1)
    })

    it("provides the current time to the view controller", () => {
      expect(mockViewController.addTime).toHaveBeenCalledTimes(0)

      DebugTool.show()

      expect(mockViewController.addTime).toHaveBeenCalledTimes(1)
    })

    it("renders new entries to the view controller", () => {
      DebugTool.show()

      expect(mockViewController.addEntries).toHaveBeenCalledTimes(1)

      DebugTool.metric("seeking", true)

      expect(mockViewController.addEntries).toHaveBeenCalledTimes(2)
    })

    it("updates time of the view controller", () => {
      DebugTool.show()

      expect(mockViewController.addTime).toHaveBeenCalledTimes(1)

      DebugTool.updateElementTime(30)

      expect(mockViewController.addTime).toHaveBeenCalledTimes(2)
    })
  })

  describe("hide", () => {
    it("tears down the view", () => {
      expect(mockViewController.hideView).toHaveBeenCalledTimes(0)

      DebugTool.hide()

      expect(mockViewController.hideView).toHaveBeenCalledTimes(1)
    })
  })
})
