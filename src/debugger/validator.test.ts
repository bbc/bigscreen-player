import { EntryCategory } from "./chronicle"
import { ValidationError, validate } from "./validator"

// import { MediaState } from "../models/mediastate";
// import { MediaKinds } from "../models/mediakinds";
// import { exhaustivenessMatchingGuard } from "../utils/typescript";

// import * as fc from "fast-check"
// import { it } from "@fast-check/jest";

// const mediaStateArbitary: fc.Arbitrary<MediaState> = fc.constantFrom(
//   MediaState.ENDED,
//   MediaState.FATAL_ERROR,
//   MediaState.PAUSED,
//   MediaState.PLAYING,
//   MediaState.STOPPED,
//   MediaState.WAITING
// )

// const mediaKindsArbitary: fc.Arbitrary<MediaKinds> = fc.constantFrom(MediaKinds.AUDIO, MediaKinds.VIDEO)

// function messageGenerator(): fc.Arbitrary<unknown> {
//   throw new Error("Function not implemented.");
// }

// function metricGenerator(): fc.Arbitrary<unknown> {
//   throw new Error("Function not implemented.");
// }

// const traceKinds: TraceKind[] = [
//   "buffered-ranges",
//   "error",
//   "event",
//   "gap",
//   "session-start",
//   "session-end",
//   "state-change"
// ]

// const traceKindDataLookup = {
//   "buffered-ranges": fc.record({
//     kind: mediaKindsArbitary,
//     buffered: fc.array(fc.tuple(fc.integer(), fc.integer()))
//   }),
//   error: fc.record({
//     name: fc.option(fc.string()),
//     message: fc.string()
//   }),
//   event: fc.record({
//     eventType: fc.string(),
//     eventTarget: fc.string()
//   }),
//   gap: fc.record({
//     from: fc.integer(),
//     to: fc.integer()
//   }),
//   "session-start": fc.integer(),
//   "session-end": fc.integer(),
//   "state-change": mediaStateArbitary
// }

// function traceGenerator() {
//   return fc.constantFrom(...traceKinds).chain((traceKind) => fc.record({
//       currentElementTime: fc.integer(),
//       sessionTime: fc.integer(),
//       category: fc.constantFrom(EntryCategory.TRACE),
//       kind: fc.constantFrom(traceKind),
//       data: traceKindDataLookup[traceKind]
//     }, { requiredKeys: ["currentElementTime", "sessionTime", "category", "kind", "data"] }))
// }

// const chronicleEntryGenerator = () => fc.constantFrom(EntryCategory.MESSAGE, EntryCategory.METRIC, EntryCategory.TRACE).chain((entry) => {
//   if (entry === EntryCategory.MESSAGE) return messageGenerator()
//   if (entry === EntryCategory.METRIC)  return metricGenerator()
//   if (entry === EntryCategory.TRACE)   return traceGenerator()

//   return exhaustivenessMatchingGuard(entry)
// })

// const chronicleLogGenerator = () => fc.array(chronicleEntryGenerator())

describe("Chronicle Validator", () => {
  // describe("Generative", () => {
  //   it.prop([chronicleLogGenerator()])("should validate an array containing valid Chronicle Entries", (input) => "type" in validate(input))
  // })

  it("should validate an array containing a valid Chronicle Entry", () => {
    const input: unknown = [
      {
        currentElementTime: 1,
        sessionTime: 1,
        category: EntryCategory.TRACE,
        kind: "session-start",
        data: Date.now(),
      },
    ]

    const result = validate(input)
    expect(result).toEqual(input)
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
        currentElementTime: 1,
        sessionTime: 1,
        kind: "session-start",
        data: Date.now(),
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
