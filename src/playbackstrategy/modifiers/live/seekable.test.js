import { ManifestType } from "../../../models/manifesttypes"
import MediaPlayerBase from "../mediaplayerbase"
import SeekableMediaPlayer from "./seekable"
import TimeShiftDetector from "../../../utils/timeshiftdetector"
import DynamicWindowUtils from "../../../dynamicwindowutils"

jest.mock("../../../utils/timeshiftdetector")

const mockTimeShiftDetector = {
  disconnect: jest.fn(),
  isSeekableRangeSliding: jest.fn(),
  observe: jest.fn(),
  // Mock function to fake time shift detection
  triggerTimeShiftDetected: jest.fn(),
}

const mockMediaSources = {
  time: jest.fn(),
  currentSource: jest.fn().mockReturnValue(""),
  availableSources: jest.fn().mockReturnValue([]),
}

describe("Seekable HMTL5 Live Player", () => {
  const callback = () => {}
  const sourceContainer = document.createElement("div")

  let player

  beforeAll(() => {
    jest.spyOn(DynamicWindowUtils, "autoResumeAtStartOfRange")

    TimeShiftDetector.mockImplementation((onceTimeShiftDetected) => {
      mockTimeShiftDetector.triggerTimeShiftDetected.mockImplementation(() => onceTimeShiftDetected())

      return mockTimeShiftDetector
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockMediaSources.time.mockReturnValue({
      manifestType: ManifestType.STATIC,
      presentationTimeOffsetInMilliseconds: 0,
      availabilityStartTimeInMilliseconds: 0,
      timeShiftBufferDepthInMilliseconds: 0,
    })

    player = {
      beginPlayback: jest.fn(),
      initialiseMedia: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      getState: jest.fn(),
      getSource: jest.fn(),
      getMimeType: jest.fn(),
      addEventCallback: jest.fn(),
      removeEventCallback: jest.fn(),
      removeAllEventCallbacks: jest.fn(),
      getPlayerElement: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      beginPlaybackFrom: jest.fn(),
      playFrom: jest.fn(),
      getCurrentTime: jest.fn(),
      getSeekableRange: jest.fn(),
      toPaused: jest.fn(),
      toPlaying: jest.fn(),
    }
  })

  describe("methods call the appropriate media player methods", () => {
    let seekableMediaPlayer

    function wrapperTests(action, expectedReturn) {
      if (expectedReturn) {
        player[action].mockReturnValue(expectedReturn)

        expect(seekableMediaPlayer[action]()).toBe(expectedReturn)
      } else {
        seekableMediaPlayer[action]()

        expect(player[action]).toHaveBeenCalledTimes(1)
      }
    }

    beforeEach(() => {
      seekableMediaPlayer = SeekableMediaPlayer(player)
    })

    it("calls beginPlayback on the media player", () => {
      wrapperTests("beginPlayback")
    })

    it("calls initialiseMedia on the media player", () => {
      wrapperTests("initialiseMedia")
    })

    it("calls beginPlayingFrom on the media player", () => {
      const arg = 0
      seekableMediaPlayer.beginPlaybackFrom(arg)

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(arg)
    })

    it("calls playFrom on the media player", () => {
      const arg = 0
      seekableMediaPlayer.playFrom(arg)

      expect(player.playFrom).toHaveBeenCalledWith(arg)
    })

    it("calls stop on the media player", () => {
      wrapperTests("stop")
    })

    it("calls reset on the media player", () => {
      wrapperTests("reset")
    })

    it("calls getState on the media player", () => {
      wrapperTests("getState", "thisState")
    })

    it("calls getSource on the media player", () => {
      wrapperTests("getSource", "thisSource")
    })

    it("calls getMimeType on the media player", () => {
      wrapperTests("getMimeType", "thisMimeType")
    })

    it("calls addEventCallback on the media player", () => {
      const thisArg = "arg"
      seekableMediaPlayer.addEventCallback(thisArg, callback)

      expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback)
    })

    it("calls removeEventCallback on the media player", () => {
      const thisArg = "arg"
      seekableMediaPlayer.removeEventCallback(thisArg, callback)

      expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback)
    })

    it("calls removeAllEventCallbacks on the media player", () => {
      wrapperTests("removeAllEventCallbacks")
    })

    it("calls getPlayerElement on the media player", () => {
      wrapperTests("getPlayerElement")
    })

    it("calls pause on the media player", () => {
      player.getSeekableRange.mockReturnValue({ start: 0 })

      wrapperTests("pause")
    })

    it("calls getCurrentTime on media player", () => {
      wrapperTests("getCurrentTime", "thisTime")
    })

    it("calls getSeekableRange on media player", () => {
      wrapperTests("getSeekableRange", "thisRange")
    })
  })

  describe("Seekable features", () => {
    afterEach(() => {
      delete window.bigscreenPlayer
    })

    it("should respect config forcing playback from the end of the window", () => {
      window.bigscreenPlayer = {
        overrides: {
          forceBeginPlaybackToEndOfWindow: true,
        },
      }

      const seekableMediaPlayer = SeekableMediaPlayer(player)

      seekableMediaPlayer.beginPlayback()

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(Infinity)
    })
  })

  describe("initialise the mediaplayer", () => {
    it.each([
      [MediaPlayerBase.TYPE.LIVE_VIDEO, MediaPlayerBase.TYPE.VIDEO],
      [MediaPlayerBase.TYPE.LIVE_VIDEO, MediaPlayerBase.TYPE.LIVE_VIDEO],
      [MediaPlayerBase.TYPE.LIVE_AUDIO, MediaPlayerBase.TYPE.AUDIO],
    ])("should initialise the Media Player with the correct type %s for a %s stream", (expectedType, streamType) => {
      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(streamType, "http://mock.url", "mockMimeType", sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(
        expectedType,
        "http://mock.url",
        "mockMimeType",
        sourceContainer,
        undefined
      )
    })

    it("should provide the seekable range to the time shift detector", () => {
      player.getSeekableRange.mockReturnValue({ start: 0, end: 10 })
      const seekableMediaPlayer = SeekableMediaPlayer(player)

      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      expect(mockTimeShiftDetector.observe).toHaveBeenCalledWith(seekableMediaPlayer.getSeekableRange)
    })
  })

  describe("pause", () => {
    it("should call pause on the Media Player when attempting to pause more than 8 seconds from the start of the seekable range", () => {
      player.getCurrentTime.mockReturnValue(10)
      player.getSeekableRange.mockReturnValue({ start: 0 })

      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      seekableMediaPlayer.beginPlaybackFrom(0)
      seekableMediaPlayer.pause()

      expect(player.pause).toHaveBeenCalledTimes(1)
    })

    it("will 'fake pause' if attempting to pause within 8 seconds of the start of the seekable range", () => {
      player.getCurrentTime.mockReturnValue(7)
      player.getSeekableRange.mockReturnValue({ start: 0 })

      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      seekableMediaPlayer.beginPlaybackFrom(7)
      seekableMediaPlayer.pause()

      expect(player.toPaused).toHaveBeenCalledTimes(1)
      expect(player.toPlaying).toHaveBeenCalledTimes(1)
    })
  })

  describe("Auto-Resume", () => {
    it("should start auto-resume timeout when pausing and Time Shift Detector returns true for sliding", () => {
      mockTimeShiftDetector.isSeekableRangeSliding.mockReturnValueOnce(true)

      player.getCurrentTime.mockReturnValue(10)
      player.getSeekableRange.mockReturnValue({ start: 0, end: 100 })

      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      seekableMediaPlayer.beginPlaybackFrom(0)
      seekableMediaPlayer.pause()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
      expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledWith(
        10,
        { start: 0, end: 100 },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        seekableMediaPlayer.resume
      )
    })

    it("should not start auto-resume timeout when Time Shift Detector returns false for sliding", () => {
      mockTimeShiftDetector.isSeekableRangeSliding.mockReturnValueOnce(false)

      player.getCurrentTime.mockReturnValue(10)
      player.getSeekableRange.mockReturnValue({ start: 0 })

      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      seekableMediaPlayer.beginPlaybackFrom(0)
      seekableMediaPlayer.pause()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })

    it("should start auto-resume timeout when Time Shift Detector callback fires while paused", () => {
      player.getCurrentTime.mockReturnValue(10)
      player.getSeekableRange.mockReturnValue({ start: 0 })

      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      player.getState.mockReturnValueOnce(MediaPlayerBase.STATE.PAUSED)

      mockTimeShiftDetector.triggerTimeShiftDetected()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1)
    })

    it("should not start auto-resume timeout when Time Shift Detector callback fires while unpaused", () => {
      player.getCurrentTime.mockReturnValue(10)
      player.getSeekableRange.mockReturnValue({ start: 0 })

      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      player.getState.mockReturnValueOnce(MediaPlayerBase.STATE.PLAYING)

      mockTimeShiftDetector.triggerTimeShiftDetected()

      expect(DynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled()
    })

    it("should disconect from the Time Shift Detector on a call to reset", () => {
      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      seekableMediaPlayer.reset()

      expect(mockTimeShiftDetector.disconnect).toHaveBeenCalled()
    })

    it("should disconect from the Time Shift Detector on a call to stop", () => {
      const seekableMediaPlayer = SeekableMediaPlayer(player)
      seekableMediaPlayer.initialiseMedia(
        MediaPlayerBase.TYPE.VIDEO,
        "http://mock.url",
        "mockMimeType",
        sourceContainer
      )

      seekableMediaPlayer.stop()

      expect(mockTimeShiftDetector.disconnect).toHaveBeenCalled()
    })
  })
})
