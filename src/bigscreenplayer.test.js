import BigscreenPlayer from "./bigscreenplayer"
import PlayerComponent from "./playercomponent"
import Plugins from "./plugins"
import ReadyHelper from "./readyhelper"
import Subtitles from "./subtitles/subtitles"
import DebugTool from "./debugger/debugtool"
import LiveSupport from "./models/livesupport"
import { ManifestType } from "./models/manifesttypes"
import { MediaKinds } from "./models/mediakinds"
import MediaState from "./models/mediastate"
import PauseTriggers from "./models/pausetriggers"
import { DASH } from "./models/transferformats"
import WindowTypes from "./models/windowtypes"
import getError, { NoErrorThrownError } from "./testutils/geterror"
import DynamicWindowUtils from "./dynamicwindowutils"

let bigscreenPlayer
let bigscreenPlayerData
let dispatchMediaStateChange
let mockPlayerComponentInstance

const mockMediaSources = {
  init: jest.fn().mockResolvedValue(),
  tearDown: jest.fn(),
  time: jest.fn().mockReturnValue({
    manifestType: ManifestType.STATIC,
    presentationTimeOffsetInMilliseconds: 0,
    availabilityStartTimeInMilliseconds: 0,
    timeShiftBufferDepthInMilliseconds: 0,
  }),
}

const mockReadyHelper = {
  callbackWhenReady: jest.fn(),
}

const mockSubtitlesInstance = {
  enable: jest.fn(),
  disable: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  enabled: jest.fn(),
  available: jest.fn(),
  setPosition: jest.fn(),
  customise: jest.fn(),
  renderExample: jest.fn(),
  clearExample: jest.fn(),
  tearDown: jest.fn(),
}

const mockResizer = {
  resize: jest.fn(),
  clear: jest.fn(),
  isResized: jest.fn(),
}

jest.mock("./mediasources", () => jest.fn(() => mockMediaSources))
jest.mock("./playercomponent")
jest.mock("./plugins")
jest.mock("./debugger/debugtool")
jest.mock("./resizer", () => jest.fn(() => mockResizer))
jest.mock("./subtitles/subtitles", () => jest.fn(() => mockSubtitlesInstance))
jest.mock("./readyhelper", () =>
  jest.fn((_a, _b, _c, onReady) => {
    if (typeof onReady === "function") {
      onReady()
    }

    return mockReadyHelper
  })
)
jest.mock("./dynamicwindowutils", () => ({
  autoResumeAtStartOfRange: jest.fn(),
  canPause: jest.fn(),
  canSeek: jest.fn(),
}))

function setupManifestData() {
  return null
}

function initialiseBigscreenPlayer() {
  return null
}

function asyncInitialiseBigscreenPlayer(playbackEl, data, { noSuccessCallback = false, noErrorCallback = false } = {}) {
  return new Promise((resolve, reject) =>
    bigscreenPlayer.init(playbackEl, data, {
      onSuccess: noSuccessCallback ? null : resolve,
      onError: noErrorCallback ? null : reject,
    })
  )
}

function createPlaybackElement() {
  const el = document.createElement("div")
  el.id = "app"

  return el
}

describe("Bigscreen Player", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    bigscreenPlayer?.tearDown()
    bigscreenPlayer = undefined

    mockPlayerComponentInstance = {
      play: jest.fn(),
      pause: jest.fn(),
      isEnded: jest.fn(),
      isPaused: jest.fn(),
      setCurrentTime: jest.fn(),
      getCurrentTime: jest.fn(),
      getDuration: jest.fn(),
      getSeekableRange: jest.fn(),
      getPlayerElement: jest.fn(),
      tearDown: jest.fn(),
      getWindowStartTime: jest.fn(),
      getWindowEndTime: jest.fn(),
      setPlaybackRate: jest.fn(),
      getPlaybackRate: jest.fn(),
      tearDown: jest.fn(),
    }

    jest.spyOn(PlayerComponent, "getLiveSupport").mockReturnValue(LiveSupport.SEEKABLE)

    PlayerComponent.mockImplementation((playbackElement, bigscreenPlayerData, mediaSources, windowType, callback) => {
      dispatchMediaStateChange = callback
      return mockPlayerComponentInstance
    })

    bigscreenPlayer = BigscreenPlayer()

    bigscreenPlayerData = {
      media: {
        kind: "video",
        type: "application/dash+xml",
        transferFormat: "dash",
        urls: [{ url: "mock://some.url/", cdn: "foo" }],
      },
    }
  })

  describe("init", () => {
    it("doesn't require success or error callbacks", () => {
      expect(() => bigscreenPlayer.init(createPlaybackElement(), bigscreenPlayerData)).not.toThrow()
    })

    it("doesn't require a success callback", () => {
      const onError = jest.fn()

      expect(() => bigscreenPlayer.init(createPlaybackElement(), bigscreenPlayerData, { onError })).not.toThrow()

      expect(onError).not.toHaveBeenCalled()
    })

    it("doesn't require an error callback", async () => {
      const error = await getError(() =>
        asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData, { noErrorCallback: true })
      )

      expect(error).toBeInstanceOf(NoErrorThrownError)
    })

    it("calls the error callback if manifest fails to load", async () => {
      jest.mocked(mockMediaSources.init).mockRejectedValueOnce(new Error("Manifest failed to load"))

      const error = await getError(() => asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData))

      expect(error.message).toBe("Manifest failed to load")
    })

    it("sets up ready helper", async () => {
      bigscreenPlayerData.initialPlaybackTime = 365

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(jest.mocked(ReadyHelper)).toHaveBeenCalledTimes(1)

      expect(jest.mocked(ReadyHelper)).toHaveBeenCalledWith(
        365,
        WindowTypes.STATIC,
        LiveSupport.SEEKABLE,
        expect.any(Function)
      )
    })

    it("sets up player component", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(jest.mocked(PlayerComponent)).toHaveBeenCalledTimes(1)

      expect(jest.mocked(PlayerComponent)).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        bigscreenPlayerData,
        expect.any(Object),
        WindowTypes.STATIC,
        expect.any(Function),
        expect.any(Function)
      )
    })

    it("sets up subtitles", async () => {
      bigscreenPlayerData.enableSubtitles = true

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(jest.mocked(Subtitles)).toHaveBeenCalledTimes(1)

      expect(jest.mocked(Subtitles)).toHaveBeenCalledWith(
        expect.any(Object),
        true,
        expect.any(HTMLDivElement),
        undefined,
        expect.any(Object),
        expect.any(Function)
      )
    })

    it("initialises the debugger", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(DebugTool.init).toHaveBeenCalledTimes(1)
    })
  })

  describe("tearDown", () => {
    beforeEach(async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
    })

    it("tears down the player component", () => {
      bigscreenPlayer.tearDown()

      expect(mockPlayerComponentInstance.tearDown).toHaveBeenCalledTimes(1)
    })

    it("tears down media sources", () => {
      bigscreenPlayer.tearDown()

      expect(mockMediaSources.tearDown).toHaveBeenCalledTimes(1)
    })

    it("tears down subtitles", () => {
      bigscreenPlayer.tearDown()

      expect(mockSubtitlesInstance.tearDown).toHaveBeenCalledTimes(1)
    })

    it("tears down the debugger", () => {
      bigscreenPlayer.tearDown()

      expect(DebugTool.tearDown).toHaveBeenCalledTimes(1)
    })
  })

  describe("getPlayerElement", () => {
    it("should get the current player element", async () => {
      const mockedVideo = document.createElement("video")

      mockPlayerComponentInstance.getPlayerElement.mockReturnValue(mockedVideo)

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.getPlayerElement()).toBe(mockedVideo)
    })
  })

  describe("listening for state changes", () => {
    beforeEach(async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
    })

    it("returns a reference to the registered listener", () => {
      const onStateChange = jest.fn()

      const reference = bigscreenPlayer.registerForStateChanges(onStateChange)

      expect(reference).toBe(onStateChange)
    })

    it("should trigger a registered listener when a state event comes back", () => {
      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(onStateChange).toHaveBeenCalledWith({ state: MediaState.PLAYING, endOfStream: false })
      expect(onStateChange).toHaveBeenCalledTimes(1)

      dispatchMediaStateChange({ data: { state: MediaState.WAITING } })

      expect(onStateChange).toHaveBeenNthCalledWith(2, {
        state: MediaState.WAITING,
        isSeeking: false,
        endOfStream: false,
      })
      expect(onStateChange).toHaveBeenCalledTimes(2)
    })

    it("reports isSeeking true when waiting after a setCurrentTime", () => {
      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(onStateChange).toHaveBeenCalledWith({ state: MediaState.PLAYING, endOfStream: false })

      bigscreenPlayer.setCurrentTime(60)

      dispatchMediaStateChange({ data: { state: MediaState.WAITING } })

      expect(onStateChange).toHaveBeenCalledWith({ state: MediaState.WAITING, isSeeking: true, endOfStream: false })
    })

    it("clears isSeeking after a waiting event is fired", () => {
      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      bigscreenPlayer.setCurrentTime(60)

      dispatchMediaStateChange({ data: { state: MediaState.WAITING } })

      expect(onStateChange).toHaveBeenCalledWith({ state: MediaState.WAITING, isSeeking: true, endOfStream: false })

      dispatchMediaStateChange({ data: { state: MediaState.WAITING } })

      expect(onStateChange).toHaveBeenCalledWith({ state: MediaState.WAITING, isSeeking: false, endOfStream: false })
    })

    it("sets the pause trigger to user on a user pause", () => {
      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      bigscreenPlayer.pause()

      dispatchMediaStateChange({ data: { state: MediaState.PAUSED } })

      expect(onStateChange).toHaveBeenCalledWith({
        state: MediaState.PAUSED,
        trigger: PauseTriggers.USER,
        endOfStream: false,
      })
    })

    it("sets the pause trigger to device when a pause event comes back from strategy without a trigger", () => {
      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      dispatchMediaStateChange({ data: { state: MediaState.PAUSED } })

      expect(onStateChange).toHaveBeenCalledWith({
        state: MediaState.PAUSED,
        trigger: PauseTriggers.DEVICE,
        endOfStream: false,
      })
    })

    it("sets isBufferingTimeoutError when a fatal error event comes back from strategy", () => {
      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      dispatchMediaStateChange({
        data: { state: MediaState.FATAL_ERROR },
        isBufferingTimeoutError: false,
        code: 1,
        message: "media-error-aborted",
      })

      expect(onStateChange).toHaveBeenCalledWith({
        state: MediaState.FATAL_ERROR,
        isBufferingTimeoutError: false,
        code: 1,
        message: "media-error-aborted",
        endOfStream: false,
      })
    })
  })

  describe("unregisterForStateChanges", () => {
    beforeEach(async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
    })

    it("no longer calls a listener once unregistered", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      const listener3 = jest.fn()

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.registerForStateChanges(listener2)
      bigscreenPlayer.registerForStateChanges(listener3)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      bigscreenPlayer.unregisterForStateChanges(listener2)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it("no longer calls a listener once unregistered by itself", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn(() => bigscreenPlayer.unregisterForStateChanges(listener2))
      const listener3 = jest.fn()

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.registerForStateChanges(listener2)
      bigscreenPlayer.registerForStateChanges(listener3)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })
      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it("no longer calls a listener once unregistered by a listener registered later", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      const listener3 = jest.fn(() => {
        bigscreenPlayer.unregisterForStateChanges(listener1)
        bigscreenPlayer.unregisterForStateChanges(listener2)
      })

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.registerForStateChanges(listener2)
      bigscreenPlayer.registerForStateChanges(listener3)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })
      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(listener1).toHaveBeenCalledTimes(0)
      expect(listener2).toHaveBeenCalledTimes(0)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it("no longer calls a listener once unregistered by a listener registered earlier", () => {
      const listener2 = jest.fn()
      const listener3 = jest.fn()

      const listener1 = jest.fn().mockImplementation(() => {
        bigscreenPlayer.unregisterForStateChanges(listener2)
        bigscreenPlayer.unregisterForStateChanges(listener3)
      })

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.registerForStateChanges(listener2)
      bigscreenPlayer.registerForStateChanges(listener3)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })
      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(1)
    })

    it("no longer calls a listener unregistered by another listener", () => {
      const listener3 = jest.fn()

      const listener1 = jest.fn().mockImplementation(() => {
        bigscreenPlayer.unregisterForStateChanges(listener1)
        bigscreenPlayer.unregisterForStateChanges(listener3)
      })
      const listener2 = jest.fn()
      const listener4 = jest.fn().mockImplementation(() => {
        bigscreenPlayer.unregisterForStateChanges(listener2)
        bigscreenPlayer.unregisterForStateChanges(listener4)
      })

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.registerForStateChanges(listener2)
      bigscreenPlayer.registerForStateChanges(listener3)
      bigscreenPlayer.registerForStateChanges(listener4)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })
      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(0)
      expect(listener3).toHaveBeenCalledTimes(1)
      expect(listener4).toHaveBeenCalledTimes(1)
    })

    it("only unregisters existing callbacks", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      bigscreenPlayer.registerForStateChanges(listener1)
      bigscreenPlayer.unregisterForStateChanges(listener2)

      dispatchMediaStateChange({ data: { state: MediaState.PLAYING } })

      expect(listener1).toHaveBeenCalledWith({ state: MediaState.PLAYING, endOfStream: false })
    })
  })

  describe("listening for time updates", () => {
    beforeEach(async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
    })

    it("should call the callback when we get a timeupdate event from the strategy", () => {
      const onTimeUpdate = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      expect(onTimeUpdate).not.toHaveBeenCalled()

      dispatchMediaStateChange({ data: { currentTime: 60 }, timeUpdate: true })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 60, endOfStream: false })
    })

    it("returns a reference to the callback passed in", () => {
      const onTimeUpdate = jest.fn()

      const reference = bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      expect(reference).toBe(onTimeUpdate)
    })
  })

  describe("unregisterForTimeUpdates", () => {
    beforeEach(async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
    })

    it("should remove callback from timeUpdateCallbacks", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      const listener3 = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(listener1)
      bigscreenPlayer.registerForTimeUpdates(listener2)
      bigscreenPlayer.registerForTimeUpdates(listener3)

      dispatchMediaStateChange({ data: { currentTime: 0 }, timeUpdate: true })

      bigscreenPlayer.unregisterForTimeUpdates(listener2)

      dispatchMediaStateChange({ data: { currentTime: 1 }, timeUpdate: true })

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it("should remove callback from timeUpdateCallbacks when a callback removes itself", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn().mockImplementation(() => {
        bigscreenPlayer.unregisterForTimeUpdates(listener2)
      })
      const listener3 = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(listener1)
      bigscreenPlayer.registerForTimeUpdates(listener2)
      bigscreenPlayer.registerForTimeUpdates(listener3)

      dispatchMediaStateChange({ data: { currentTime: 0 }, timeUpdate: true })
      dispatchMediaStateChange({ data: { currentTime: 1 }, timeUpdate: true })

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it("should only remove existing callbacks from timeUpdateCallbacks", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(listener1)
      bigscreenPlayer.unregisterForTimeUpdates(listener2)

      dispatchMediaStateChange({ data: { currentTime: 60 }, timeUpdate: true })

      expect(listener1).toHaveBeenCalledWith({ currentTime: 60, endOfStream: false })
    })
  })

  describe("listening for subtitle changes", () => {
    beforeEach(async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
    })

    it("should call the callback when subtitles are turned on/off", () => {
      const onSubtitleChange = jest.fn()

      bigscreenPlayer.registerForSubtitleChanges(onSubtitleChange)

      expect(onSubtitleChange).not.toHaveBeenCalled()

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(onSubtitleChange).toHaveBeenCalledWith({ enabled: true })

      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(onSubtitleChange).toHaveBeenCalledWith({ enabled: false })
    })

    it("returns a reference to the callback supplied", () => {
      const onSubtitleChange = jest.fn()

      const reference = bigscreenPlayer.registerForSubtitleChanges(onSubtitleChange)

      expect(reference).toBe(onSubtitleChange)
    })
  })

  describe("unregisterForSubtitleChanges", () => {
    beforeEach(async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
    })

    it("should remove callback from subtitleCallbacks", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      const listener3 = jest.fn()

      bigscreenPlayer.registerForSubtitleChanges(listener1)
      bigscreenPlayer.registerForSubtitleChanges(listener2)
      bigscreenPlayer.registerForSubtitleChanges(listener3)

      bigscreenPlayer.setSubtitlesEnabled(true)

      bigscreenPlayer.unregisterForSubtitleChanges(listener2)

      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it("should remove callback from subtitleCallbacks when a callback removes itself", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn(() => bigscreenPlayer.unregisterForSubtitleChanges(listener2))
      const listener3 = jest.fn()

      bigscreenPlayer.registerForSubtitleChanges(listener1)
      bigscreenPlayer.registerForSubtitleChanges(listener2)
      bigscreenPlayer.registerForSubtitleChanges(listener3)

      bigscreenPlayer.setSubtitlesEnabled(true)
      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(2)
    })

    it("should only remove existing callbacks from subtitleCallbacks", () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      bigscreenPlayer.registerForSubtitleChanges(listener1)
      bigscreenPlayer.unregisterForSubtitleChanges(listener2)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(listener1).toHaveBeenCalledWith({ enabled: true })
    })
  })

  describe("setCurrentTime", () => {
    it("should setCurrentTime on the strategy/playerComponent", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setCurrentTime(60)

      expect(mockPlayerComponentInstance.setCurrentTime).toHaveBeenCalledWith(60)
    })

    it("should not set current time on the strategy/playerComponent if bigscreen player is not initialised", () => {
      bigscreenPlayer.setCurrentTime(60)

      expect(mockPlayerComponentInstance.setCurrentTime).not.toHaveBeenCalled()
    })

    it("sets endOfStream true on state changes when seeking to the end of a dynamic stream", async () => {
      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514440000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      bigscreenPlayerData.initialPlaybackTime = 100

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onTimeUpdate = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 7200 })
      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(7198)

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      bigscreenPlayer.setCurrentTime(7198)

      dispatchMediaStateChange({ data: { currentTime: 7198 }, timeUpdate: true })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 7198, endOfStream: true })
    })

    it("sets endOfStream false on state changes when seeking into the middle of a dynamic stream", async () => {
      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514440000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onTimeUpdate = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 7200 })

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(3600)

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514440000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      bigscreenPlayer.setCurrentTime(3600)

      dispatchMediaStateChange({ data: { currentTime: 3600 }, timeUpdate: true })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 3600, endOfStream: false })
    })

    it("should set endOfStream to true when playing live and no initial playback time is set", async () => {
      const onTimeUpdate = jest.fn()

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      dispatchMediaStateChange({ data: { currentTime: 30 }, timeUpdate: true, isBufferingTimeoutError: false })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 30, endOfStream: true })
    })

    it("should set endOfStream to false when playing live and initialPlaybackTime is 0", async () => {
      const onTimeUpdate = jest.fn()

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      bigscreenPlayerData.initialPlaybackTime = 0

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      dispatchMediaStateChange({ data: { currentTime: 0 }, timeUpdate: true, isBufferingTimeoutError: false })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 0, endOfStream: false })
    })
  })

  describe("playback rate", () => {
    it("should setPlaybackRate on the strategy/playerComponent", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setPlaybackRate(2)

      expect(mockPlayerComponentInstance.setPlaybackRate).toHaveBeenCalledWith(2)
    })

    it("should not set playback rate if playerComponent is not initialised", () => {
      bigscreenPlayer.setPlaybackRate(2)

      expect(mockPlayerComponentInstance.setPlaybackRate).not.toHaveBeenCalled()
    })

    it("should call through to get the playback rate when requested", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.getPlaybackRate.mockReturnValue(1.5)

      expect(bigscreenPlayer.getPlaybackRate()).toBe(1.5)

      expect(mockPlayerComponentInstance.getPlaybackRate).toHaveBeenCalledTimes(1)
    })

    it("should not get playback rate if playerComponent is not initialised", () => {
      bigscreenPlayer.getPlaybackRate()

      expect(mockPlayerComponentInstance.getPlaybackRate).not.toHaveBeenCalled()
    })
  })

  describe("getCurrentTime", () => {
    it("should return the current time from the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(10)

      expect(bigscreenPlayer.getCurrentTime()).toBe(10)
    })

    it("should return 0 if bigscreenPlayer is not initialised", () => {
      expect(bigscreenPlayer.getCurrentTime()).toBe(0)
    })
  })

  describe("getMediaKind", () => {
    it.each([MediaKinds.VIDEO, MediaKinds.AUDIO])("should return the media kind %s", async (kind) => {
      bigscreenPlayerData.media.kind = kind

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.getMediaKind()).toBe(kind)
    })
  })

  describe("getSeekableRange", () => {
    it("should return the seekable range from the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 10 })

      expect(bigscreenPlayer.getSeekableRange().start).toBe(0)
      expect(bigscreenPlayer.getSeekableRange().end).toBe(10)
    })

    it("should return an empty object when bigscreen player has not been initialised", () => {
      expect(bigscreenPlayer.getSeekableRange()).toEqual({})
    })
  })

  describe("isAtLiveEdge", () => {
    it("should return false when playing on demand content", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(100)
      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 105 })

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.STATIC,
        presentationTimeOffsetInMilliseconds: 0,
        availabilityStartTimeInMilliseconds: 0,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toBe(false)
    })

    it("should return false when bigscreen-player has not been initialised", () => {
      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toBe(false)
    })

    it("should return true when playing live and current time is within tolerance of seekable range end", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(100)
      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 105 })

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toBe(true)
    })

    it("should return false when playing live and current time is outside the tolerance of seekable range end", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(95)
      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 105 })

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      expect(bigscreenPlayer.isPlayingAtLiveEdge()).toBe(false)
    })
  })

  describe("getLiveWindowData", () => {
    it("should return undefined values when windowType is static", () => {
      initialiseBigscreenPlayer({ windowType: WindowTypes.STATIC })

      expect(bigscreenPlayer.getLiveWindowData()).toEqual({})
    })

    it("should return liveWindowData when the windowType is sliding and manifest is loaded", () => {
      setupManifestData({
        transferFormat: DASH,
        time: {
          windowStartTime: 1,
          windowEndTime: 2,
        },
      })

      const initialisationData = {
        windowType: WindowTypes.SLIDING,
        serverDate: new Date(),
        initialPlaybackTime: Date.now(),
      }
      initialiseBigscreenPlayer(initialisationData)

      expect(bigscreenPlayer.getLiveWindowData()).toEqual({
        windowStartTime: 1,
        windowEndTime: 2,
        serverDate: initialisationData.serverDate,
        initialPlaybackTime: initialisationData.initialPlaybackTime,
      })
    })

    it("should return a subset of liveWindowData when the windowType is sliding and time block is provided", () => {
      const initialisationData = {
        windowType: WindowTypes.SLIDING,
        windowStartTime: 1,
        windowEndTime: 2,
        initialPlaybackTime: Date.now(),
      }
      initialiseBigscreenPlayer(initialisationData)

      expect(bigscreenPlayer.getLiveWindowData()).toEqual({
        serverDate: undefined,
        windowStartTime: 1,
        windowEndTime: 2,
        initialPlaybackTime: initialisationData.initialPlaybackTime,
      })
    })
  })

  describe("getDuration", () => {
    it("should get the duration from the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.getDuration.mockReturnValue(10)

      expect(bigscreenPlayer.getDuration()).toBe(10)
    })

    it("should return undefined when not initialised", () => {
      expect(bigscreenPlayer.getDuration()).toBeUndefined()
    })
  })

  describe("isPaused", () => {
    it("should get the paused state from the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.isPaused.mockReturnValue(true)

      expect(bigscreenPlayer.isPaused()).toBe(true)
    })

    it("should return true if bigscreenPlayer has not been initialised", () => {
      mockPlayerComponentInstance.isPaused.mockReturnValue(false)

      expect(bigscreenPlayer.isPaused()).toBe(true)
    })
  })

  describe("isEnded", () => {
    it("should get the ended state from the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockPlayerComponentInstance.isEnded.mockReturnValue(true)

      expect(bigscreenPlayer.isEnded()).toBe(true)
    })

    it("should return false if bigscreenPlayer has not been initialised", () => {
      mockPlayerComponentInstance.isEnded.mockReturnValue(true)

      expect(bigscreenPlayer.isEnded()).toBe(false)
    })
  })

  describe("play", () => {
    it("should call play on the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.play()

      expect(mockPlayerComponentInstance.play).toHaveBeenCalledWith()
    })
  })

  describe("pause", () => {
    it("should call pause on the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.pause({ disableAutoResume: true })

      expect(mockPlayerComponentInstance.pause).toHaveBeenCalledWith(
        expect.objectContaining({ disableAutoResume: true })
      )
    })

    it("should set pauseTrigger to an app pause if user pause is false", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      bigscreenPlayer.pause({ userPause: false })

      dispatchMediaStateChange({ data: { state: MediaState.PAUSED } })

      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ trigger: PauseTriggers.APP }))
    })

    it("should set pauseTrigger to a user pause if user pause is true", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      bigscreenPlayer.pause({ userPause: true })

      dispatchMediaStateChange({ data: { state: MediaState.PAUSED } })

      expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ trigger: PauseTriggers.USER }))
    })
  })

  describe("setSubtitlesEnabled", () => {
    it("should turn subtitles on/off when a value is passed in", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.enable).toHaveBeenCalledTimes(1)

      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(mockSubtitlesInstance.disable).toHaveBeenCalledTimes(1)
    })

    it("should show subtitles when called with true", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.show).toHaveBeenCalledTimes(1)
    })

    it("should hide subtitles when called with false", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setSubtitlesEnabled(false)

      expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1)
    })

    it("should not show subtitles when resized", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockResizer.isResized.mockReturnValue(true)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.show).not.toHaveBeenCalled()
    })

    it("should not hide subtitles when resized", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      mockResizer.isResized.mockReturnValue(true)

      bigscreenPlayer.setSubtitlesEnabled(true)

      expect(mockSubtitlesInstance.hide).not.toHaveBeenCalled()
    })
  })

  describe("isSubtitlesEnabled", () => {
    it("calls through to Subtitles enabled when called", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.isSubtitlesEnabled()

      expect(mockSubtitlesInstance.enabled).toHaveBeenCalledWith()
    })
  })

  describe("isSubtitlesAvailable", () => {
    it("calls through to Subtitles available when called", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.isSubtitlesAvailable()

      expect(mockSubtitlesInstance.available).toHaveBeenCalledWith()
    })
  })

  describe("customiseSubtitles", () => {
    it("passes through custom styles to Subtitles customise", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const customStyleObj = { size: 0.7 }
      bigscreenPlayer.customiseSubtitles(customStyleObj)

      expect(mockSubtitlesInstance.customise).toHaveBeenCalledWith(customStyleObj)
    })
  })

  describe("renderSubtitleExample", () => {
    it("calls Subtitles renderExample with correct values", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const exampleUrl = ""
      const customStyleObj = { size: 0.7 }
      const safePosititon = { left: 30, top: 0 }
      bigscreenPlayer.renderSubtitleExample(exampleUrl, customStyleObj, safePosititon)

      expect(mockSubtitlesInstance.renderExample).toHaveBeenCalledWith(exampleUrl, customStyleObj, safePosititon)
    })
  })

  describe("clearSubtitleExample", () => {
    it("calls Subtitles clearExample", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.clearSubtitleExample()

      expect(mockSubtitlesInstance.clearExample).toHaveBeenCalledTimes(1)
    })
  })

  describe("setTransportControlsPosition", () => {
    it("should call through to Subtitles setPosition function", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setTransportControlsPosition()

      expect(mockSubtitlesInstance.setPosition).toHaveBeenCalledTimes(1)
    })
  })

  describe("resize", () => {
    it("calls resizer with correct values", async () => {
      const playbackElement = createPlaybackElement()
      await asyncInitialiseBigscreenPlayer(playbackElement, bigscreenPlayerData)

      bigscreenPlayer.resize(10, 10, 160, 90, 100)

      expect(mockResizer.resize).toHaveBeenCalledWith(playbackElement, 10, 10, 160, 90, 100)
    })

    it("hides subtitles when resized", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.resize(10, 10, 160, 90, 100)

      expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1)
    })
  })

  describe("clearResize", () => {
    it("calls resizers clear function", async () => {
      const playbackElement = createPlaybackElement()
      await asyncInitialiseBigscreenPlayer(playbackElement, bigscreenPlayerData)

      bigscreenPlayer.clearResize()

      expect(mockResizer.clear).toHaveBeenCalledWith(playbackElement)
    })

    it("shows subtitles if subtitles are enabled", async () => {
      mockSubtitlesInstance.enabled.mockReturnValue(true)

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.clearResize()

      expect(mockSubtitlesInstance.show).toHaveBeenCalledTimes(1)
    })

    it("hides subtitles if subtitles are disabled", async () => {
      mockSubtitlesInstance.enabled.mockReturnValue(false)

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.clearResize()

      expect(mockSubtitlesInstance.hide).toHaveBeenCalledTimes(1)
    })
  })

  describe("canSeek", () => {
    it("should return true for on demand streams", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.canSeek()).toBe(true)
    })

    it("should call through to DynamicWindowUtils with correct arguments and return it's value for live streams", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 7200000,
      })

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 60 })

      jest.mocked(DynamicWindowUtils.canSeek).mockReturnValueOnce(true)

      expect(bigscreenPlayer.canSeek()).toBe(true)
      expect(DynamicWindowUtils.canSeek).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 7200000,
      })

      jest.mocked(DynamicWindowUtils.canSeek).mockReturnValueOnce(false)

      expect(bigscreenPlayer.canSeek()).toBe(false)
      expect(DynamicWindowUtils.canSeek).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })
    })
  })

  describe("canPause", () => {
    it("should return true for on demand streams", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.canPause()).toBe(true)
    })

    it("should call through to DynamicWindowUtils with correct arguments and return it's value for live streams", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 7200000,
      })

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 60 })

      jest.mocked(DynamicWindowUtils.canPause).mockReturnValueOnce(true)

      expect(bigscreenPlayer.canPause()).toBe(true)
      expect(DynamicWindowUtils.canPause).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })

      jest.mocked(mockMediaSources.time).mockReturnValueOnce({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 7200000,
      })

      jest.mocked(DynamicWindowUtils.canPause).mockReturnValueOnce(false)

      expect(bigscreenPlayer.canPause()).toBe(false)
      expect(DynamicWindowUtils.canPause).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })
    })
  })

  describe("convertVideoTimeSecondsToEpochMs", () => {
    it("converts video time to epoch time when windowStartTime is supplied", () => {
      setupManifestData({
        time: {
          windowStartTime: 4200,
          windowEndTime: 150000000,
        },
      })

      initialiseBigscreenPlayer({
        windowType: WindowTypes.SLIDING,
      })

      expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBe(4200 + 1000000)
    })

    it("does not convert video time to epoch time when windowStartTime is not supplied", () => {
      setupManifestData({
        time: {
          windowStartTime: undefined,
          windowEndTime: undefined,
        },
      })

      initialiseBigscreenPlayer()

      expect(bigscreenPlayer.convertVideoTimeSecondsToEpochMs(1000)).toBeNull()
    })
  })

  describe("covertEpochMsToVideoTimeSeconds", () => {
    it("converts epoch time to video time when windowStartTime is available", () => {
      // windowStartTime - 16 January 2019 12:00:00
      // windowEndTime - 16 January 2019 14:00:00
      setupManifestData({
        time: {
          windowStartTime: 1547640000000,
          windowEndTime: 1547647200000,
        },
      })

      initialiseBigscreenPlayer({
        windowType: WindowTypes.SLIDING,
      })

      // Time to convert - 16 January 2019 13:00:00 - one hour (3600 seconds)
      expect(bigscreenPlayer.convertEpochMsToVideoTimeSeconds(1547643600000)).toBe(3600)
    })

    it("does not convert epoch time to video time when windowStartTime is not available", () => {
      setupManifestData({
        time: {
          windowStartTime: undefined,
          windowEndTime: undefined,
        },
      })

      initialiseBigscreenPlayer()

      expect(bigscreenPlayer.convertEpochMsToVideoTimeSeconds(1547643600000)).toBeNull()
    })
  })

  describe("registerPlugin", () => {
    it("should register a specific plugin", () => {
      const mockPlugin = {
        onError: jest.fn(),
      }

      initialiseBigscreenPlayer()
      bigscreenPlayer.registerPlugin(mockPlugin)

      expect(Plugins.registerPlugin).toHaveBeenCalledWith(mockPlugin)
    })
  })

  describe("unregister plugin", () => {
    it("should remove a specific plugin", () => {
      const mockPlugin = {
        onError: jest.fn(),
      }

      initialiseBigscreenPlayer()

      bigscreenPlayer.unregisterPlugin(mockPlugin)

      expect(Plugins.unregisterPlugin).toHaveBeenCalledWith(mockPlugin)
    })
  })

  describe("getDebugLogs", () => {
    it('should call "retrieve" on the DebugTool', () => {
      bigscreenPlayer.getDebugLogs()
      expect(DebugTool.getDebugLogs).toHaveBeenCalledTimes(1)
    })
  })
})
