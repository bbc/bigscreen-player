import Chronicle, { EntryType } from "./chronicle"

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
    chronicle.error(new DOMException("Operation timed out", "timeout"))

    expect(handleUpdate).toHaveBeenCalledTimes(2)

    expect(handleUpdate).toHaveBeenNthCalledWith(1, {
      type: EntryType.METRIC,
      currentElementTime: 0,
      sessionTime: 0,
      key: "ready-state",
      data: 0,
    })

    expect(handleUpdate).toHaveBeenNthCalledWith(2, {
      type: EntryType.MESSAGE,
      level: "error",
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

    chronicle.error(new DOMException("Operation timed out", "timeout"))

    expect(handleUpdate).toHaveBeenCalledTimes(1)
    expect(handleUpdate).toHaveBeenNthCalledWith(1, [
      { type: EntryType.METRIC, currentElementTime: 0, sessionTime: 0, key: "ready-state", data: 0 },
    ])
  })

  describe("pushing metrics", () => {
    it("add a metric", () => {
      const chronicle = new Chronicle()

      chronicle.pushMetric("ready-state", 1)

      expect(chronicle.retrieve()).toEqual([
        { type: EntryType.METRIC, currentElementTime: 0, sessionTime: 0, key: "ready-state", data: 1 },
      ])
    })

    it("associates a metric with the current element time", () => {
      const chronicle = new Chronicle()

      chronicle.setCurrentElementTime(32)

      chronicle.pushMetric("bitrate", 16)

      expect(chronicle.retrieve()).toEqual([
        { type: EntryType.METRIC, currentElementTime: 32, sessionTime: 0, key: "bitrate", data: 16 },
      ])
    })

    it("associates a metric with the current session time", () => {
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
  })

  it("records an event trace", () => {
    const chronicle = new Chronicle()

    chronicle.event("playing", "MediaElement")

    expect(chronicle.retrieve()).toEqual([
      {
        type: EntryType.TRACE,
        kind: "event",
        eventType: "playing",
        eventTarget: "MediaElement",
        currentElementTime: 0,
        sessionTime: 0,
      },
    ])
  })

  describe("logging messages", () => {
    it("logs debug info", () => {
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

    it("logs an error", () => {
      const chronicle = new Chronicle()

      chronicle.error(new Error("Oops"))

      expect(chronicle.retrieve()).toEqual([
        {
          type: EntryType.MESSAGE,
          level: "error",
          data: new Error("Oops"),
          sessionTime: 0,
          currentElementTime: 0,
        },
      ])
    })

    it("logs info", () => {
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

    it("logs warnings", () => {
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
})
