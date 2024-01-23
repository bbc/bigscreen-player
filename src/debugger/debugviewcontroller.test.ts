import Chronicle, { History } from "./chronicle"
import DebugView from "./debugview"
import ViewController from "./debugviewcontroller"

describe("Debug View", () => {
  beforeAll(() => {
    jest.useFakeTimers()

    jest.spyOn(DebugView, "render").mockImplementation()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    jest.setSystemTime(0)
  })

  it("parses static info from an array of chronicle values", () => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    chronicle.pushMetric("paused", true)
    chronicle.pushMetric("ready-state", 4)
    chronicle.pushMetric("seeking", false)

    controller.addEntries(chronicle.retrieve())

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({
        static: [
          { id: "paused", key: "paused", value: true },
          { id: "ready-state", key: "ready state", value: 4 },
          { id: "seeking", key: "seeking", value: false },
        ],
      })
    )
  })

  it.each([
    [new Date(0), new Date(3600000), "00:00:00 - 01:00:00"],
    [new Date(1518018558259), new Date(1518019158259), "15:49:18 - 15:59:18"],
  ])("converts a seekable range %i-%i in a metric into a human-readable string %s-%s", (start, end, expected) => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    chronicle.pushMetric("seekable-range", { start, end })

    controller.addEntries(chronicle.retrieve())

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({
        static: [{ id: "seekable-range", key: "seekable range", value: expected }],
      })
    )
  })

  it("parses dynamic info from an array of chronicle values", () => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    chronicle.info("Hello world")

    jest.advanceTimersByTime(500)

    chronicle.trace("event", { eventType: "paused", eventTarget: "MediaElement" })

    jest.advanceTimersByTime(3600000)

    chronicle.info("Hello world, an hour later")

    controller.addEntries(chronicle.retrieve())

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamic: [
          "00:00:00.000 - Info: Hello world",
          "00:00:00.500 - Event: 'paused' from MediaElement",
          "01:00:00.500 - Info: Hello world, an hour later",
        ],
      })
    )
  })

  it("parses errors into a human-readable string", () => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    chronicle.trace("error", new TypeError("The TV exploded💥"))

    controller.addEntries(chronicle.retrieve())

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({ dynamic: ["00:00:00.000 - TypeError: The TV exploded💥"] })
    )
  })

  it("parses events into a human-readable representation", () => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    chronicle.trace("event", { eventType: "paused", eventTarget: "MediaElement" })

    controller.addEntries(chronicle.retrieve())

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamic: ["00:00:00.000 - Event: 'paused' from MediaElement"],
      })
    )
  })

  it("parses session times into a human-readable representation", () => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    chronicle.trace("session-start", new Date(2024, 0, 1, 0, 0, 0, 0))

    jest.advanceTimersByTime(Date.UTC(1970, 0, 1, 2, 31, 16, 15))

    chronicle.trace("session-end", new Date(2024, 0, 1, 2, 31, 16, 15))

    controller.addEntries(chronicle.retrieve())

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamic: [
          "00:00:00.000 - Playback session started at 2024-01-01 00:00:00.000Z",
          "02:31:16.015 - Playback session ended at 2024-01-01 02:31:16.015Z",
        ],
      })
    )
  })

  it("parses current element time into a human-readable representation", () => {
    const controller = new ViewController()

    controller.addTime({ currentElementTime: 788.9999, sessionTime: 0 })

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({ dynamic: ["00:00:00.000 - Video time: 789.00"] })
    )
  })

  it("updates the last time entry if the last dynamic entry is time", () => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    chronicle.trace("event", { eventType: "playing", eventTarget: "MediaElement" })

    controller.addEntries(chronicle.retrieve())

    controller.addTime({
      currentElementTime: chronicle.getCurrentElementTime(),
      sessionTime: chronicle.getSessionTime(),
    })

    jest.advanceTimersByTime(600)
    chronicle.setCurrentElementTime(0.6)

    controller.addTime({
      currentElementTime: chronicle.getCurrentElementTime(),
      sessionTime: chronicle.getSessionTime(),
    })

    expect(DebugView.render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dynamic: ["00:00:00.000 - Event: 'playing' from MediaElement", "00:00:00.600 - Video time: 0.60"],
      })
    )
  })

  it("appends a new time entry if the last dynamic entry isn't time", () => {
    const controller = new ViewController()
    const chronicle = new Chronicle()

    controller.addTime({
      currentElementTime: chronicle.getCurrentElementTime(),
      sessionTime: chronicle.getSessionTime(),
    })

    chronicle.trace("event", { eventType: "playing", eventTarget: "MediaElement" })

    controller.addEntries(chronicle.retrieve())

    jest.advanceTimersByTime(600)
    chronicle.setCurrentElementTime(0.6)

    controller.addTime({
      currentElementTime: chronicle.getCurrentElementTime(),
      sessionTime: chronicle.getSessionTime(),
    })

    expect(DebugView.render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dynamic: [
          "00:00:00.000 - Video time: 0.00",
          "00:00:00.000 - Event: 'playing' from MediaElement",
          "00:00:00.600 - Video time: 0.60",
        ],
      })
    )
  })

  it("throws on an unknown entry type", () => {
    const controller = new ViewController()

    const badUpdate = () => controller.addEntries([{ type: "bad-type", nefarious: "purpose" }] as unknown as History)

    expect(badUpdate).toThrow(TypeError)
  })

  it("uses the latest value for static fields", () => {
    const controller = new ViewController()

    const chronicle = new Chronicle()

    chronicle.pushMetric("ready-state", 0)

    jest.advanceTimersByTime(500)

    chronicle.pushMetric("ready-state", 1)

    jest.advanceTimersByTime(4500)

    chronicle.pushMetric("ready-state", 4)

    controller.addEntries(chronicle.retrieve())

    expect(DebugView.render).toHaveBeenCalledWith(
      expect.objectContaining({ static: [{ id: "ready-state", key: "ready state", value: 4 }] })
    )
  })
})
