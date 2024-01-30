import { EntryType, MetricForKey, Timestamped } from "./chronicle"
import { compress, denormalize, normalize } from "./compressor"

describe("Chronicle Compressor", () => {
  describe("normalize", () => {
    it("should handle an empty string", () => {
      const input = ""
      const expected = ""

      const result = normalize(input)

      expect(result).toEqual(expected)
    })

    it("should normalize the input string", () => {
      const input = "[Hello, World]%;"
      const expected = "%5BHello, World%5D%25%3B"

      const result = normalize(input)

      expect(result).toEqual(expected)
    })

    it("should return strings without normalizable characters untouched", () => {
      const input = "Hello, World"
      const expected = "Hello, World"

      const result = normalize(input)

      expect(result).toEqual(expected)
    })
  })

  describe("denormalize", () => {
    it("should handle an empty string", () => {
      const input = ""
      const expected = ""

      const result = denormalize(input)

      expect(result).toEqual(expected)
    })

    it("should denormalize the input string", () => {
      const input = "%5BHello, World%5D%25%3B"
      const expected = "[Hello, World]%;"

      const result = denormalize(input)

      expect(result).toEqual(expected)
    })

    it("should return strings without normalizable characters untouched", () => {
      const input = "Hello, World"
      const expected = "Hello, World"

      const result = denormalize(input)

      expect(result).toEqual(expected)
    })
  })

  describe("Metrics", () => {
    it("compresses a simple metric", () => {
      const input: Timestamped<MetricForKey<"ready-state">> = {
        type: EntryType.METRIC,
        key: "ready-state",
        currentElementTime: 0,
        sessionTime: 0,
        data: 1,
      }

      const expected = "RS[0]1"

      const result = compress([input])

      expect(result).toEqual(expected)
    })

    it("compresses a complex metric", () => {
      const input: Timestamped<MetricForKey<"buffered-audio">> = {
        type: EntryType.METRIC,
        key: "buffered-audio",
        currentElementTime: 0,
        sessionTime: 0,
        data: [
          [0, 1],
          [1, 2],
        ],
      }

      const expected = "BA[0][[0,1][1,2]]"

      const result = compress([input])

      expect(result).toEqual(expected)
    })
  })
})
