import { EntryType } from "./chronicle"
import { validate } from "./validator"

describe("Chronicle Validator", () => {
  it("should validate a JSON array containing a valid Trace", () => {
    const input: unknown = [
      {
        currentElementTime: 1,
        sessionTime: 1,
        type: EntryType.TRACE,
        kind: "session-start",
        data: Date.now(),
      },
    ]

    const result = validate(input)

    expect(result).toEqual(input)
  })
})
