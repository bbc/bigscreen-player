import MediaState from './models/mediastate'
import ReadyHelper from './readyhelper'
import WindowTypes from './models/windowtypes'
import LiveSupport from './models/livesupport'

describe('readyHelper', () => {
  let callback
  let readyHelper

  beforeEach(() => {
    callback = jest.fn()
  })

  describe('- Initialisation -', () => {
    it('does not attempt to call callback if it is not supplied', () => {
      readyHelper = new ReadyHelper(undefined, WindowTypes.STATIC, LiveSupport.RESTARTABLE, undefined)

      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 1
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('- Basic -', () => {
    beforeEach(() => {
      readyHelper = new ReadyHelper(undefined, WindowTypes.STATIC, LiveSupport.RESTARTABLE, callback)
    })

    it('does not call the supplied callback in init', () => {
      expect(callback).not.toHaveBeenCalled()
    })

    it('does not call the supplied callback if there is no event data', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('only calls the supplied callback once when given multiple events containing a valid time', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0
        }
      })

      expect(callback).toHaveBeenCalledTimes(1)

      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 1
        }
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('- VoD, No Initial Time -', () => {
    beforeEach(() => {
      readyHelper = new ReadyHelper(undefined, WindowTypes.STATIC, LiveSupport.RESTARTABLE, callback)
    })

    it('calls the supplied callback when given event data containing a valid time', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0
        }
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not call the supplied callback when given event data containing an invalid time', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: -1
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not call the supplied callback when media state transitions to FATAL_ERROR', () => {
      readyHelper.callbackWhenReady({
        data: {
          state: MediaState.FATAL_ERROR
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not call the supplied callback when media state is undefined', () => {
      readyHelper.callbackWhenReady({
        data: {
          state: undefined
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('calls the supplied callback when media state and time is valid', () => {
      readyHelper.callbackWhenReady({
        data: {
          state: MediaState.PLAYING,
          currentTime: 0
        }
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('- VoD, Initial Time -', () => {
    beforeEach(() => {
      readyHelper = new ReadyHelper(60, WindowTypes.STATIC, LiveSupport.RESTARTABLE, callback)
    })

    it('calls the supplied callback when current time exceeds intital time', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 61
        }
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not call the supplied callback when current time is 0', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('- Live -', () => {
    beforeEach(() => {
      readyHelper = new ReadyHelper(undefined, WindowTypes.SLIDING, LiveSupport.RESTARTABLE, callback)
    })

    it('calls the supplied callback when given a valid seekable range and current time', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 60,
          seekableRange: {
            start: 59,
            end: 61
          }
        }
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not call the supplied callback when the seekable range is undefined', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('does not call the supplied callback when seekable range is 0 - 0', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 0,
          seekableRange: {
            start: 0,
            end: 0
          }
        }
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('- Live, Playable -', () => {
    beforeEach(() => {
      readyHelper = new ReadyHelper(undefined, WindowTypes.SLIDING, LiveSupport.PLAYABLE, callback)
    })

    it('calls the supplied callback regardless of seekable range if current time is positive', () => {
      readyHelper.callbackWhenReady({
        timeUpdate: true,
        data: {
          currentTime: 60,
          seekableRange: {}
        }
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
