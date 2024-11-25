import MediaPlayerBase from "../mediaplayerbase"
import RestartableMediaPlayer from "./restartable"

describe("restartable HMTL5 Live Player", () => {
  const sourceContainer = document.createElement("div")

  let player

  beforeEach(() => {
    player = {
      addEventCallback: jest.fn(),
      beginPlayback: jest.fn(),
      beginPlaybackFrom: jest.fn(),
      getMimeType: jest.fn(),
      getPlayerElement: jest.fn(),
      getState: jest.fn(),
      getSource: jest.fn(),
      initialiseMedia: jest.fn(),
      removeEventCallback: jest.fn(),
      removeAllEventCallbacks: jest.fn(),
      reset: jest.fn(),
      stop: jest.fn(),
    }
  })

  describe("methods call the appropriate media player methods", () => {
    let restartableMediaPlayer

    function wrapperTests(action, expectedReturn) {
      if (expectedReturn) {
        player[action].mockReturnValue(expectedReturn)

        expect(restartableMediaPlayer[action]()).toBe(expectedReturn)
      } else {
        restartableMediaPlayer[action]()

        expect(player[action]).toHaveBeenCalledTimes(1)
      }
    }

    beforeEach(() => {
      restartableMediaPlayer = RestartableMediaPlayer(player)
    })

    it("calls beginPlayback on the media player", () => {
      wrapperTests("beginPlayback")
    })

    it("calls initialiseMedia on the media player", () => {
      wrapperTests("initialiseMedia")
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

      restartableMediaPlayer.addEventCallback(thisArg, jest.fn())

      expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, expect.any(Function))
    })

    it("calls removeEventCallback on the media player", () => {
      const thisArg = "arg"

      restartableMediaPlayer.addEventCallback(thisArg, jest.fn())
      restartableMediaPlayer.removeEventCallback(thisArg, jest.fn())

      expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, expect.any(Function))
    })

    it("calls removeAllEventCallbacks on the media player", () => {
      wrapperTests("removeAllEventCallbacks")
    })

    it("calls getPlayerElement on the media player", () => {
      wrapperTests("getPlayerElement", "thisPlayerElement")
    })
  })

  describe("should not have methods for", () => {
    it("playFrom", () => {
      expect(RestartableMediaPlayer(player).playFrom).toBeUndefined()
    })

    it("pause", () => {
      expect(RestartableMediaPlayer(player).pause).toBeUndefined()
    })

    it("resume", () => {
      expect(RestartableMediaPlayer(player).resume).toBeUndefined()
    })

    it("getCurrentTime", () => {
      expect(RestartableMediaPlayer(player).getCurrentTime).toBeUndefined()
    })

    it("getSeekableRange", () => {
      expect(RestartableMediaPlayer(player).getSeekableRange).toBeUndefined()
    })
  })

  describe("calls the mediaplayer with the correct media Type", () => {
    it.each([
      [MediaPlayerBase.TYPE.LIVE_VIDEO, MediaPlayerBase.TYPE.VIDEO],
      [MediaPlayerBase.TYPE.LIVE_VIDEO, MediaPlayerBase.TYPE.LIVE_VIDEO],
      [MediaPlayerBase.TYPE.LIVE_AUDIO, MediaPlayerBase.TYPE.AUDIO],
    ])("should initialise the Media Player with the correct type %s for a %s stream", (expectedType, streamType) => {
      const restartableMediaPlayer = RestartableMediaPlayer(player)

      restartableMediaPlayer.initialiseMedia(streamType, "http://mock.url", "mockMimeType", sourceContainer)

      expect(player.initialiseMedia).toHaveBeenCalledWith(
        expectedType,
        "http://mock.url",
        "mockMimeType",
        sourceContainer,
        undefined
      )
    })
  })

  describe("beginPlayback", () => {
    it("should respect config forcing playback from the end of the window", () => {
      window.bigscreenPlayer = {
        overrides: {
          forceBeginPlaybackToEndOfWindow: true,
        },
      }

      const restartableMediaPlayer = RestartableMediaPlayer(player)

      restartableMediaPlayer.beginPlayback()

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(Infinity)
    })
  })

  describe("beginPlaybackFrom", () => {
    afterEach(() => {
      delete window.bigscreenPlayer
    })

    it("begins playback with the desired offset", () => {
      const restartableMediaPlayer = RestartableMediaPlayer(player)

      restartableMediaPlayer.beginPlaybackFrom(10)

      expect(player.beginPlaybackFrom).toHaveBeenCalledWith(10)
    })
  })
})
