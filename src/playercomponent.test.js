import MediaState from "./models/mediastate"
import WindowTypes from "./models/windowtypes"
import MediaKinds from "./models/mediakinds"
import LiveSupport from "./models/livesupport"
import PluginEnums from "./pluginenums"
import { DASH, HLS } from "./models/transferformats"
import Plugins from "./plugins"
import PlayerComponent from "./playercomponent"
import * as StrategyPicker from "./playbackstrategy/strategypicker"
import PauseTriggers from "./models/pausetriggers"

window.bigscreenPlayer = {}

jest.mock("./plugins", () => ({
  interface: {
    onErrorCleared: jest.fn(),
    onBuffering: jest.fn(),
    onBufferingCleared: jest.fn(),
    onError: jest.fn(),
    onFatalError: jest.fn(),
    onErrorHandled: jest.fn(),
    onSubtitlesLoadError: jest.fn(),
  },
}))

const mockLiveSupport = LiveSupport.SEEKABLE

let playbackElement

const mockStrategy = (() => {
  let eventCallback, errorCallback, timeUpdateCallback

  return {
    addEventCallback: (that, cb) => {
      eventCallback = (ev) => cb.call(that, ev)
    },
    addErrorCallback: (that, cb) => {
      errorCallback = (ev) => cb.call(that, ev)
    },
    addTimeUpdateCallback: (that, cb) => {
      timeUpdateCallback = () => cb.call(that)
    },

    mockingHooks: {
      fireEvent: (ev) => (eventCallback ? eventCallback(ev) : undefined),
      fireError: (ev) => (errorCallback ? errorCallback(ev) : undefined),
      fireTimeUpdate: () => (errorCallback ? timeUpdateCallback() : undefined),
    },

    pause: jest.fn(),
    load: jest.fn(),
    reset: jest.fn(),
    getPlayerElement: jest.fn(() => playbackElement),
    setPlaybackRate: jest.fn(),
    setCurrentTime: jest.fn(),
    getDuration: jest.fn(),
    getSeekableRange: jest.fn(),
    getCurrentTime: jest.fn(),
    tearDown: jest.fn(),
    transitions: {
      canBePaused: () => true,
      canBeginSeek: () => true,
    },
    isPaused: () => false,
    getLiveSupport: () => mockLiveSupport,
  }
})()

describe("Player Component", () => {
  let playerComponent
  let mockStateUpdateCallback
  let corePlaybackData
  let errorCallback
  let forceMediaSourcesError
  let mockMediaSources
  let testTime
  let updateTestTime = false

  beforeAll(() => {
    mockStateUpdateCallback = jest.fn()
  })

  // opts = streamType, playbackType, mediaType, disableUi
  function setUpPlayerComponent(opts = {}) {
    errorCallback = opts.errorCallback || undefined

    playbackElement = document.createElement("div")
    playbackElement.id = "app"

    corePlaybackData = {
      media: {
        kind: opts.mediaKind || MediaKinds.VIDEO,
        codec: undefined,
        urls: [
          { url: "a.mpd", cdn: "cdn-a" },
          { url: "b.mpd", cdn: "cdn-b" },
          { url: "c.mpd", cdn: "cdn-c" },
        ],
        type: opts.type || "application/dash+xml",
        transferFormat: opts.transferFormat || DASH,
        bitrate: undefined,
      },
      time: testTime,
    }

    mockMediaSources = {
      failover: jest.fn().mockImplementation((successCallback, errorCallback, _) => {
        if (forceMediaSourcesError) {
          errorCallback()
        } else {
          if (updateTestTime) {
            testTime = {
              windowStartTime: 744000,
              windowEndTime: 4344000,
              correction: 0,
            }
          }
          successCallback()
        }
      }),
      time: () => testTime,
      refresh: (successCallback, _) => {
        if (updateTestTime) {
          testTime = {
            windowStartTime: 744000,
            windowEndTime: 4344000,
            correction: 0,
          }
        }
        successCallback()
      },
    }

    const windowType = opts.windowType || WindowTypes.STATIC

    playerComponent = new PlayerComponent(
      playbackElement,
      corePlaybackData,
      mockMediaSources,
      windowType,
      mockStateUpdateCallback,
      errorCallback
    )
  }

  beforeEach(() => {
    jest
      .spyOn(StrategyPicker, "default")
      .mockImplementation(() => new Promise((resolve) => resolve(() => mockStrategy)))
    forceMediaSourcesError = false
    testTime = {
      windowStartTime: 724000,
      windowEndTime: 4324000,
      correction: 0,
    }
    updateTestTime = false
  })

  afterEach(() => {
    jest.resetAllMocks()
    playerComponent = undefined
  })

  describe("Construction", () => {
    it("should fire error cleared on the plugins", () => {
      const pluginData = {
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
        cdn: undefined,
        isInitialPlay: undefined,
        timeStamp: expect.any(Date),
      }

      Plugins.interface.onErrorCleared.mockImplementationOnce((data) => {
        expect(data).toMatchObject(pluginData)
      })

      setUpPlayerComponent()
    })

    // eslint-disable-next-line jest/no-done-callback
    it("should trigger the error callback when strategyPicker rejects", (done) => {
      jest
        .spyOn(StrategyPicker, "default")
        .mockImplementationOnce(() => new Promise((_, reject) => reject({ error: "strategydynamicloaderror" })))

      const errorCallbackSpy = jest.fn(() => {
        expect(errorCallbackSpy).toHaveBeenCalledWith({ error: "strategydynamicloaderror" })
        done()
      })

      setUpPlayerComponent({ errorCallback: errorCallbackSpy })
    })
  })

  describe("Pause", () => {
    it("should pass through Pause Trigger to the playback strategy", () => {
      const pauseTrigger = PauseTriggers.APP

      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        playerComponent.pause({ pauseTrigger })
        expect(mockStrategy.pause).toHaveBeenCalledWith(expect.objectContaining({ pauseTrigger }))
      })
    })

    it("should disable auto resume when playing a video webcast", () => {
      setUpPlayerComponent({ windowType: WindowTypes.GROWING })

      return StrategyPicker.default().then(() => {
        playerComponent.pause()
        expect(mockStrategy.pause).toHaveBeenCalledWith(expect.objectContaining({ disableAutoResume: true }))
      })
    })

    it("should use options for disable auto resume when playing audio", () => {
      setUpPlayerComponent({ windowType: WindowTypes.SLIDING, mediaKind: "audio" })

      jest.spyOn(mockStrategy, "pause")

      return StrategyPicker.default().then(() => {
        const expected = (disableAutoResume) => expect.objectContaining({ disableAutoResume })

        playerComponent.pause()
        expect(mockStrategy.pause).toHaveBeenCalledWith(expected())

        playerComponent.pause({ disableAutoResume: false })
        expect(mockStrategy.pause).toHaveBeenCalledWith(expected(false))

        playerComponent.pause({ disableAutoResume: true })
        expect(mockStrategy.pause).toHaveBeenCalledWith(expected(true))
      })
    })

    it("should use options for disable auto resume when not playing a webcast", () => {
      setUpPlayerComponent()

      jest.spyOn(mockStrategy, "pause")

      return StrategyPicker.default().then(() => {
        const expected = (disableAutoResume) => expect.objectContaining({ disableAutoResume })

        playerComponent.pause()
        expect(mockStrategy.pause).toHaveBeenCalledWith(expected())

        playerComponent.pause({ disableAutoResume: false })
        expect(mockStrategy.pause).toHaveBeenCalledWith(expected(false))

        playerComponent.pause({ disableAutoResume: true })
        expect(mockStrategy.pause).toHaveBeenCalledWith(expected(true))
      })
    })
  })

  describe("getPlayerElement", () => {
    // This is used within the TALStatsAPI
    it("should return the element from the strategy", () => {
      setUpPlayerComponent()

      const playerElement = document.createElement("video")
      jest.spyOn(mockStrategy, "getPlayerElement").mockImplementation(() => playerElement)

      return StrategyPicker.default().then(() => {
        expect(playerComponent.getPlayerElement()).toEqual(playerElement)
      })
    })

    it("should return null if it does not exist on the strategy", () => {
      setUpPlayerComponent()

      mockStrategy.getPlayerElement = undefined

      return StrategyPicker.default().then(() => {
        expect(playerComponent.getPlayerElement()).toBeNull()
      })
    })
  })

  describe("setCurrentTime", () => {
    let currentStrategy

    beforeEach(() => {
      currentStrategy = window.bigscreenPlayer.playbackStrategy
    })

    afterEach(() => {
      window.bigscreenPlayer.playbackStrategy = currentStrategy
    })

    it("should setCurrentTime on the strategy when in a seekable state", () => {
      jest.spyOn(mockStrategy, "getSeekableRange").mockImplementation(() => ({ start: 0, end: 100 }))
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        mockStrategy.load.mockReset()
        playerComponent.setCurrentTime(10)

        expect(mockStrategy.setCurrentTime).toHaveBeenCalledWith(10)
        expect(mockStrategy.load).not.toHaveBeenCalled()
      })
    })

    it("should reload the element if restartable", () => {
      window.bigscreenPlayer.playbackStrategy = "nativestrategy"
      window.bigscreenPlayer.liveSupport = LiveSupport.RESTARTABLE

      jest.spyOn(mockStrategy, "getSeekableRange").mockImplementation(() => ({ start: 0, end: 100 }))

      setUpPlayerComponent({
        windowType: WindowTypes.SLIDING,
        transferFormat: HLS,
        type: "applesomething",
      })

      updateTestTime = true

      return StrategyPicker.default().then(() => {
        playerComponent.setCurrentTime(50)

        expect(mockStrategy.load).toHaveBeenCalledTimes(2)
        expect(mockStrategy.load).toHaveBeenCalledWith("applesomething", 30)
      })
    })

    it("should reload the element with no time if the new time is within 30 seconds of the end of the window", () => {
      window.bigscreenPlayer.playbackStrategy = "nativestrategy"

      jest.spyOn(mockStrategy, "getSeekableRange").mockImplementation(() => ({ start: 0, end: 70 }))
      mockStrategy.liveSupport = LiveSupport.RESTARTABLE

      setUpPlayerComponent({
        windowType: WindowTypes.SLIDING,
        transferFormat: HLS,
        type: "applesomething",
      })

      // this will move the window forward by 20 seconds from it's original position
      testTime = {
        windowStartTime: 744000,
        windowEndTime: 4344000,
        correction: 0,
      }

      return StrategyPicker.default().then(() => {
        playerComponent.setCurrentTime(50)

        expect(mockStrategy.load).toHaveBeenCalledTimes(2)
        expect(mockStrategy.load).toHaveBeenCalledWith("applesomething", undefined)
      })
    })
  })

  describe("Playback Rate", () => {
    it("calls into the strategy to set the playback rate", () => {
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        playerComponent.setPlaybackRate(2)

        expect(mockStrategy.setPlaybackRate).toHaveBeenCalledWith(2)
      })
    })

    it("calls into the strategy to get the playback rate", () => {
      // eslint-disable-next-line jest/prefer-spy-on
      mockStrategy.getPlaybackRate = jest.fn(() => 1.5)
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        const rate = playerComponent.getPlaybackRate()

        expect(mockStrategy.getPlaybackRate).toHaveBeenCalled()
        expect(rate).toBe(1.5)
      })
    })
  })

  describe("events", () => {
    describe("on playing", () => {
      it("should fire error cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

          expect(Plugins.interface.onErrorCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })

      it("should clear error timeout", () => {
        jest.useFakeTimers()

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is expected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

          jest.advanceTimersByTime(30000)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      it("should clear fatal error timeout", () => {
        jest.useFakeTimers()

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is expected to be cleared
          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

          jest.advanceTimersByTime(5000)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      it("should fire buffering cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          newCdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)
          expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })

      it("should publish a media state update of playing", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).toEqual(MediaState.PLAYING)
        })
      })
    })

    describe("on paused", () => {
      it("should publish a media state update event of paused", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).toEqual(MediaState.PAUSED)
        })
      })

      it("should clear error timeout", () => {
        jest.useFakeTimers()

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is expected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)
          mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

          jest.advanceTimersByTime(30000)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      it("should clear fatal error timeout", () => {
        jest.useFakeTimers()

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is expected to be cleared
          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

          jest.advanceTimersByTime(5000)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      it("should fire error cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

          expect(Plugins.interface.onErrorCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })

      it("should fire buffering cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

          expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })
    })

    describe("on buffering", () => {
      it("should publish a media state update of waiting", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).toEqual(MediaState.WAITING)
        })
      })

      it("should start the error timeout", () => {
        jest.useFakeTimers()

        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)
          jest.advanceTimersByTime(30000)

          // error timeout when reached will fire a buffering cleared on the plugins.
          expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))

          jest.useRealTimers()
        })
      })

      it("should fire error cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)
          expect(Plugins.interface.onErrorCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })

      it("should fire on buffering on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.STARTED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

          expect(Plugins.interface.onBuffering).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })
    })

    describe("on ended", () => {
      it("should clear error timeout", () => {
        jest.useFakeTimers()

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is expected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)
          mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

          jest.advanceTimersByTime(30000)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      it("should clear fatal error timeout", () => {
        jest.useFakeTimers()

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is expected to be cleared
          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

          jest.advanceTimersByTime(5000)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      it("should fire error cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

          expect(Plugins.interface.onErrorCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })

      it("should fire buffering cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

          expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })

      it("should publish a media state update event of ended", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).toEqual(MediaState.ENDED)
        })
      })
    })

    describe("on timeUpdate", () => {
      it("should publish a media state update event", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireTimeUpdate()

          expect(mockStateUpdateCallback.mock.calls[0][0].timeUpdate).toBe(true)
        })
      })
    })

    describe("on error", () => {
      it("should fire buffering cleared on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })

      // raise error
      it("should clear error timeout", () => {
        jest.useFakeTimers()

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is expected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

          jest.advanceTimersByTime(29999)

          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          jest.advanceTimersByTime(1)

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      // raise error
      it("should publish a media state update of waiting", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          expect(mockStateUpdateCallback.mock.calls[0][0].data.state).toEqual(MediaState.WAITING)
        })
      })

      // raise error
      it("should fire on error on the plugins", () => {
        const pluginData = {
          status: PluginEnums.STATUS.STARTED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
          code: 0,
          message: "unknown",
        }

        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          expect(Plugins.interface.onError).toHaveBeenCalledWith(expect.objectContaining(pluginData))
        })
      })
    })
  })

  describe("cdn failover", () => {
    let fatalErrorPluginData
    let currentTime
    let type
    let currentStrategy

    beforeEach(() => {
      jest.useFakeTimers()

      fatalErrorPluginData = {
        status: PluginEnums.STATUS.FATAL,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
        cdn: undefined,
        newCdn: undefined,
        isInitialPlay: undefined,
        timeStamp: expect.any(Object),
        code: 0,
        message: "unknown",
      }

      currentTime = 50
      type = "application/dash+xml"

      jest.spyOn(mockStrategy, "getSeekableRange").mockImplementation(() => ({ start: 0, end: 100 }))
      jest.spyOn(mockStrategy, "getCurrentTime").mockImplementation(() => currentTime)
      currentStrategy = window.bigscreenPlayer.playbackStrategy
    })

    afterEach(() => {
      window.bigscreenPlayer.playbackStrategy = currentStrategy
      jest.useRealTimers()
    })

    it("should failover after buffering for 30 seconds on initial playback", () => {
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        jest.advanceTimersByTime(29999)

        expect(mockStrategy.load).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(1)

        expect(mockStrategy.load).toHaveBeenCalledTimes(2)
        expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime)
        expect(mockMediaSources.failover).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({
            code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
            message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
          })
        )
      })
    })

    it("should failover after buffering for 20 seconds on normal playback", () => {
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING) // Set playback cause to normal
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        jest.advanceTimersByTime(19999)

        expect(mockStrategy.load).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(1)

        expect(mockStrategy.load).toHaveBeenCalledTimes(2)
        expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime)
        expect(mockMediaSources.failover).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({
            code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
            message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
          })
        )
      })
    })

    it("should failover after 5 seconds if we have not cleared an error from the device", () => {
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        jest.advanceTimersByTime(4999)

        expect(mockStrategy.load).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(1)

        expect(mockStrategy.load).toHaveBeenCalledTimes(2)
        expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime)
        expect(mockStrategy.reset).toHaveBeenCalledWith()

        expect(mockMediaSources.failover).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({ code: 0, message: "unknown" })
        )
      })
    })

    it("should fire a fatal error on the plugins if failover is not possible", () => {
      setUpPlayerComponent()
      forceMediaSourcesError = true

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        jest.advanceTimersByTime(5000)

        expect(mockStrategy.load).toHaveBeenCalledTimes(1)
        expect(Plugins.interface.onFatalError).toHaveBeenCalledWith(expect.objectContaining(fatalErrorPluginData))
      })
    })

    it("should publish a media state update of fatal if failover is not possible", () => {
      setUpPlayerComponent()
      forceMediaSourcesError = true

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })
        mockStateUpdateCallback.mockReset()

        jest.advanceTimersByTime(5000)

        expect(mockStrategy.load).toHaveBeenCalledTimes(1)
        expect(mockStateUpdateCallback.mock.calls[0][0].data.state).toEqual(MediaState.FATAL_ERROR)
        expect(mockStateUpdateCallback.mock.calls[0][0].code).toBe(0)
        expect(mockStateUpdateCallback.mock.calls[0][0].message).toBe("unknown")
      })
    })

    it("should failover for with updated failover time when window time data has changed", () => {
      setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: HLS })
      updateTestTime = true

      return StrategyPicker.default().then(() => {
        // Set playback cause to normal
        mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        jest.advanceTimersByTime(19999)

        expect(mockStrategy.load).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(1)

        expect(mockStrategy.load).toHaveBeenCalledTimes(2)
        expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime - 20)
      })
    })

    it("should clear buffering timeout error timeout", () => {
      setUpPlayerComponent()
      forceMediaSourcesError = true

      return StrategyPicker.default().then(() => {
        // trigger a buffering event to start the error timeout,
        // after 30 seconds it should fire a media state update of FATAL
        // it is expected to be cleared
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        jest.advanceTimersByTime(30000)

        expect(mockStateUpdateCallback.mock.calls[0][0].isBufferingTimeoutError).toBe(false)
      })
    })

    it("should clear fatal error timeout", () => {
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        // trigger a error event to start the fatal error timeout,
        // after 5 seconds it should fire a media state update of FATAL
        // it is expected to be cleared
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        jest.advanceTimersByTime(5000)

        expect(mockStateUpdateCallback.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)
      })
    })

    it("should fire error cleared on the plugins", () => {
      const pluginData = {
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
        cdn: undefined,
        isInitialPlay: undefined,
        timeStamp: expect.any(Object),
      }

      setUpPlayerComponent({ multiCdn: true })

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        jest.advanceTimersByTime(5000)

        expect(Plugins.interface.onErrorCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
      })
    })

    it("should fire buffering cleared on the plugins", () => {
      const pluginData = {
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.BUFFERING,
        isBufferingTimeoutError: false,
        cdn: undefined,
        isInitialPlay: true,
        timeStamp: expect.any(Object),
      }

      setUpPlayerComponent({ multiCdn: true })

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        jest.advanceTimersByTime(5000)

        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith(expect.objectContaining(pluginData))
      })
    })
  })

  describe("teardown", () => {
    it("should reset the strategy", () => {
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        playerComponent.tearDown()

        expect(mockStrategy.reset).toHaveBeenCalled()
      })
    })

    it("should clear error timeout", () => {
      jest.useFakeTimers()

      setUpPlayerComponent()
      forceMediaSourcesError = true

      return StrategyPicker.default().then(() => {
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        playerComponent.tearDown()

        jest.advanceTimersByTime(30000)

        // expect 1 call as player goes into WAITING when event is fired above, but should not
        // have a call after the time advances as the timer will have been cleared
        expect(mockStateUpdateCallback).toHaveBeenCalledTimes(1)

        jest.useRealTimers()
      })
    })

    it("should clear fatal error timeout", () => {
      jest.useFakeTimers()

      setUpPlayerComponent()
      forceMediaSourcesError = true

      return StrategyPicker.default().then(() => {
        // trigger a error event to start the fatal error timeout,
        // after 5 seconds it should fire a media state update of FATAL
        // it is expected to be cleared
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        playerComponent.tearDown()

        jest.advanceTimersByTime(5000)

        // expect 1 call as player goes into WAITING when fireError is called above, but should not
        // have a call after the time advances as the timer will have been cleared
        expect(mockStateUpdateCallback).toHaveBeenCalledTimes(1)

        jest.useRealTimers()
      })
    })

    it("teardown - should fire error cleared on the plugins", () => {
      const pluginData = {
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
        cdn: undefined,
        isInitialPlay: undefined,
        timeStamp: expect.any(Object),
      }

      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        playerComponent.tearDown()

        expect(Plugins.interface.onErrorCleared).toHaveBeenCalledWith(pluginData)
      })
    })

    it("should fire buffering cleared on the plugins", () => {
      const pluginData = {
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.BUFFERING,
        isBufferingTimeoutError: false,
        cdn: undefined,
        isInitialPlay: true,
        timeStamp: expect.any(Object),
      }

      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        playerComponent.tearDown()

        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith(pluginData)
      })
    })

    it("should tear down the strategy", () => {
      setUpPlayerComponent()

      return StrategyPicker.default().then(() => {
        playerComponent.tearDown()

        expect(mockStrategy.tearDown).toHaveBeenCalledWith()
      })
    })
  })
})
