import Chronicle from "./chronicle.ts"

describe("Chronicle", () => {
  let chronicle

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
    const testErrorObject = {
      message: "an error message",
      code: 1,
    }
    const expectedObject = {
      type: "error",
      error: testErrorObject,
      timestamp: 1234,
    }
    chronicle.error(testErrorObject)
    const chronicleLogs = chronicle.retrieve()

    expect(chronicleLogs.pop()).toEqual(expectedObject)
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
      { type: "error", error: { message: "Something went wrong" }, timestamp: 1234 },
      { type: "time", currentTime: 4, timestamp: 1234 },
      { type: "time", currentTime: 6, timestamp: 1234 },
    ]

    chronicle.time(1)
    chronicle.time(2)
    chronicle.info("An info message")
    chronicle.time(3)
    chronicle.error({ message: "Something went wrong" })
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
