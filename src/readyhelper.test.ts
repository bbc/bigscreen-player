import ReadyHelper from "./readyhelper"
import { MediaState } from "./models/mediastate"
import { LiveSupport } from "./models/livesupport"
import { ManifestType } from "./models/manifesttypes"

describe("readyHelper", () => {
  const callback = jest.fn()
  let readyHelper: ReturnType<typeof ReadyHelper>

  beforeEach(() => {
    callback.mockReset()
  })

  describe("- Initialisation -", () => {
    it("does not attempt to call callback if it is not supplied", () => {
      readyHelper = ReadyHelper(undefined, ManifestType.STATIC, LiveSupport.SEEKABLE)

      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 1,
        },
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe("- Basic -", () => {
    beforeEach(() => {
      readyHelper = ReadyHelper(undefined, ManifestType.STATIC, LiveSupport.SEEKABLE, callback)
    })

    it("does not call the supplied callback in init", () => {
      expect(callback).not.toHaveBeenCalled()
    })

    it("does not call the supplied callback if there is no event data", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it("only calls the supplied callback once when given multiple events containing a valid time", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0,
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)

      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 1,
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe("- VoD, No Initial Time -", () => {
    beforeEach(() => {
      readyHelper = ReadyHelper(undefined, ManifestType.STATIC, LiveSupport.SEEKABLE, callback)
    })

    it("calls the supplied callback when given event data containing a valid time", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0,
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("does not call the supplied callback when given event data containing an invalid time", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: -1,
        },
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it("does not call the supplied callback when media state transitions to FATAL_ERROR", () => {
      readyHelper.callbackWhenReady({
        data: {
          state: MediaState.FATAL_ERROR,
        },
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it("does not call the supplied callback when media state is undefined", () => {
      readyHelper.callbackWhenReady({
        data: {
          state: undefined,
        },
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it("calls the supplied callback when media state and time is valid", () => {
      readyHelper.callbackWhenReady({
        data: {
          state: MediaState.PLAYING,
          currentTime: 0,
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe("- VoD, Initial Time -", () => {
    beforeEach(() => {
      readyHelper = ReadyHelper(60, ManifestType.STATIC, LiveSupport.SEEKABLE, callback)
    })

    it("calls the supplied callback when current time exceeds intital time", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 61,
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("does not call the supplied callback when current time is 0", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0,
        },
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe("- Live -", () => {
    beforeEach(() => {
      readyHelper = ReadyHelper(undefined, ManifestType.DYNAMIC, LiveSupport.SEEKABLE, callback)
    })

    it("calls the supplied callback when given a valid seekable range and current time", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 60,
          seekableRange: {
            start: 59,
            end: 61,
          },
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("does not call the supplied callback when the seekable range is undefined", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0,
        },
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it("does not call the supplied callback when seekable range is 0 - 0", () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0,
          seekableRange: {
            start: 0,
            end: 0,
          },
        },
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe("- Live, Playable/Restartable -", () => {
    // TODO: this test passes even though seekable range with Infinity is not falsey
    it("calls the supplied callback regardless of seekable range if current time is positive for playable", () => {
      readyHelper = ReadyHelper(undefined, ManifestType.DYNAMIC, LiveSupport.PLAYABLE, callback)

      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 60,
          seekableRange: { start: Infinity, end: -Infinity },
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    // TODO: this test passes even though seekable range as an empty object is not falsey
    it("calls the supplied callback regardless of seekable range if current time is positive for restartable", () => {
      readyHelper = ReadyHelper(undefined, ManifestType.DYNAMIC, LiveSupport.RESTARTABLE, callback)

      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 60,
          seekableRange: {},
        },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
