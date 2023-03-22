import PlaybackUtils from "./playbackutils"

describe("Playback utils", () => {
  describe("Clone", () => {
    it("Makes a shallow clone of an object", () => {
      const input = {
        foo: 1,
        bar: "foo bar",
      }

      const clone = PlaybackUtils.clone(input)

      input.foo = 2
      input.bar = "boo far"

      expect(clone.foo).toBe(1)
      expect(clone.bar).toBe("foo bar")
    })
  })

  describe("Clone array", () => {
    it("Makes a shallow clone of an array", () => {
      const input = [
        {
          foo: 1,
          bar: "foo bar",
        },
        {
          foo: 2,
          bar: "foo bar 2",
        },
      ]

      const clone = PlaybackUtils.cloneArray(input)

      input[0].foo = 100
      input[0].bar = "boo far"

      input[1].foo = 200
      input[1].bar = "2 boo far"

      expect(clone[0].foo).toBe(1)
      expect(clone[0].bar).toBe("foo bar")

      expect(clone[1].foo).toBe(2)
      expect(clone[1].bar).toBe("foo bar 2")
    })
  })

  describe("Merge", () => {
    it("Creates a new object with properties merged from all supplied objects", () => {
      const obj1 = { obj1a: "a", obj1b: "b" }
      const obj2 = { obj2a: "a", obj2b: "b" }
      const obj3 = { obj3a: "a", obj3b: "b" }

      const merged = PlaybackUtils.merge(obj1, obj2, obj3)

      expect(merged).toEqual({
        obj1a: "a",
        obj1b: "b",
        obj2a: "a",
        obj2b: "b",
        obj3a: "a",
        obj3b: "b",
      })
    })

    it("Should merge deep objects and overwrite with the latest argument", () => {
      const obj1 = {
        data: {
          test1: "test1",
          propToBeChanged: "test2",
        },
      }
      const obj2 = {
        data: {
          propToBeChanged: "PropHasBeenChanged",
          test2: "test2",
        },
      }

      const merged = PlaybackUtils.merge(obj1, obj2)

      expect(merged).toEqual({
        data: {
          test1: "test1",
          propToBeChanged: "PropHasBeenChanged",
          test2: "test2",
        },
      })
    })
  })

  describe("Array start with", () => {
    it("Returns true if the supplied array starts with the items in the partial array", () => {
      expect(PlaybackUtils.arrayStartsWith(["x", "y", "z"], ["x", "y", "z"])).toBe(true)
      expect(PlaybackUtils.arrayStartsWith(["x", "y", "z"], ["x", "y"])).toBe(true)
      expect(PlaybackUtils.arrayStartsWith(["x", "y", "z"], ["x"])).toBe(true)
      expect(PlaybackUtils.arrayStartsWith(["x", "y", "z"], [])).toBe(true)
    })

    it("Returns false if the supplied array does not start with the items in the partial array", () => {
      expect(PlaybackUtils.arrayStartsWith(["x", "y", "z"], ["x", "z"])).toBe(false)
      expect(PlaybackUtils.arrayStartsWith(["x", "y"], ["x", "y", "z"])).toBe(false)
      expect(PlaybackUtils.arrayStartsWith(["x", "y"], ["x", "z"])).toBe(false)
      expect(PlaybackUtils.arrayStartsWith([], ["x"])).toBe(false)
    })
  })

  describe("Pluck", () => {
    it("Returns an array of attribute values requested", () => {
      const array = [
        {
          foo: 1,
          bar: 2,
        },
        {
          foo: 3,
          bar: 4,
        },
        {
          foo: 5,
          bar: 6,
        },
      ]

      const expectedFoo = [1, 3, 5]
      const expectedBar = [2, 4, 6]

      expect(PlaybackUtils.pluck(array, "foo")).toEqual(expectedFoo)
      expect(PlaybackUtils.pluck(array, "bar")).toEqual(expectedBar)
    })
  })

  describe("Flatten", () => {
    it("Returns the new flattened array", () => {
      expect(PlaybackUtils.flatten([1, [2, [3, [4]], 5]])).toEqual([1, 2, [3, [4]], 5])
    })
  })

  describe("Without", () => {
    it("Returns new array excluding all occurrences of given value", () => {
      expect(PlaybackUtils.without(["a", "", "b", "", "c"], "")).toEqual(["a", "b", "c"])
      expect(PlaybackUtils.without(["a", "b", "c", "d"], "c")).toEqual(["a", "b", "d"])
      expect(PlaybackUtils.without(["a", "b", "c"], "d")).toEqual(["a", "b", "c"])
    })
  })

  describe("Swap", () => {
    it("should swap two items", () => {
      expect(PlaybackUtils.swap([1, 2, 3, 4], 1, 2)).toEqual([1, 3, 2, 4])
    })

    it("should not modify the original array", () => {
      const orig = [1, 2, 3, 4]
      PlaybackUtils.swap(orig, 1, 2)

      expect(orig).toEqual([1, 2, 3, 4])
    })
  })
})
