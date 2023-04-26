import MediaPlayerBase from "../mediaplayerbase"
import PlayableMediaPlayer from "./playable"

describe("Playable HMTL5 Live Player", () => {
  const callback = () => {}
  const sourceContainer = document.createElement("div")

  let player
  let playableMediaPlayer

  function wrapperTests(action, expectedReturn) {
    if (expectedReturn) {
      player[action].mockReturnValue(expectedReturn)

      expect(playableMediaPlayer[action]()).toBe(expectedReturn)
    } else {
      playableMediaPlayer[action]()

      expect(player[action]).toHaveBeenCalledTimes(1)
    }
  }

  function isUndefined(action) {
    expect(playableMediaPlayer[action]).toBeUndefined()
  }

  beforeEach(() => {
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
    }

    playableMediaPlayer = PlayableMediaPlayer(player)
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

    playableMediaPlayer.addEventCallback(thisArg, callback)

    expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback)
  })

  it("calls removeEventCallback on the media player", () => {
    const thisArg = "arg"

    playableMediaPlayer.removeEventCallback(thisArg, callback)

    expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback)
  })

  it("calls removeAllEventCallbacks on the media player", () => {
    wrapperTests("removeAllEventCallbacks")
  })

  it("calls getPlayerElement on the media player", () => {
    wrapperTests("getPlayerElement", "thisPlayerElement")
  })

  describe("should not have methods for", () => {
    it("beginPlaybackFrom", () => {
      isUndefined("beginPlaybackFrom")
    })

    it("playFrom", () => {
      isUndefined("playFrom")
    })

    it("pause", () => {
      isUndefined("pause")
    })

    it("resume", () => {
      isUndefined("resume")
    })

    it("getCurrentTime", () => {
      isUndefined("getCurrentTime")
    })

    it("getSeekableRange", () => {
      isUndefined("getSeekableRange")
    })
  })

  describe("calls the mediaplayer with the correct media Type", () => {
    it("when is an audio stream", () => {
      const mediaType = MediaPlayerBase.TYPE.AUDIO
      playableMediaPlayer.initialiseMedia(mediaType, null, null, sourceContainer, null)

      expect(player.initialiseMedia).toHaveBeenCalledWith(
        MediaPlayerBase.TYPE.LIVE_AUDIO,
        null,
        null,
        sourceContainer,
        null
      )
    })

    it("when is an video stream", () => {
      const mediaType = MediaPlayerBase.TYPE.VIDEO
      playableMediaPlayer.initialiseMedia(mediaType, null, null, sourceContainer, null)

      expect(player.initialiseMedia).toHaveBeenCalledWith(
        MediaPlayerBase.TYPE.LIVE_VIDEO,
        null,
        null,
        sourceContainer,
        null
      )
    })
  })
})
