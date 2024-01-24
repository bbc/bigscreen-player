import DebugTool, { LogLevels } from "./debugtool"
import ViewController, { DebugViewController } from "./debugviewcontroller"

jest.mock("./debugviewcontroller")

function getMockViewController(): DebugViewController {
  const [instance] = jest.mocked(ViewController).mock.instances
  return instance
}

beforeAll(() => {
  jest.useFakeTimers()
})

beforeEach(() => {
  jest.setSystemTime(Date.UTC(1970, 0, 1, 0, 0, 1, 234))
  jest.clearAllMocks()

  DebugTool.tearDown()
})

describe("Debug Tool", () => {
  describe("init", () => {
    it("logs session start", () => {
      DebugTool.init()

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start", data: new Date(1234) }),
      ])
    })

    it("wipes previous logs", () => {
      DebugTool.init()

      jest.advanceTimersByTime(1)

      DebugTool.info("Hello")

      jest.advanceTimersByTime(1)

      DebugTool.info("World")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ data: "Hello" }),
        expect.objectContaining({ data: "World" }),
      ])

      DebugTool.init()

      expect(DebugTool.getDebugLogs()).toEqual([expect.objectContaining({ kind: "session-start" })])
    })
  })

  describe("teardown", () => {
    it("logs session end", () => {
      DebugTool.init()

      jest.advanceTimersByTime(1234)

      DebugTool.tearDown()

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start", data: new Date(1234) }),
        expect.objectContaining({ kind: "session-end", data: new Date(2468) }),
      ])
    })

    it("does not wipe logs", () => {
      DebugTool.init()

      jest.advanceTimersByTime(1)

      DebugTool.info("Hello")

      jest.advanceTimersByTime(1)

      DebugTool.info("World")

      jest.advanceTimersByTime(1)

      DebugTool.tearDown()

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ data: "Hello" }),
        expect.objectContaining({ data: "World" }),
        expect.objectContaining({ kind: "session-end" }),
      ])
    })

    it("tears down the view if it was visible", () => {
      DebugTool.init()

      const mockViewController = getMockViewController()

      mockViewController.isVisible = true

      DebugTool.tearDown()

      expect(mockViewController.hideView).toHaveBeenCalledTimes(1)
    })
  })
})

describe("Debug Tool", () => {
  beforeEach(() => {
    DebugTool.init()
  })

  describe("getDebugLogs", () => {
    it("retrieves logs", () => {
      jest.advanceTimersByTime(1)

      DebugTool.info("Hello")

      jest.advanceTimersByTime(1)

      DebugTool.info("World")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ data: "Hello" }),
        expect.objectContaining({ data: "World" }),
      ])
    })
  })

  describe("logging a debug", () => {
    it("takes a string", () => {
      DebugTool.setLogLevel(LogLevels.DEBUG)

      jest.advanceTimersByTime(1)

      DebugTool.debug("Detailed information")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ level: "debug", data: "Detailed information" }),
      ])
    })
  })

  describe("logging an error", () => {
    it("takes a string", () => {
      jest.advanceTimersByTime(1)

      DebugTool.error("something went wrong")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ kind: "error", data: new Error("something went wrong") }),
      ])
    })

    it("takes an instance of Error", () => {
      jest.advanceTimersByTime(1)

      DebugTool.error(new TypeError("something went REALLY wrong"))

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ kind: "error", data: new TypeError("something went REALLY wrong") }),
      ])
    })
  })

  describe("logging info", () => {
    it("takes a string", () => {
      jest.advanceTimersByTime(1)

      DebugTool.info("Hello World")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ level: "info", data: "Hello World" }),
      ])
    })
  })

  describe("logging a warning", () => {
    it("takes a string", () => {
      jest.advanceTimersByTime(1)

      DebugTool.warn("you're using a deprecated thingie!")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ level: "warning", data: "you're using a deprecated thingie!" }),
      ])
    })
  })

  describe("logging metrics", () => {
    it("appends the metric to the log", () => {
      jest.advanceTimersByTime(1)

      DebugTool.metric("bitrate", 1000)
      DebugTool.metric("seeking", true)
      DebugTool.metric("seeking", false)

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ key: "bitrate", data: 1000 }),
        expect.objectContaining({ key: "seeking", data: true }),
        expect.objectContaining({ key: "seeking", data: false }),
      ])
    })
  })

  describe("logging events", () => {
    it("appens the event trace to the log", () => {
      jest.advanceTimersByTime(1)

      DebugTool.event("playing")

      expect(DebugTool.getDebugLogs()).toEqual([
        expect.objectContaining({ kind: "session-start" }),
        expect.objectContaining({ kind: "event", data: { eventType: "playing", eventTarget: "unknown" } }),
      ])
    })
  })

  describe("show", () => {
    it("provides the chronicle so far to the view controller", () => {
      const mockViewController = getMockViewController()

      expect(mockViewController.addEntries).toHaveBeenCalledTimes(0)

      DebugTool.show()

      expect(mockViewController.addEntries).toHaveBeenCalledTimes(1)
    })

    it("provides the current time to the view controller", () => {
      const mockViewController = getMockViewController()

      expect(mockViewController.addTime).toHaveBeenCalledTimes(0)

      DebugTool.show()

      expect(mockViewController.addTime).toHaveBeenCalledTimes(1)
    })

    it("renders new entries to the view controller", () => {
      const mockViewController = getMockViewController()

      DebugTool.show()

      expect(mockViewController.addEntries).toHaveBeenCalledTimes(1)

      DebugTool.metric("seeking", true)

      expect(mockViewController.addEntries).toHaveBeenCalledTimes(2)
    })

    it("updates time of the view controller", () => {
      const mockViewController = getMockViewController()

      DebugTool.show()

      expect(mockViewController.addTime).toHaveBeenCalledTimes(1)

      DebugTool.updateElementTime(30)

      expect(mockViewController.addTime).toHaveBeenCalledTimes(2)
    })
  })

  describe("hide", () => {
    it("tears down the view", () => {
      const mockViewController = getMockViewController()

      expect(mockViewController.hideView).toHaveBeenCalledTimes(0)

      DebugTool.hide()

      expect(mockViewController.hideView).toHaveBeenCalledTimes(1)
    })
  })
})
