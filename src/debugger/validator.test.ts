import { EntryCategory, TimestampedTrace, TimestampedMessage, TimestampedMetric } from "./chronicle"
import { ValidationError, validate } from "./validator"

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
  key: "version",
  data: "0.1.0",
}

const chronicleMessage: TimestampedMessage = {
  ...timestamp,
  category: EntryCategory.MESSAGE,
  level: "info",
  data: "An Info Level Message",
}

describe("Chronicle Validator", () => {
  test.each([
    ["Trace", [chronicleTrace]],
    ["Metric", [chronicleMetric]],
    ["Message", [chronicleMessage]],
    ["Log", [chronicleTrace, chronicleMetric, chronicleMessage]],
  ])("should validate an array containing a valid Chronicle %s", (_, testData) => {
    const result = validate(testData)
    expect(result).toEqual(testData)
  })

  it("should accept an empty array", () => {
    const input: unknown = []

    const result = validate(input)
    expect(result).toEqual(input)
  })

  it("should reject a string", () => {
    const input: unknown = "TotallyRealChronicleLog"
    const expected: ValidationError = {
      issues: [
        {
          path: [],
          message: "Expected array, received string",
        },
      ],
    }

    const result = validate(input)
    expect(result).toEqual(expected)
  })

  it("should reject an object that does not specify EntryCategory", () => {
    const input: unknown = [
      {
        ...chronicleTrace,
        category: undefined,
      },
    ]

    const expected: ValidationError = {
      issues: [
        {
          path: [0, "category"],
          message: "Invalid discriminator value. Expected 'message' | 'metric' | 'trace'",
        },
      ],
    }

    const result = validate(input)
    expect(result).toEqual(expected)
  })
})
