import BigscreenPlayer from "./bigscreenplayer"
import { canPauseAndSeek } from "./dynamicwindowutils"
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
import { Timeline } from "./models/timeline"
import getError, { NoErrorThrownError } from "./testutils/geterror"

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

jest.mock("./dynamicwindowutils")
jest.mock("./mediasources", () => jest.fn(() => mockMediaSources))
jest.mock("./playercomponent")
jest.mock("./plugins")
jest.mock("./resizer", () => jest.fn(() => mockResizer))
jest.mock("./debugger/debugtool")
jest.mock("./subtitles/subtitles", () => jest.fn(() => mockSubtitlesInstance))
jest.mock("./readyhelper", () =>
  jest.fn((_a, _b, _c, onReady) => {
    if (typeof onReady === "function") {
      onReady()
    }

    return mockReadyHelper
  })
)

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
    bigscreenPlayer?.tearDown()
    bigscreenPlayer = undefined

    jest.clearAllMocks()

    mockMediaSources.time.mockReturnValue({
      manifestType: ManifestType.STATIC,
      presentationTimeOffsetInMilliseconds: 0,
      availabilityStartTimeInMilliseconds: 0,
      timeShiftBufferDepthInMilliseconds: 0,
    })

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
      setPlaybackRate: jest.fn(),
      getPlaybackRate: jest.fn(),
      isAudioDescribedAvailable: jest.fn(),
      isAudioDescribedEnabled: jest.fn(),
      setAudioDescribed: jest.fn(),
      setConstrainedBitrateInKbps: jest.fn(),
      getPlaybackBitrate: jest.fn(),
    }

    jest.spyOn(PlayerComponent, "getLiveSupport").mockReturnValue(LiveSupport.SEEKABLE)

    PlayerComponent.mockImplementation((playbackElement, bigscreenPlayerData, mediaSources, callback) => {
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
        ManifestType.STATIC,
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
        expect.any(Function),
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

    describe("handling initial playback time", () => {
      it("treats initial playback time as a presentation time if it is passed in as a number", async () => {
        bigscreenPlayerData.initialPlaybackTime = 100
        await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

        expect(jest.mocked(PlayerComponent)).toHaveBeenCalledWith(
          expect.any(HTMLDivElement),
          expect.objectContaining({
            initialPlaybackTime: 100,
          }),
          expect.any(Object),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        )
      })

      it("treats initial playback time as presentation time when timeline isn't specified", async () => {
        bigscreenPlayerData.initialPlaybackTime = {
          seconds: 100,
        }

        await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

        expect(jest.mocked(PlayerComponent)).toHaveBeenCalledWith(
          expect.any(HTMLDivElement),
          expect.objectContaining({
            initialPlaybackTime: 100,
          }),
          expect.any(Object),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        )
      })

      it("does not convert initial playback time if it is passed in as a presentation time", async () => {
        bigscreenPlayerData.initialPlaybackTime = {
          seconds: 100,
          timeline: Timeline.PRESENTATION_TIME,
        }

        await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

        expect(jest.mocked(PlayerComponent)).toHaveBeenCalledWith(
          expect.any(HTMLDivElement),
          expect.objectContaining({
            initialPlaybackTime: 100,
          }),
          expect.any(Object),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        )
      })

      it("converts initial playback time to a presentation time if input is a media sample time", async () => {
        bigscreenPlayerData.initialPlaybackTime = {
          seconds: 100,
          timeline: Timeline.MEDIA_SAMPLE_TIME,
        }

        jest
          .mocked(mockMediaSources.time)
          .mockReturnValue({ manifestType: ManifestType.STATIC, presentationTimeOffsetInMilliseconds: 50000 })

        await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

        expect(jest.mocked(PlayerComponent)).toHaveBeenCalledWith(
          expect.any(HTMLDivElement),
          expect.objectContaining({
            initialPlaybackTime: 50,
          }),
          expect.any(Object),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        )
      })

      it("converts initial playback time to null if input is an availability time for a static stream", async () => {
        bigscreenPlayerData.initialPlaybackTime = {
          seconds: 100,
          timeline: Timeline.AVAILABILITY_TIME,
        }

        jest
          .mocked(mockMediaSources.time)
          .mockReturnValue({ manifestType: ManifestType.STATIC, availabilityStartTimeInMilliseconds: 0 })

        await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

        expect(jest.mocked(PlayerComponent)).toHaveBeenCalledWith(
          expect.any(HTMLDivElement),
          expect.objectContaining({
            initialPlaybackTime: null,
          }),
          expect.any(Object),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        )
      })

      it("converts initial playback time to a presentation time if input is an availability time for a dynamic stream", async () => {
        bigscreenPlayerData.initialPlaybackTime = {
          seconds: 1731045700,
          timeline: Timeline.AVAILABILITY_TIME,
        }

        jest.mocked(mockMediaSources.time).mockReturnValue({
          manifestType: ManifestType.DYNAMIC,
          availabilityStartTimeInMilliseconds: 1731045600000, // Friday, 8 November 2024 06:00:00
        })

        await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

        expect(jest.mocked(PlayerComponent)).toHaveBeenCalledWith(
          expect.any(HTMLDivElement),
          expect.objectContaining({
            initialPlaybackTime: 100,
          }),
          expect.any(Object),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        )
      })
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

    it("converts a media sample time to presentation time", async () => {
      mockMediaSources.time.mockReturnValue({ presentationTimeOffsetInMilliseconds: 7200000 })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setCurrentTime(7250, Timeline.MEDIA_SAMPLE_TIME)

      expect(mockPlayerComponentInstance.setCurrentTime).toHaveBeenCalledWith(50)
      expect(mockPlayerComponentInstance.setCurrentTime).toHaveBeenCalledTimes(1)
    })

    it("converts an availability time to presentation time", async () => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        availabilityStartTimeInMilliseconds: 7200000,
      })

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 105 })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.setCurrentTime(7230, Timeline.AVAILABILITY_TIME)

      expect(mockPlayerComponentInstance.setCurrentTime).toHaveBeenCalledWith(30)
      expect(mockPlayerComponentInstance.setCurrentTime).toHaveBeenCalledTimes(1)
    })

    it("throws an error on a non-numerical value", () => {
      expect(() => bigscreenPlayer.setCurrentTime(null)).toThrow(TypeError)
    })
  })

  describe("converting presentation time to media sample time", () => {
    it("returns null before initialisation", () => {
      expect(bigscreenPlayer.convertPresentationTimeToMediaSampleTimeInSeconds(60)).toBeNull()
    })

    it("returns null until MediaSources load", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue(null)

      expect(bigscreenPlayer.convertPresentationTimeToMediaSampleTimeInSeconds(60)).toBeNull()
    })

    it("returns a number", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue({ presentationTimeOffsetInMilliseconds: 7200000 })

      expect(bigscreenPlayer.convertPresentationTimeToMediaSampleTimeInSeconds(60)).toBe(7260)
    })
  })

  describe("converting media sample time to presentation time", () => {
    it("returns null before initialisation", () => {
      expect(bigscreenPlayer.convertMediaSampleTimeToPresentationTimeInSeconds(60)).toBeNull()
    })

    it("returns null until MediaSources load", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue(null)

      expect(bigscreenPlayer.convertMediaSampleTimeToPresentationTimeInSeconds(60)).toBeNull()
    })

    it("returns a number", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue({ presentationTimeOffsetInMilliseconds: 7200000 })

      expect(bigscreenPlayer.convertMediaSampleTimeToPresentationTimeInSeconds(7260)).toBe(60)
    })
  })

  describe("converting presentation time to availability time", () => {
    it("returns null before initialisation", () => {
      expect(bigscreenPlayer.convertPresentationTimeToAvailabilityTimeInMilliseconds(60)).toBeNull()
    })

    it("returns null until MediaSources load", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue(null)

      expect(bigscreenPlayer.convertPresentationTimeToAvailabilityTimeInMilliseconds(60)).toBeNull()
    })

    it("returns null for a static stream", async () => {
      jest.mocked(mockMediaSources.time).mockReturnValue({ manifestType: ManifestType.STATIC })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.convertPresentationTimeToAvailabilityTimeInMilliseconds(60)).toBeNull()
    })

    it("returns a number", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest
        .mocked(mockMediaSources.time)
        .mockReturnValue({ manifestType: ManifestType.DYNAMIC, availabilityStartTimeInMilliseconds: 7200000 })

      expect(bigscreenPlayer.convertPresentationTimeToAvailabilityTimeInMilliseconds(60)).toBe(7260000)
    })
  })

  describe("converting availability time to presentation time", () => {
    it("returns null before initialisation", () => {
      expect(bigscreenPlayer.convertAvailabilityTimeToPresentationTimeInSeconds(60)).toBeNull()
    })

    it("returns null until MediaSources load", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue(null)

      expect(bigscreenPlayer.convertAvailabilityTimeToPresentationTimeInSeconds(60)).toBeNull()
    })

    it("returns null for a static stream", async () => {
      jest.mocked(mockMediaSources.time).mockReturnValue({ manifestType: ManifestType.STATIC })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.convertAvailabilityTimeToPresentationTimeInSeconds(60)).toBeNull()
    })

    it("returns a number", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest
        .mocked(mockMediaSources.time)
        .mockReturnValue({ manifestType: ManifestType.DYNAMIC, availabilityStartTimeInMilliseconds: 7200000 })

      expect(bigscreenPlayer.convertAvailabilityTimeToPresentationTimeInSeconds(7260000)).toBe(60)
    })
  })

  describe("reporting end of stream", () => {
    it("reports endOfStream true on initialisation when playing live and no initial playback time is set", async () => {
      const onTimeUpdate = jest.fn()

      jest.mocked(mockMediaSources.time).mockReturnValue({
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

    it("reports endOfStream false on initialisation when playing live and initialPlaybackTime is 0", async () => {
      const onTimeUpdate = jest.fn()

      jest.mocked(mockMediaSources.time).mockReturnValue({
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

    it("reports endOfStream false on initialisation when playing live and initialPlaybackTime is set in the middle of the stream", async () => {
      const onTimeUpdate = jest.fn()

      jest.mocked(mockMediaSources.time).mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      bigscreenPlayerData.initialPlaybackTime = 100000

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      dispatchMediaStateChange({ data: { currentTime: 100000 }, timeUpdate: true, isBufferingTimeoutError: false })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 100000, endOfStream: false })
    })

    it("reports endOfStream false on initialisation when playing live and initialPlaybackTime is set to the live edge time", async () => {
      const onTimeUpdate = jest.fn()

      jest.mocked(mockMediaSources.time).mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 105 })
      bigscreenPlayerData.initialPlaybackTime = 105

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      dispatchMediaStateChange({ data: { currentTime: 105 }, timeUpdate: true, isBufferingTimeoutError: false })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 105, endOfStream: false })
    })

    it("reports endOfStream true on state changes when seeking to the end of a dynamic stream", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onTimeUpdate = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 7200 })
      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(7198)

      jest.mocked(mockMediaSources.time).mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      bigscreenPlayer.setCurrentTime(7198)

      dispatchMediaStateChange({ data: { currentTime: 7198 }, timeUpdate: true })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 7198, endOfStream: true })
    })

    it("reports endOfStream false on state changes when seeking into the middle of a dynamic stream", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onTimeUpdate = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 7200 })

      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(3600)

      jest.mocked(mockMediaSources.time).mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514440000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      bigscreenPlayer.setCurrentTime(3600)

      dispatchMediaStateChange({ data: { currentTime: 3600 }, timeUpdate: true })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 3600, endOfStream: false })
    })

    it("reports endOfStream false on state changes following a pause, even when at live edge", async () => {
      jest.mocked(mockMediaSources.time).mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 0,
      })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 7200 })
      mockPlayerComponentInstance.getCurrentTime.mockReturnValue(7198)

      bigscreenPlayer.pause()

      dispatchMediaStateChange({ data: { state: MediaState.PAUSED } })

      expect(onStateChange).toHaveBeenCalledWith({
        state: MediaState.PAUSED,
        endOfStream: false,
        trigger: PauseTriggers.USER,
      })
    })

    it("reports endOfStream false for any static stream", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onTimeUpdate = jest.fn()

      bigscreenPlayer.registerForTimeUpdates(onTimeUpdate)

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 7200 })

      bigscreenPlayer.setCurrentTime(7200)

      dispatchMediaStateChange({ data: { currentTime: 7200 }, timeUpdate: true })

      expect(onTimeUpdate).toHaveBeenCalledWith({ currentTime: 7200, endOfStream: false })
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

    it("should return null when bigscreen player has not been initialised", () => {
      expect(bigscreenPlayer.getSeekableRange()).toBeNull()
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

      bigscreenPlayer.pause()

      expect(mockPlayerComponentInstance.pause).toHaveBeenCalledTimes(1)
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

    it("should set pauseTrigger to a user pause if user pause is not defined", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      const onStateChange = jest.fn()

      bigscreenPlayer.registerForStateChanges(onStateChange)

      bigscreenPlayer.pause()

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

  describe("setAudioDescribed", () => {
    it("should call through to PlayerComponent.setAudioDescribed", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
      bigscreenPlayer.setAudioDescribed(true)

      expect(mockPlayerComponentInstance.setAudioDescribed).toHaveBeenCalledTimes(1)
      expect(mockPlayerComponentInstance.setAudioDescribed).toHaveBeenCalledWith(true)
      expect(mockPlayerComponentInstance.setAudioDescribed).not.toHaveBeenCalledWith(false)

      bigscreenPlayer.setAudioDescribed(false)

      expect(mockPlayerComponentInstance.setAudioDescribed).toHaveBeenNthCalledWith(1, true)
      expect(mockPlayerComponentInstance.setAudioDescribed).toHaveBeenNthCalledWith(2, false)
    })
  })

  describe("isAudioDescribedEnabled", () => {
    it("calls through to PlayerComponent.isAudioDescribedEnabled", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.isAudioDescribedEnabled()

      expect(mockPlayerComponentInstance.isAudioDescribedEnabled).toHaveBeenCalled()
    })
  })

  describe("isAudioDescribedAvailable", () => {
    it("calls through to PlayerComponent.isAudioDescribedAvailable", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      bigscreenPlayer.isAudioDescribedAvailable()

      expect(mockPlayerComponentInstance.isAudioDescribedAvailable).toHaveBeenCalled()
    })
  })

  describe("canPause", () => {
    it("should return true for on demand streams", async () => {
      jest.mocked(mockMediaSources.time).mockReturnValue({ manifestType: ManifestType.STATIC })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.canPause()).toBe(true)
    })

    it("should call through to DynamicWindowUtils with correct arguments and return it's value for live streams", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 7200000,
      })

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 60 })

      jest.mocked(canPauseAndSeek).mockReturnValueOnce(true)

      expect(bigscreenPlayer.canPause()).toBe(true)

      expect(canPauseAndSeek).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })

      jest.mocked(canPauseAndSeek).mockReturnValueOnce(false)

      expect(bigscreenPlayer.canPause()).toBe(false)

      expect(canPauseAndSeek).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })
    })
  })

  describe("canSeek", () => {
    it("should return true for on demand streams", async () => {
      jest.mocked(mockMediaSources.time).mockReturnValue({ manifestType: ManifestType.STATIC })

      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      expect(bigscreenPlayer.canSeek()).toBe(true)
    })

    it("should call through to DynamicWindowUtils with correct arguments and return it's value for live streams", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)

      jest.mocked(mockMediaSources.time).mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        presentationTimeOffsetInMilliseconds: 1731514400000,
        availabilityStartTimeInMilliseconds: 1731514400000,
        timeShiftBufferDepthInMilliseconds: 7200000,
      })

      mockPlayerComponentInstance.getSeekableRange.mockReturnValue({ start: 0, end: 60 })

      jest.mocked(canPauseAndSeek).mockReturnValueOnce(true)

      expect(bigscreenPlayer.canSeek()).toBe(true)

      expect(canPauseAndSeek).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })

      jest.mocked(canPauseAndSeek).mockReturnValueOnce(false)

      expect(bigscreenPlayer.canSeek()).toBe(false)

      expect(canPauseAndSeek).toHaveBeenCalledWith(LiveSupport.SEEKABLE, { start: 0, end: 60 })
    })
  })

  describe("registerPlugin", () => {
    it("should register a specific plugin", () => {
      const mockPlugin = {
        onError: jest.fn(),
      }

      bigscreenPlayer.registerPlugin(mockPlugin)

      expect(Plugins.registerPlugin).toHaveBeenCalledWith(mockPlugin)
    })
  })

  describe("unregister plugin", () => {
    it("should remove a specific plugin", () => {
      const mockPlugin = {
        onError: jest.fn(),
      }

      bigscreenPlayer.unregisterPlugin(mockPlugin)

      expect(Plugins.unregisterPlugin).toHaveBeenCalledWith(mockPlugin)
    })
  })

  describe("getDebugLogs", () => {
    it("should retrieve logs from DebugTool", () => {
      bigscreenPlayer.getDebugLogs()

      expect(DebugTool.getDebugLogs).toHaveBeenCalledTimes(1)
    })
  })

  describe("Set and get playback bitrate", () => {
    const mediaKind = "video"
    const minBitrate = 100
    const maxBitrate = 200

    it("should set bitrate on the strategy", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
      bigscreenPlayer.setConstrainedBitrateInKbps(mediaKind, minBitrate, maxBitrate)

      expect(mockPlayerComponentInstance.setConstrainedBitrateInKbps).toHaveBeenLastCalledWith(
        mediaKind,
        minBitrate,
        maxBitrate
      )
    })

    it("should not set the bitrate if playerComponent is not initialised", async () => {
      bigscreenPlayer.setBitrateConstraint(mediaKind, minBitrateKbps, maxBitrateKbps)

      expect(mockPlayerComponentInstance.setBitrateConstraint).not.toHaveBeenCalled()
    })

    it("should return the bitrate given a media kind", async () => {
      await asyncInitialiseBigscreenPlayer(createPlaybackElement(), bigscreenPlayerData)
      mockPlayerComponentInstance.getPlaybackBitrate.mockReturnValue(100)
      bigscreenPlayer.getPlaybackBitrate(mediaKind)

      expect(mockPlayerComponentInstance.getPlaybackBitrate()).toBe(100)
    })
  })
})
