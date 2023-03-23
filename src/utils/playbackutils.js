export default {
  clone: (args) => {
    const clone = {}
    for (const prop in args) {
      if (args.hasOwnProperty(prop)) {
        clone[prop] = args[prop]
      }
    }
    return clone
  },

  deepClone: function (objectToClone) {
    if (!objectToClone) {
      return objectToClone
    }

    let clone, propValue, propName
    clone = Array.isArray(objectToClone) ? [] : {}
    for (propName in objectToClone) {
      propValue = objectToClone[propName]

      // check for date
      if (propValue && Object.prototype.toString.call(propValue) === "[object Date]") {
        clone[propName] = new Date(propValue)
        continue
      }

      clone[propName] = typeof propValue === "object" ? this.deepClone(propValue) : propValue
    }
    return clone
  },

  cloneArray: function (arr) {
    const clone = []

    for (let i = 0, n = arr.length; i < n; i++) {
      clone.push(this.clone(arr[i]))
    }

    return clone
  },

  merge: function () {
    const merged = {}

    for (let i = 0; i < arguments.length; i++) {
      const obj = arguments[i]
      for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          if (Object.prototype.toString.call(obj[prop]) === "[object Object]") {
            merged[prop] = this.merge(merged[prop], obj[prop])
          } else {
            merged[prop] = obj[prop]
          }
        }
      }
    }

    return merged
  },

  arrayStartsWith: (array, partial) => {
    for (let i = 0; i < partial.length; i++) {
      if (array[i] !== partial[i]) {
        return false
      }
    }

    return true
  },

  find: (array, predicate) => {
    return array.reduce((acc, it, i) => {
      return acc !== false ? acc : predicate(it) && it
    }, false)
  },

  findIndex: (array, predicate) => {
    return array.reduce((acc, it, i) => {
      return acc !== false ? acc : predicate(it) && i
    }, false)
  },

  swap: (array, i, j) => {
    const arr = array.slice()
    const temp = arr[i]

    arr[i] = arr[j]
    arr[j] = temp

    return arr
  },

  pluck: (array, property) => {
    const plucked = []

    for (let i = 0; i < array.length; i++) {
      plucked.push(array[i][property])
    }

    return plucked
  },

  flatten: (arr) => [].concat.apply([], arr),

  without: (arr, value) => {
    const newArray = []

    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== value) {
        newArray.push(arr[i])
      }
    }

    return newArray
  },

  contains: (arr, subset) => {
    return [].concat(subset).every((item) => {
      return [].concat(arr).indexOf(item) > -1
    })
  },

  pickRandomFromArray: (arr) => {
    return arr[Math.floor(Math.random() * arr.length)]
  },

  filter: (arr, predicate) => {
    const filteredArray = []

    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i])) {
        filteredArray.push(arr[i])
      }
    }

    return filteredArray
  },

  noop: () => {},

  generateUUID: () => {
    let d = new Date().getTime()

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (d + Math.random() * 16) % 16 | 0
      d = Math.floor(d / 16)
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
    })
  },

  path: (object, keys) => {
    return (keys || []).reduce((accum, key) => {
      return (accum || {})[key]
    }, object || {})
  },
}
