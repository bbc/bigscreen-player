import LiveSupport from "./models/livesupport"
import { ManifestType } from "./models/manifesttypes"
import MediaKinds from "./models/mediakinds"
import MediaState from "./models/mediastate"
import PauseTriggers from "./models/pausetriggers"
import { TransferFormat } from "./models/transferformats"
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
  let bigscreenPlayerData

  beforeEach(() => {
    jest.resetAllMocks()

    // Real timers are necessary for `process.nextTick`
    // We use `process.nextTick` to indirectly wait for promises to resolve
    jest.useRealTimers()

    StrategyPicker.mockResolvedValue(() => mockStrategy)

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

        // a paused event should clear the error timeout
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

        expect(mockMediaSources.failover).toHaveBeenCalledWith({
          isBufferingTimeoutError: true,
          code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
          message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
          currentTime: undefined,
          duration: undefined,
        })

        expect(mockMediaSources.failover).toHaveBeenCalledTimes(1)

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
      it("should publish a media state update event of ended", async () => {
        const onStateUpdate = jest.fn()

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          onStateUpdate,
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

        expect(onStateUpdate).toHaveBeenCalledWith({
          data: { currentTime: undefined, duration: undefined, seekableRange: undefined, state: MediaState.ENDED },
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

        // an ended event should clear the buffering error timeout
        mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

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

        mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

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

        // dispatch a error event to start the fatal error timeout.
        // after 5 seconds it should attempt a failover
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        // an ended event should clear the error timeout
        mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

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

        mockStrategy.mockingHooks.fireEvent(MediaState.ENDED)

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

    describe("on timeUpdate", () => {
      it("should publish a media state update event", async () => {
        const onStateUpdate = jest.fn()

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          onStateUpdate,
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireTimeUpdate()

        expect(onStateUpdate).toHaveBeenCalledWith({
          data: { currentTime: undefined, duration: undefined, seekableRange: undefined, state: undefined },
          isBufferingTimeoutError: false,
          timeUpdate: true,
        })
        expect(onStateUpdate).toHaveBeenCalledTimes(1)
      })
    })

    describe("on error", () => {
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

        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        expect(onStateUpdate).toHaveBeenCalledWith({
          data: { currentTime: undefined, duration: undefined, seekableRange: undefined, state: MediaState.WAITING },
          isBufferingTimeoutError: false,
          timeUpdate: false,
        })
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

        // an error event should clear the buffering error timeout
        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        jest.advanceTimersByTime(30000)

        expect(mockMediaSources.failover).toHaveBeenCalledWith({
          isBufferingTimeoutError: false,
          code: 0,
          message: "unknown",
          currentTime: undefined,
          duration: undefined,
        })
        expect(mockMediaSources.failover).toHaveBeenCalledTimes(1)
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

        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

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

      it("should fire on error on the plugins", async () => {
        jest.spyOn(Plugins.interface, "onError")

        const _playerComponent = new PlayerComponent(
          createPlaybackElement(),
          bigscreenPlayerData,
          mockMediaSources,
          jest.fn(),
          jest.fn()
        )

        await new Promise(process.nextTick)

        mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

        expect(Plugins.interface.onError).toHaveBeenCalledWith({
          status: PluginEnums.STATUS.STARTED,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
          code: 0,
          message: "unknown",
        })

        expect(Plugins.interface.onError).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe("cdn failover", () => {
    it("should failover after buffering for 30 seconds on initial playback", async () => {
      mockStrategy.getCurrentTime.mockReturnValueOnce(100)

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

      jest.advanceTimersByTime(20000)

      expect(mockStrategy.load).toHaveBeenCalledTimes(1)
      expect(mockMediaSources.failover).not.toHaveBeenCalled()

      jest.advanceTimersByTime(10000)

      expect(mockStrategy.load).toHaveBeenCalledTimes(2)
      expect(mockStrategy.load).toHaveBeenCalledWith("application/dash+xml", 100)

      expect(mockMediaSources.failover).toHaveBeenCalledWith(
        expect.objectContaining({
          code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
          message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        })
      )
    })

    it("should failover after buffering for 20 seconds on normal playback", async () => {
      mockStrategy.getCurrentTime.mockReturnValueOnce(100)

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING) // ensures the following waiting is 'mid playback'
      mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

      expect(mockStrategy.load).toHaveBeenCalledTimes(1)
      expect(mockMediaSources.failover).not.toHaveBeenCalled()

      jest.advanceTimersByTime(20000)

      expect(mockStrategy.load).toHaveBeenCalledTimes(2)
      expect(mockStrategy.load).toHaveBeenCalledWith("application/dash+xml", 100)

      expect(mockMediaSources.failover).toHaveBeenCalledWith(
        expect.objectContaining({
          code: PluginEnums.ERROR_CODES.BUFFERING_TIMEOUT,
          message: PluginEnums.ERROR_MESSAGES.BUFFERING_TIMEOUT,
        })
      )
    })

    it("should failover after 5 seconds if we have not cleared an error from the device", async () => {
      mockStrategy.getCurrentTime.mockReturnValueOnce(100)

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

      expect(mockStrategy.load).toHaveBeenCalledTimes(1)
      expect(mockMediaSources.failover).not.toHaveBeenCalled()

      jest.advanceTimersByTime(5000)

      expect(mockStrategy.load).toHaveBeenCalledTimes(2)
      expect(mockStrategy.load).toHaveBeenCalledWith("application/dash+xml", 100)

      expect(mockMediaSources.failover).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 0,
          message: "unknown",
        })
      )
    })

    it("should fire a fatal error on the plugins if attempt to failover rejects", async () => {
      // mockMediaSources.failover.mockRejectedValueOnce(new Error("mock failover reject"))

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

      jest.advanceTimersByTime(5000)

      expect(mockStrategy.load).toHaveBeenCalledTimes(1)
      expect(Plugins.interface.onFatalError).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PluginEnums.STATUS.FATAL,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: false,
          cdn: undefined,
          newCdn: undefined,
          isInitialPlay: undefined,
          timeStamp: expect.any(Object),
          code: 0,
          message: "unknown",
        })
      )
    })

    it("should publish a media state update of fatal if failover is not possible", async () => {
      // mockMediaSources.failover.mockRejectedValueOnce(new Error("mock failover reject"))

      const onStateUpdate = jest.fn()

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

      jest.advanceTimersByTime(5000)

      expect(mockStrategy.load).toHaveBeenCalledTimes(1)
      expect(onStateUpdate).toHaveBeenCalledWith({
        data: { currentTime: undefined, duration: undefined, seekableRange: undefined, state: MediaState.FATAL_ERROR },
        isBufferingTimeoutError: false,
        timeUpdate: false,
        code: 0,
        message: "unknown",
      })
    })

    it("should failover with updated failover time when window time data has changed", async () => {
      mockMediaSources.time.mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 10000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      mockStrategy.getCurrentTime.mockReturnValue(100)

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING)
      mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

      jest.advanceTimersByTime(20000)

      mockMediaSources.time.mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 30000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      await new Promise(process.nextTick)

      expect(mockStrategy.load).toHaveBeenCalledTimes(2)
      expect(mockStrategy.load).toHaveBeenCalledWith("application/dash+xml", 100 - 20)
    })

    it("should fire error cleared on the plugins when failover completes", async () => {
      jest.spyOn(Plugins.interface, "onErrorCleared")

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

      jest.advanceTimersByTime(5000)

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

    it("should fire buffering cleared on the plugins when failover completes", async () => {
      jest.spyOn(Plugins.interface, "onBufferingCleared")

      // mockMediaSources.failover.mockResolvedValueOnce()

      const _playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

      jest.advanceTimersByTime(30000)

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

      expect(Plugins.interface.onBufferingCleared).toHaveBeenCalledTimes(2)
    })
  })

  describe("teardown", () => {
    it("should reset the strategy", async () => {
      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      playerComponent.tearDown()

      expect(mockStrategy.reset).toHaveBeenCalled()
    })

    it("should clear buffering error timeout", async () => {
      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      mockStrategy.mockingHooks.fireEvent(MediaState.WAITING)

      playerComponent.tearDown()

      jest.advanceTimersByTime(30000)

      expect(mockMediaSources.failover).not.toHaveBeenCalled()
    })

    it("should clear fatal error timeout", async () => {
      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      jest.useFakeTimers()

      // dispatch an error to start the fatal error timeout
      // this should trigger a failover
      mockStrategy.mockingHooks.fireError({ code: 0, message: "unknown" })

      // tearDown should clear the fatal error timeout
      playerComponent.tearDown()

      jest.advanceTimersByTime(5000)

      expect(mockMediaSources.failover).not.toHaveBeenCalled()
    })

    it("should fire error cleared on the plugins", async () => {
      jest.spyOn(Plugins.interface, "onErrorCleared")

      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      playerComponent.tearDown()

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

    it("should fire buffering cleared on the plugins", async () => {
      jest.spyOn(Plugins.interface, "onBufferingCleared")

      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      playerComponent.tearDown()

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

    it("should tear down the strategy", async () => {
      const playerComponent = new PlayerComponent(
        createPlaybackElement(),
        bigscreenPlayerData,
        mockMediaSources,
        jest.fn(),
        jest.fn()
      )

      await new Promise(process.nextTick)

      playerComponent.tearDown()

      expect(mockStrategy.tearDown).toHaveBeenCalledTimes(1)
    })
  })
})
