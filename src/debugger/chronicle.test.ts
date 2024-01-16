import Chronicle, { ChronicleEntryType, MetricKey } from "./chronicle"

describe("Chronicle", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: 1234 })
  })

  it("updates current time", () => {
    const chronicle = new Chronicle()

    expect(chronicle.getElementTime()).toBe(0)

    chronicle.setElementTime(12)

    expect(chronicle.getElementTime()).toBe(12)
  })

  describe("pushing metrics", () => {
    it("add a metric", () => {
      const chronicle = new Chronicle()

      chronicle.pushMetric(MetricKey.READY_STATE, 1)

      expect(chronicle.retrieve()).toEqual([
        { type: ChronicleEntryType.METRIC, currentElementTime: 0, sessionTime: 0, key: "ready-state", data: 1 },
      ])
    })

    it("associates a metric with the current element time", () => {
      const chronicle = new Chronicle()

      chronicle.setElementTime(32)

      chronicle.pushMetric(MetricKey.BITRATE, 16)

      expect(chronicle.retrieve()).toEqual([
        { type: ChronicleEntryType.METRIC, currentElementTime: 32, sessionTime: 0, key: "bitrate", data: 16 },
      ])
    })

    it("associates a metric with the current session time", () => {
      const chronicle = new Chronicle()

      jest.advanceTimersByTime(2345)

      chronicle.pushMetric(MetricKey.DURATION, 300)

      expect(chronicle.retrieve()).toEqual([
        { type: ChronicleEntryType.METRIC, currentElementTime: 0, sessionTime: 1111, key: "duration", data: 300 },
      ])
    })

    it("records changes in metrics over time", () => {
      const chronicle = new Chronicle()

      chronicle.pushMetric(MetricKey.READY_STATE, 0)

      jest.advanceTimersByTime(2345)

      chronicle.pushMetric(MetricKey.READY_STATE, 1)

      jest.advanceTimersByTime(3456)
      chronicle.setElementTime(0.3)

      chronicle.pushMetric(MetricKey.READY_STATE, 4)

      expect(chronicle.retrieve()).toEqual([
        expect.objectContaining({ key: "ready-state", data: 0, sessionTime: 0, currentElementTime: 0 }),
        expect.objectContaining({ key: "ready-state", data: 1, sessionTime: 1111, currentElementTime: 0 }),
        expect.objectContaining({ key: "ready-state", data: 4, sessionTime: 4567, currentElementTime: 0.3 }),
      ])

      expect(chronicle.getLatestMetric(MetricKey.READY_STATE)).toEqual({
        key: "ready-state",
        data: 4,
      })
    })
  })

  it.todo("register for updates")
  it.todo("unregister for updates")
  it.todo("pushing info")
  it.todo("pushing warning")
  it.todo("pushing error")
  it.todo("pushing event")
  it.todo("pushing apicall")
  it.todo("pushing metric")
  it.todo("metric history")
})

describe.skip("Chronicle", () => {
  let chronicle: Chronicle

  beforeAll(() => {
    jest.useFakeTimers({ now: 1234 })
  })

  beforeEach(() => {
    chronicle = new Chronicle()
  })

  it("stores an info message with type and message", () => {
    const testInfoMessage = "A test info message"
    const expectedObject = {
      type: "info",
      message: testInfoMessage,
      timestamp: 1234,
    }

    chronicle.info(testInfoMessage)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs.pop()).toEqual(expectedObject)
  })

  it("pushes subsequent info message to array", () => {
    const firstMessage = "A test info message"
    const secondMessage = "A second test message"
    const expectedObject = {
      type: "info",
      message: secondMessage,
      timestamp: 1234,
    }

    chronicle.info(firstMessage)
    chronicle.info(secondMessage)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs.pop()).toEqual(expectedObject)
  })

  it("stores an error with type and error", () => {
    chronicle.error(new Error("An error message"))
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs.pop()).toEqual({ type: "error", error: new Error("An error message"), timestamp: 1234 })
  })

  it("stores an event with type and event", () => {
    const testEventObject = {
      state: "eg PLAYING",
      data: "some data",
    }
    const expectedObject = {
      type: "event",
      event: testEventObject,
      timestamp: 1234,
    }
    chronicle.event(testEventObject)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs.pop()).toEqual(expectedObject)
  })

  it("stores an apicall with type and the call type", () => {
    const testApiCallType = "play"
    const expectedObject = {
      type: "apicall",
      calltype: testApiCallType,
      timestamp: 1234,
    }
    chronicle.apicall(testApiCallType)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs.pop()).toEqual(expectedObject)
  })

  it("pushes the first time event to the array", () => {
    const expectedObject = {
      type: "time",
      currentTime: 1,
      timestamp: 1234,
    }
    chronicle.time(1)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs.pop()).toEqual(expectedObject)
  })

  it("subsequenty time event overwrites the previous in the array", () => {
    const expectedObject = {
      type: "time",
      currentTime: 2,
      timestamp: 1234,
    }
    chronicle.time(1)
    chronicle.time(2)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs).toHaveLength(2)
    expect(chronicleLogs.pop()).toEqual(expectedObject)
  })

  it("time followed by info followed by time doesnt compress second time event", () => {
    const expectedObject = {
      type: "time",
      currentTime: 3,
      timestamp: 1234,
    }
    chronicle.time(1)
    chronicle.time(2)
    chronicle.info("An info message")
    chronicle.time(3)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs).toHaveLength(4)
    expect(chronicleLogs.pop()).toEqual(expectedObject)
  })

  it("stores compressed time info and error events", () => {
    const expectedArray = [
      { type: "time", currentTime: 1, timestamp: 1234 },
      { type: "time", currentTime: 2, timestamp: 1234 },
      { type: "info", message: "An info message", timestamp: 1234 },
      { type: "time", currentTime: 3, timestamp: 1234 },
      { type: "error", error: new Error("S0m3th1ng w3nt wr0ng"), timestamp: 1234 },
      { type: "time", currentTime: 4, timestamp: 1234 },
      { type: "time", currentTime: 6, timestamp: 1234 },
    ]

    chronicle.time(1)
    chronicle.time(2)
    chronicle.info("An info message")
    chronicle.time(3)
    chronicle.error(new Error("S0m3th1ng w3nt wr0ng"))
    chronicle.time(4)
    chronicle.time(5)
    chronicle.time(6)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs).toHaveLength(7)
    expect(chronicleLogs).toEqual(expectedArray)
  })

  it("stores first and last time events", () => {
    const expectedArray = [
      { type: "time", currentTime: 1, timestamp: 1234 },
      { type: "time", currentTime: 3, timestamp: 1234 },
    ]

    chronicle.time(1)
    chronicle.time(2)
    chronicle.time(3)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs).toHaveLength(2)
    expect(chronicleLogs).toEqual(expectedArray)
  })

  it("stores key value events", () => {
    const expectedArray = [
      { type: "keyvalue", keyvalue: { Bitrate: "1000" }, timestamp: 1234 },
      { type: "keyvalue", keyvalue: { Duration: "1345" }, timestamp: 1234 },
    ]

    chronicle.keyValue({ Bitrate: "1000" })
    chronicle.keyValue({ Duration: "1345" })

    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs).toHaveLength(2)
    expect(chronicleLogs).toEqual(expectedArray)
  })
})
