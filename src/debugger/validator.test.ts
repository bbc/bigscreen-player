import { EntryCategory, TimestampedTrace, TimestampedMessage, TimestampedMetric, TimestampedEntry } from "./chronicle"
import { validate } from "./validator"

const timestamp = {
  currentElementTime: 1,
  sessionTime: 1,
}

const chronicleTrace: TimestampedTrace = {
  ...timestamp,
  category: EntryCategory.TRACE,
  kind: "session-start",
  data: Date.now(),
}

const chronicleMetric: TimestampedMetric = {
  ...timestamp,
  category: EntryCategory.METRIC,
  kind: "version",
  data: "0.1.0",
}

const chronicleMessage: TimestampedMessage = {
  ...timestamp,
  category: EntryCategory.MESSAGE,
  kind: "info",
  data: "An Info Level Message",
}

const chronicleLog: TimestampedEntry[] = [chronicleTrace, chronicleMetric, chronicleMessage]

describe("Chronicle Validator", () => {
  test.each([
    ["Trace", [chronicleTrace]],
    ["Metric", [chronicleMetric]],
    ["Message", [chronicleMessage]],
    ["Log", chronicleLog],
  ])("should validate an array containing a valid Chronicle %s", (_, testData) => {
    const result = validate(testData)

    expect(result).toEqual({
      data: testData,
      error: false,
    })
  })

  test("should accept an empty array", () => {
    const result = validate([])
    expect(result).toEqual({
      data: [],
      error: false,
    })
  })

  it("should reject a string", () => {
    const input: unknown = "TotallyRealChronicleLog"

    const result = validate(input)
    expect(result.error).toBeTruthy()
  })

  test("should reject an empty object", () => {
    const input: unknown = {}

    const result = validate(input)
    expect(result.error).toBeTruthy()
  })

  test("should reject an object that does not specify EntryCategory", () => {
    const input: unknown = [
      {
        ...chronicleTrace,
        category: undefined,
      },
    ]

    const result = validate(input)
    expect(result.error).toBeTruthy()
  })
})
