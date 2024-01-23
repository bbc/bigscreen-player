import getError, { NoErrorThrownError } from "../testutils/geterror"
import Chronicle, { EntryType, MetricForKey } from "./chronicle"

describe("Chronicle", () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  beforeEach(() => {
    jest.setSystemTime(1234)
  })

  it("updates current time", () => {
    const chronicle = new Chronicle()

    expect(chronicle.getCurrentElementTime()).toBe(0)

    chronicle.setCurrentElementTime(12)

    expect(chronicle.getCurrentElementTime()).toBe(12)
  })

  it("notifies update listeners", () => {
    const chronicle = new Chronicle()

    const handleUpdate = jest.fn()

    chronicle.on("update", handleUpdate)

    chronicle.pushMetric("ready-state", 0)
    chronicle.trace("error", new DOMException("Operation timed out", "timeout"))

    expect(handleUpdate).toHaveBeenCalledTimes(2)

    expect(handleUpdate).toHaveBeenNthCalledWith(1, {
      type: EntryType.METRIC,
      currentElementTime: 0,
      sessionTime: 0,
      key: "ready-state",
      data: 0,
    })

    expect(handleUpdate).toHaveBeenNthCalledWith(2, {
      type: EntryType.TRACE,
      kind: "error",
      data: new DOMException("Operation timed out", "timeout"),
      sessionTime: 0,
      currentElementTime: 0,
    })
  })

  it("does not notify unregistered update listeners", () => {
    const chronicle = new Chronicle()

    const handleUpdate = jest.fn()

    chronicle.on("update", handleUpdate)

    chronicle.pushMetric("ready-state", 0)

    expect(handleUpdate).toHaveBeenCalledTimes(1)

    chronicle.off("update", handleUpdate)

    chronicle.trace("error", new DOMException("Operation timed out", "timeout"))

    expect(handleUpdate).toHaveBeenCalledTimes(1)
    expect(handleUpdate).toHaveBeenNthCalledWith(1, {
      type: EntryType.METRIC,
      currentElementTime: 0,
      sessionTime: 0,
      key: "ready-state",
      data: 0,
    })
  })

  it("appends a metric", () => {
    const chronicle = new Chronicle()

    chronicle.pushMetric("ready-state", 1)

    expect(chronicle.retrieve()).toEqual([
      { type: EntryType.METRIC, currentElementTime: 0, sessionTime: 0, key: "ready-state", data: 1 },
    ])
  })

  it("associates a new metric with the current element time", () => {
    const chronicle = new Chronicle()

    chronicle.setCurrentElementTime(32)

    chronicle.pushMetric("bitrate", 16)

    expect(chronicle.retrieve()).toEqual([
      { type: EntryType.METRIC, currentElementTime: 32, sessionTime: 0, key: "bitrate", data: 16 },
    ])
  })

  it("associates a new metric with the current session time", () => {
    const chronicle = new Chronicle()

    jest.advanceTimersByTime(2345)

    chronicle.pushMetric("duration", 300)

    expect(chronicle.retrieve()).toEqual([
      { type: EntryType.METRIC, currentElementTime: 0, sessionTime: 2345, key: "duration", data: 300 },
    ])
  })

  it("records changes in metrics over time", () => {
    const chronicle = new Chronicle()

    chronicle.pushMetric("ready-state", 0)

    jest.advanceTimersByTime(2345)

    chronicle.pushMetric("ready-state", 1)

    jest.advanceTimersByTime(3456)
    chronicle.setCurrentElementTime(0.3)

    chronicle.pushMetric("ready-state", 4)

    expect(chronicle.retrieve()).toEqual([
      expect.objectContaining({ key: "ready-state", data: 0, sessionTime: 0, currentElementTime: 0 }),
      expect.objectContaining({ key: "ready-state", data: 1, sessionTime: 2345, currentElementTime: 0 }),
      expect.objectContaining({ key: "ready-state", data: 4, sessionTime: 2345 + 3456, currentElementTime: 0.3 }),
    ])

    expect(chronicle.getLatestMetric("ready-state")).toMatchObject({
      key: "ready-state",
      data: 4,
    })
  })

  it("does not record a new metric if the value is the same", () => {
    const chronicle = new Chronicle()

    chronicle.pushMetric("ready-state", 0)

    jest.advanceTimersByTime(2345)

    chronicle.pushMetric("ready-state", 0)

    jest.advanceTimersByTime(3456)
    chronicle.setCurrentElementTime(0.3)

    chronicle.pushMetric("ready-state", 1)

    expect(chronicle.retrieve()).toEqual([
      expect.objectContaining({ key: "ready-state", data: 0, sessionTime: 0, currentElementTime: 0 }),
      expect.objectContaining({ key: "ready-state", data: 1, sessionTime: 2345 + 3456, currentElementTime: 0.3 }),
    ])

    expect(chronicle.getLatestMetric("ready-state")).toMatchObject({
      key: "ready-state",
      data: 1,
    })
  })

  it.each([
    ["boolean", "ended", true],
    ["number", "frames-dropped", 0],
    ["string", "current-url", "mock://fake.url/"],
  ] as const)("accepts a value of type %s as a metric", (_, key, value) => {
    const chronicle = new Chronicle()

    const error = getError(() => chronicle.pushMetric(key, value))

    expect(error).toBeInstanceOf(NoErrorThrownError)
  })

  it("accepts an array-like as a metric value", () => {
    const chronicle = new Chronicle()

    const error = getError(() => chronicle.pushMetric("seekable-range", [0, 30]))

    expect(error).toBeInstanceOf(NoErrorThrownError)
  })

  it("accepts nested array-likes as a metric value", () => {
    const chronicle = new Chronicle()

    const error = getError(() =>
      chronicle.pushMetric("audio-buffered-ranges", [
        [0, 12],
        [16, 20],
      ])
    )

    expect(error).toBeInstanceOf(NoErrorThrownError)
  })

  it("does not accept an object literal as a metric value", () => {
    const chronicle = new Chronicle()

    // @ts-expect-error - testing type checks
    const error = getError(() => chronicle.pushMetric("invalid", { bad: "objects" }))

    expect(error).toBeInstanceOf(TypeError)
  })

  it("does not accept an array containing object literals as a metric value", () => {
    const chronicle = new Chronicle()

    // @ts-expect-error - testing type checks
    const error = getError(() => chronicle.pushMetric("invalid", [2, { evil: "deeds" }]))

    expect(error).toBeInstanceOf(TypeError)
  })

  it("does not accept functions as a metric value", () => {
    const chronicle = new Chronicle()

    // @ts-expect-error - testing type checks
    const error = getError(() => chronicle.pushMetric("seekable-range", () => false))

    expect(error).toBeInstanceOf(NoErrorThrownError)
  })

  it("records a trace", () => {
    const chronicle = new Chronicle()

    chronicle.trace("error", new Error("💥 splode"))

    expect(chronicle.retrieve()).toEqual([
      {
        type: EntryType.TRACE,
        kind: "error",
        data: new Error("💥 splode"),
        sessionTime: 0,
        currentElementTime: 0,
      },
    ])
  })

  it("logs a debug message", () => {
    const chronicle = new Chronicle()

    chronicle.debug("👾")

    expect(chronicle.retrieve()).toEqual([
      {
        type: EntryType.MESSAGE,
        level: "debug",
        data: "👾",
        sessionTime: 0,
        currentElementTime: 0,
      },
    ])
  })

  it("logs an info message", () => {
    const chronicle = new Chronicle()

    chronicle.info("🧐")

    expect(chronicle.retrieve()).toEqual([
      {
        type: EntryType.MESSAGE,
        level: "info",
        data: "🧐",
        sessionTime: 0,
        currentElementTime: 0,
      },
    ])
  })

  it("logs a warning message", () => {
    const chronicle = new Chronicle()

    chronicle.warn("😱")

    expect(chronicle.retrieve()).toEqual([
      {
        type: EntryType.MESSAGE,
        level: "warning",
        data: "😱",
        sessionTime: 0,
        currentElementTime: 0,
      },
    ])
  })
})
