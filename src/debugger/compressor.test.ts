// import { compress, denormalize, normalize } from "./compressor"

import { EntryType, TimestampedTrace } from "./chronicle"
import { decompress } from "./compressor"

describe("Chronicle Compressor", () => {
  describe("Validation", () => {
    it("should validate a JSON array containing a valid Trace", () => {
      const trace: TimestampedTrace = {
        currentElementTime: 1,
        sessionTime: 1,
        type: EntryType.TRACE,
        kind: "session-start",
        data: new Date(Date.now()),
      }

      const input = JSON.stringify([trace])
      const result = decompress(input)

      expect(result).toEqual([trace])
    })
  })

  describe("Compression", () => {
    describe("normalize", () => {
      it.todo("should handle an empty string")
      it.todo("should normalize the input string")
      it.todo("should return strings without normalizable characters untouched")
    })

    describe("denormalize", () => {
      it.todo("should handle an empty string")
      it.todo("should denormalize the input string")
      it.todo("should return strings without normalizable characters untouched")
    })

    describe("Metrics", () => {
      it.todo("compresses a simple metric")
      it.todo("compresses a complex metric")
    })
  })
})
