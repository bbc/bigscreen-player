import LiveSupport from "./models/livesupport"
import { ManifestType } from "./models/manifesttypes"
import MediaKinds from "./models/mediakinds"
import MediaState from "./models/mediastate"
import PauseTriggers from "./models/pausetriggers"
import { TransferFormat } from "./models/transferformats"
import WindowTypes from "./models/windowtypes"
import StrategyPicker from "./playbackstrategy/strategypicker"
import PluginEnums from "./pluginenums"
import Plugins from "./plugins"
import PlayerComponent from "./playercomponent"

window.bigscreenPlayer = {}

jest.mock("./playbackstrategy/strategypicker", () => jest.fn())

function createPlaybackElement() {
  const el = document.createElement("div")
  el.id = "app"

  return el
}

const mockLiveSupport = LiveSupport.SEEKABLE

const mockMediaSources = {
  failover: jest.fn().mockResolvedValue(),
  reset: jest.fn().mockResolvedValue(),
  time: jest.fn(),
}

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
    getPlayerElement: jest.fn(),
    setPlaybackRate: jest.fn(),
    setCurrentTime: jest.fn(),
    getDuration: jest.fn(),
    getSeekableRange: jest.fn(),
    getCurrentTime: jest.fn(),
    getPlaybackRate: jest.fn(),
    tearDown: jest.fn(),
    transitions: {
      canBePaused: jest.fn().mockReturnValue(true),
      canBeginSeek: jest.fn().mockReturnValue(true),
    },
    isPaused: () => false,
    getLiveSupport: () => mockLiveSupport,
  }
})()

describe("Player Component", () => {
  let playerComponent
  let onStateUpdate
  let bigscreenPlayerData
  let errorCallback

  beforeEach(() => {
    jest.resetAllMocks()
    jest.useRealTimers()

    StrategyPicker.mockResolvedValue(() => mockStrategy)

    onStateUpdate = jest.fn()

    mockMediaSources.time.mockReturnValue({
      manifestType: ManifestType.STATIC,
      presentationTimeOffsetInMilliseconds: 0,
      availabilityStartTimeInMilliseconds: 0,
      timeShiftBufferDepthInMilliseconds: 0,
    })

    bigscreenPlayerData = {
      media: {
        kind: MediaKinds.VIDEO,
        urls: [
          { url: "a.mpd", cdn: "cdn-a" },
          { url: "b.mpd", cdn: "cdn-b" },
          { url: "c.mpd", cdn: "cdn-c" },
        ],
        type: "application/dash+xml",
        transferFormat: TransferFormat.DASH,
      },
    }
  })

  function setUpPlayerComponent() {
    playerComponent = new PlayerComponent(
      createPlaybackElement(),
      bigscreenPlayerData,
      mockMediaSources,
      onStateUpdate,
      errorCallback
    )
  }

  describe("construction", () => {
    it("should fire error cleared on the plugins", async () => {
      jest.spyOn(Plugins.interface, "onErrorCleared")

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      expect(Plugins.interface.onErrorCleared).toHaveBeenCalledWith({
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
        cdn: undefined,
        isInitialPlay: undefined,
        timeStamp: expect.any(Date),
      })
      expect(Plugins.interface.onErrorCleared).toHaveBeenCalledTimes(1)
    })

    it("should trigger the error callback when strategyPicker rejects", async () => {
      StrategyPicker.mockRejectedValueOnce(new Error("A network error occured"))

      const onError = jest.fn()

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        onError
      )

      await new Promise(process.nextTick)

      expect(onError).toHaveBeenCalledWith(new Error("A network error occured"))
    })
  })

  describe("pause", () => {
    it("should pass through Pause Trigger to the playback strategy", async () => {
      mockStrategy.transitions.canBePaused.mockReturnValueOnce(true)
      const pauseTrigger = PauseTriggers.APP

      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      playerComponent.pause({ pauseTrigger })

      expect(mockStrategy.pause).toHaveBeenCalledWith(expect.objectContaining({ pauseTrigger }))
    })
  })

  describe("getPlayerElement", () => {
    // This is used within the TALStatsAPI
    it("should return the element from the strategy", async () => {
      const playerElement = document.createElement("video")

      mockStrategy.getPlayerElement.mockReturnValueOnce(playerElement)

      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      expect(playerComponent.getPlayerElement()).toBe(playerElement)
    })

    it("should return null if it does not exist on the strategy", async () => {
      mockStrategy.getPlayerElement = undefined

      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      expect(playerComponent.getPlayerElement()).toBeNull()
    })
  })

  describe("setCurrentTime", () => {
    it("should setCurrentTime on the strategy when in a seekable state", async () => {
      mockStrategy.transitions.canBeginSeek.mockReturnValueOnce(true)

      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      expect(mockStrategy.load).toHaveBeenCalledTimes(1)

      playerComponent.setCurrentTime(10)

      expect(mockStrategy.setCurrentTime).toHaveBeenCalledWith(10)
      expect(mockStrategy.load).toHaveBeenCalledTimes(1)
    })
  })

  describe("Playback Rate", () => {
    it("calls into the strategy to set the playback rate", async () => {
      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      playerComponent.setPlaybackRate(2)

      expect(mockStrategy.setPlaybackRate).toHaveBeenCalledWith(2)
    })

    it("calls into the strategy to get the playback rate", async () => {
      mockStrategy.getPlaybackRate.mockReturnValueOnce(1.5)

      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      expect(playerComponent.getPlaybackRate()).toBe(1.5)
      expect(mockStrategy.getPlaybackRate).toHaveBeenCalledTimes(1)
    })
  })

  describe("events", () => {
    describe("on playing", () => {
      it("should publish a media state update of playing", async () => {
        const onStateUpdate = jest.fn()

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          onStateUpdate,
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

        expect(onStateUpdate).toHaveBeenCalledWith({
          data: { currentTime: undefined, duration: undefined, seekableRange: undefined, state: MediaState.PLAYING },
          isBufferingTimeoutError: false,
          timeUpdate: false,
        })
        expect(onStateUpdate).toHaveBeenCalledTimes(1)
      })

      it("should clear the buffering error timeout", async () => {
        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        jest.useFakeTimers()

        // dispatch a waiting event to start the buffering error timeout.
        // after 30 seconds in waiting state it should attempt a failover
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        // a playing event should clear the buffering error timeout
        mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

        jest.advanceTimersByTime(30000)

        expect(mockMediaSources.failover).not.toHaveBeenCalled()

      })

      it("should fire buffering cleared on the plugins", async () => {
        jest.spyOn(Plugins.interface, "onBufferingCleared")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith({
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          newCdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
          message: undefined,
          code: undefined,
        })

        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledTimes(1)
      })

      it("should clear media element error timeout", async () => {
        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        jest.useFakeTimers()

        // dispatch an error event to start the fatal error timeout.
        // after 5 seconds it should attempt a failover
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        // a playing event should clear the buffering error timeout
        mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

        jest.advanceTimersByTime(5000)

        expect(mockMediaSources.failover).not.toHaveBeenCalled()

      })

      it("should fire error cleared on the plugins", async () => {
        jest.spyOn(Plugins.interface, "onErrorCleared")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)

        expect(Plugins.interface.onErrorCleared).toHaveBeenNthCalledWith(2, {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        })

        expect(Plugins.interface.onErrorCleared).toHaveBeenCalledTimes(2)
      })
    })

    describe("on paused", () => {
      it("should publish a media state update event of paused", async () => {
        const onStateUpdate = jest.fn()

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          onStateUpdate,
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

        expect(onStateUpdate).toHaveBeenCalledWith({
          data: { currentTime: undefined, duration: undefined, seekableRange: undefined, state: MediaState.PAUSED },
          isBufferingTimeoutError: false,
          timeUpdate: false,
        })
        expect(onStateUpdate).toHaveBeenCalledTimes(1)
      })

      it("should clear the buffering error timeout", async () => {
        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        jest.useFakeTimers()

        // dispatch a waiting event to start the buffering error timeout.
        // after 30 seconds in waiting state it should attempt a failover
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        // a paused event should clear the buffering error timeout
        mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

        jest.advanceTimersByTime(30000)

        expect(mockMediaSources.failover).not.toHaveBeenCalled()

      })

      it("should fire buffering cleared on the plugins", async () => {
        jest.spyOn(Plugins.interface, "onBufferingCleared")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith({
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          newCdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
          message: undefined,
          code: undefined,
        })

        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledTimes(1)
      })

      it("should clear media element error timeout", async () => {
        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        jest.useFakeTimers()

        // dispatch an error event to start the fatal error timeout.
        // after 5 seconds it should attempt a failover
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        // a paused event should clear the buffering error timeout
        mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

        jest.advanceTimersByTime(5000)

        expect(mockMediaSources.failover).not.toHaveBeenCalled()
      })

      it("should fire error cleared on the plugins", async () => {
        jest.spyOn(Plugins.interface, "onErrorCleared")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED)

        expect(Plugins.interface.onErrorCleared).toHaveBeenNthCalledWith(2, {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        })

        expect(Plugins.interface.onErrorCleared).toHaveBeenCalledTimes(2)
      })
    })

    describe("on buffering", () => {
      it("should publish a media state update of waiting", async () => {
        const onStateUpdate = jest.fn()

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          onStateUpdate,
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        expect(onStateUpdate).toHaveBeenCalledWith({
          data: { currentTime: undefined, duration: undefined, seekableRange: undefined, state: MediaState.WAITING },
          isBufferingTimeoutError: false,
          timeUpdate: false,
        })
      })

      it("should start the buffering error timeout", async () => {
        jest.spyOn(Plugins.interface, "onBufferingCleared")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        jest.useFakeTimers()

        // dispatch a waiting event to start the buffering error timeout.
        // after 30 seconds in waiting state it should attempt a failover
        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        jest.advanceTimersByTime(30000)

        expect(mockMediaSources.failover).toHaveBeenCalled()

        // error timeout when reached will fire a buffering cleared on the plugins.
        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledWith({
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: true,
          timeStamp: expect.any(Object),
        })

        expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledTimes(1)
      })

      it("should fire error cleared on the plugins", async () => {
        jest.spyOn(Plugins.interface, "onErrorCleared")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        expect(Plugins.interface.onErrorCleared).toHaveBeenNthCalledWith(2, {
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        })

        expect(Plugins.interface.onErrorCleared).toHaveBeenCalledTimes(2)
      })

      it("should fire on buffering on the plugins", async () => {
        jest.spyOn(Plugins.interface, "onBuffering")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

        expect(Plugins.interface.onBuffering).toHaveBeenCalledWith({
          status: PluginEnums.STATUS.STARTED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
        })

        expect(Plugins.interface.onBuffering).toHaveBeenCalledTimes(1)
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

          expect(onStateUpdate.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)
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

          expect(onStateUpdate.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

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

          expect(onStateUpdate.mock.calls[0][0].data.state).toEqual(MediaState.ENDED)
        })
      })
    })

    describe("on timeUpdate", () => {
      it("should publish a media state update event", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireTimeUpdate()

          expect(onStateUpdate.mock.calls[0][0].timeUpdate).toBe(true)
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

          expect(onStateUpdate.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)

          jest.useRealTimers()
        })
      })

      // raise error
      it("should publish a media state update of waiting", () => {
        setUpPlayerComponent()

        return StrategyPicker.default().then(() => {
          mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

          expect(onStateUpdate.mock.calls[0][0].data.state).toEqual(MediaState.WAITING)
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
        onStateUpdate.mockReset()

        jest.advanceTimersByTime(5000)

        expect(mockStrategy.load).toHaveBeenCalledTimes(1)
        expect(onStateUpdate.mock.calls[0][0].data.state).toEqual(MediaState.FATAL_ERROR)
        expect(onStateUpdate.mock.calls[0][0].code).toBe(0)
        expect(onStateUpdate.mock.calls[0][0].message).toBe("unknown")
      })
    })

    it("should failover for with updated failover time when window time data has changed", () => {
      setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: TransferFormat.HLS })
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

        expect(onStateUpdate.mock.calls[0][0].isBufferingTimeoutError).toBe(false)
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

        expect(onStateUpdate.mock.calls[0][0].data.state).not.toEqual(MediaState.FATAL_ERROR)
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
        expect(onStateUpdate).toHaveBeenCalledTimes(1)

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
        expect(onStateUpdate).toHaveBeenCalledTimes(1)

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
