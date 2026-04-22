import Chronicle, { EntryCategory } from "./chronicle"

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

    chronicle.appendMetric("ready-state", 0)
    chronicle.trace("error", new DOMException("Operation timed out", "timeout"))

    expect(handleUpdate).toHaveBeenCalledTimes(2)

    expect(handleUpdate).toHaveBeenNthCalledWith(1, {
      category: EntryCategory.METRIC,
      currentElementTime: 0,
      sessionTime: 0,
      kind: "ready-state",
      data: 0,
    })

    expect(handleUpdate).toHaveBeenNthCalledWith(2, {
      category: EntryCategory.TRACE,
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

    chronicle.appendMetric("ready-state", 0)

    expect(handleUpdate).toHaveBeenCalledTimes(1)

    chronicle.off("update", handleUpdate)

    chronicle.trace("error", new DOMException("Operation timed out", "timeout"))

    expect(handleUpdate).toHaveBeenCalledTimes(1)
    expect(handleUpdate).toHaveBeenNthCalledWith(1, {
      category: EntryCategory.METRIC,
      currentElementTime: 0,
      sessionTime: 0,
      kind: "ready-state",
      data: 0,
    })
  })

  it("appends a metric", () => {
    const chronicle = new Chronicle()

    chronicle.appendMetric("ready-state", 1)

    expect(chronicle.retrieve()).toEqual([
      { category: EntryCategory.METRIC, currentElementTime: 0, sessionTime: 0, kind: "ready-state", data: 1 },
    ])
  })

  it("associates a new metric with the current element time", () => {
    const chronicle = new Chronicle()

    chronicle.setCurrentElementTime(32)

    chronicle.appendMetric("buffer-length", 16)

    expect(chronicle.retrieve()).toEqual([
      { category: EntryCategory.METRIC, currentElementTime: 32, sessionTime: 0, kind: "buffer-length", data: 16 },
    ])
  })

  it("associates a new metric with the current session time", () => {
    const chronicle = new Chronicle()

    jest.advanceTimersByTime(2345)

    chronicle.appendMetric("duration", 300)

    expect(chronicle.retrieve()).toEqual([
      { category: EntryCategory.METRIC, currentElementTime: 0, sessionTime: 2345, kind: "duration", data: 300 },
    ])
  })

  describe("appending metrics", () => {
    it("records changes in metrics over time", () => {
      const chronicle = new Chronicle()

      chronicle.appendMetric("ready-state", 0)

      jest.advanceTimersByTime(2345)

      chronicle.appendMetric("ready-state", 1)

      jest.advanceTimersByTime(3456)
      chronicle.setCurrentElementTime(0.3)

      chronicle.appendMetric("ready-state", 4)

      expect(chronicle.retrieve()).toEqual([
        expect.objectContaining({ kind: "ready-state", data: 0, sessionTime: 0, currentElementTime: 0 }),
        expect.objectContaining({ kind: "ready-state", data: 1, sessionTime: 2345, currentElementTime: 0 }),
        expect.objectContaining({ kind: "ready-state", data: 4, sessionTime: 2345 + 3456, currentElementTime: 0.3 }),
      ])

      expect(chronicle.getLatestMetric("ready-state")).toMatchObject({
        kind: "ready-state",
        data: 4,
      })
    })

    it("does not record a new metric if the value is the same", () => {
      const chronicle = new Chronicle()

      chronicle.appendMetric("ready-state", 0)

      jest.advanceTimersByTime(2345)

      chronicle.appendMetric("ready-state", 0)

      jest.advanceTimersByTime(3456)
      chronicle.setCurrentElementTime(0.3)

      chronicle.appendMetric("ready-state", 1)

      expect(chronicle.retrieve()).toEqual([
        expect.objectContaining({ kind: "ready-state", data: 0, sessionTime: 0, currentElementTime: 0 }),
        expect.objectContaining({ kind: "ready-state", data: 1, sessionTime: 2345 + 3456, currentElementTime: 0.3 }),
      ])

      expect(chronicle.getLatestMetric("ready-state")).toMatchObject({
        kind: "ready-state",
        data: 1,
      })
    })

    it("does not record a new metric if the array value is the same", () => {
      const chronicle = new Chronicle()

      chronicle.appendMetric("seekable-range", [0, 67])

      jest.advanceTimersByTime(2345)

      chronicle.appendMetric("seekable-range", [0, 67])

      jest.advanceTimersByTime(3456)
      chronicle.setCurrentElementTime(0.3)

      chronicle.appendMetric("seekable-range", [1, 128])

      expect(chronicle.retrieve()).toEqual([
        expect.objectContaining({ kind: "seekable-range", data: [0, 67], sessionTime: 0, currentElementTime: 0 }),
        expect.objectContaining({
          kind: "seekable-range",
          data: [1, 128],
          sessionTime: 2345 + 3456,
          currentElementTime: 0.3,
        }),
      ])

      expect(chronicle.getLatestMetric("seekable-range")).toMatchObject({
        kind: "seekable-range",
        data: [1, 128],
      })
    })

    it.each([
      ["boolean", "ended", true],
      ["number", "frames-dropped", 0],
      ["string", "current-url", "mock://fake.url/"],
    ] as const)("accepts a value of type %s as a metric", (_, kind, value) => {
      const chronicle = new Chronicle()
      const code = () => chronicle.appendMetric(kind, value)

      expect(code).not.toThrow()
    })

    it("accepts an array-like as a metric value", () => {
      const chronicle = new Chronicle()
      const code = () => chronicle.appendMetric("seekable-range", [0, 30])

      expect(code).not.toThrow()
    })

    it("does not accept an object literal as a metric value", () => {
      const chronicle = new Chronicle()

      // @ts-expect-error - testing type checks
      const code = () => chronicle.appendMetric("invalid", { bad: "objects" })

      expect(code).toThrow(TypeError)
    })

    it("does not accept an array containing object literals as a metric value", () => {
      const chronicle = new Chronicle()

      // @ts-expect-error - testing type checks
      const code = () => chronicle.appendMetric("invalid", [2, { evil: "deeds" }])

      expect(code).toThrow(TypeError)
    })

    it("does not accept functions as a metric value", () => {
      const chronicle = new Chronicle()

      // @ts-expect-error - testing type checks
      const code = () => chronicle.appendMetric("seekable-range", () => false)

      expect(code).toThrow()
    })
  })

  describe("setting metrics", () => {
    it("does not record changes in metrics over time", () => {
      const chronicle = new Chronicle()

      chronicle.setMetric("buffer-length", 0)

      jest.advanceTimersByTime(1234)

      chronicle.setMetric("buffer-length", 5)

      expect(chronicle.retrieve()).toEqual([
        expect.objectContaining({ kind: "buffer-length", data: 5, sessionTime: 1234, currentElementTime: 0 }),
      ])

      expect(chronicle.getLatestMetric("buffer-length")).toMatchObject({
        kind: "buffer-length",
        data: 5,
      })
    })

    it.each([
      ["boolean", "ended", true],
      ["number", "frames-dropped", 0],
      ["string", "current-url", "mock://fake.url/"],
    ] as const)("accepts a value of type %s as a metric", (_, kind, value) => {
      const chronicle = new Chronicle()

      const code = () => chronicle.setMetric(kind, value)

      expect(code).not.toThrow()
    })

    it("accepts an array-like as a metric value", () => {
      const chronicle = new Chronicle()

      const code = () => chronicle.setMetric("seekable-range", [0, 30])

      expect(code).not.toThrow()
    })

    it("accepts nested array-likes as a metric value", () => {
      const chronicle = new Chronicle()

      const code = () => chronicle.setMetric("seekable-range", [0, 67])

      expect(code).not.toThrow()
    })

    it("does not accept an object literal as a metric value", () => {
      const chronicle = new Chronicle()

      // @ts-expect-error - testing type checks
      const code = () => chronicle.setMetric("invalid", { bad: "objects" })

      expect(code).toThrow(TypeError)
    })

    it("does not accept an array containing object literals as a metric value", () => {
      const chronicle = new Chronicle()

      // @ts-expect-error - testing type checks
      const code = () => chronicle.setMetric("invalid", [2, { evil: "deeds" }])

      expect(code).toThrow(TypeError)
    })

    it("does not accept functions as a metric value", () => {
      const chronicle = new Chronicle()

      // @ts-expect-error - testing type checks
      const code = () => chronicle.setMetric("seekable-range", () => false)

      expect(code).toThrow(TypeError)
    })
  })

  it("returns appended and set metrics together", () => {
    const chronicle = new Chronicle()

    chronicle.appendMetric("ready-state", 0)
    chronicle.setMetric("buffer-length", 0)

    chronicle.setCurrentElementTime(0.3)
    jest.advanceTimersByTime(1234)

    chronicle.appendMetric("ready-state", 1)
    chronicle.setMetric("buffer-length", 5)

    expect(chronicle.retrieve()).toEqual([
      expect.objectContaining({ kind: "ready-state", data: 0, sessionTime: 0, currentElementTime: 0 }),
      expect.objectContaining({ kind: "ready-state", data: 1, sessionTime: 1234, currentElementTime: 0.3 }),
      expect.objectContaining({ kind: "buffer-length", data: 5, sessionTime: 1234, currentElementTime: 0.3 }),
    ])
  })

  it("records a trace", () => {
    const chronicle = new Chronicle()

    chronicle.trace("error", new Error("💥 splode"))

    expect(chronicle.retrieve()).toEqual([
      {
        category: EntryCategory.TRACE,
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
        category: EntryCategory.MESSAGE,
        kind: "debug",
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
        category: EntryCategory.MESSAGE,
        kind: "info",
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
        category: EntryCategory.MESSAGE,
        kind: "warning",
        data: "😱",
        sessionTime: 0,
        currentElementTime: 0,
      },
    ])
  })
})
