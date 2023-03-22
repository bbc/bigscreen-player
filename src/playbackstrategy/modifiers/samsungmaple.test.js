import samsungMapleMediaPlayer from "./samsungmaple"
import MediaPlayerBase from "./mediaplayerbase"

describe("Samsung Maple", () => {
  const mockPlayerPlugin = {
    ResumePlay: () => {},
    SetDisplayArea: () => {},
    Play: () => {},
    Pause: () => {},
    Resume: () => {},
    Stop: () => {},
    JumpForward: () => {},
    JumpBackward: () => {},
    GetDuration: () => {},
  }

  let player
  let recentEvents

  function eventCallbackReporter(event) {
    recentEvents.push(event.type)
  }

  beforeEach(() => {
    jest.spyOn(document, "getElementById").mockReturnValue(mockPlayerPlugin)
    jest.spyOn(mockPlayerPlugin, "ResumePlay").mockImplementation(() => {})
    jest.spyOn(mockPlayerPlugin, "Play").mockImplementation(() => {})
    jest.spyOn(mockPlayerPlugin, "Pause").mockReturnValue(1)
    jest.spyOn(mockPlayerPlugin, "Stop").mockImplementation(() => {})
    jest.spyOn(mockPlayerPlugin, "JumpForward").mockReturnValue(1)
    jest.spyOn(mockPlayerPlugin, "JumpBackward").mockReturnValue(1)
    jest.spyOn(mockPlayerPlugin, "GetDuration").mockReturnValue(100000)
    jest.spyOn(mockPlayerPlugin, "Resume").mockImplementation(() => {})

    player = samsungMapleMediaPlayer()
    recentEvents = []
    player.addEventCallback(this, eventCallbackReporter)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("initialiseMedia", () => {
    it("should set the source and mimeType and emit a stopped event", () => {
      recentEvents = []
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")

      expect(player.getSource()).toEqual("testUrl")
      expect(player.getMimeType()).toEqual("testMimeType")
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.STOPPED)
    })
  })

  describe("beginPlaybackFrom", () => {
    it("should call ResumePlay on the player plugin if in a stopped state", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
      recentEvents = []
      player.beginPlaybackFrom(0)

      expect(mockPlayerPlugin.ResumePlay).toHaveBeenCalledTimes(1)
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
    })
  })

  describe("beginPlayback", () => {
    it("should call Play on the player plugin if in a stopped state", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
      recentEvents = []
      player.beginPlayback()

      expect(mockPlayerPlugin.Play).toHaveBeenCalledTimes(1)
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
    })
  })

  describe("pause", () => {
    it("should emit a paused event if in a playing state", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
      player.beginPlayback()
      player.toPlaying()
      recentEvents = []
      player.pause()

      expect(recentEvents).toContain(MediaPlayerBase.EVENT.PAUSED)
    })
  })

  describe("resume", () => {
    it("should emit a playing event if in a paused state", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
      player.beginPlayback()
      player.toPaused()
      recentEvents = []
      player.resume()

      expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING)
    })
  })

  describe("stop", () => {
    it("should emit a stopped event if in a playing state", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
      player.beginPlayback()
      player.toPlaying()
      recentEvents = []
      player.stop()

      expect(mockPlayerPlugin.Stop).toHaveBeenCalledTimes(1)
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.STOPPED)
    })
  })

  describe("reset", () => {
    it("should call Stop on the player plugin if in a stopped state", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
      player.reset()

      expect(mockPlayerPlugin.Stop).toHaveBeenCalledTimes(1)
    })
  })

  describe("playFrom", () => {
    describe("in a playing state", () => {
      it("should call JumpForward on the player plugin if seeking forwards", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
        player.beginPlayback()
        window.SamsungMapleOnCurrentPlayTime(0)
        window.SamsungMapleOnStreamInfoReady()
        player.toPlaying()
        recentEvents = []
        player.playFrom(20)

        expect(mockPlayerPlugin.JumpForward).toHaveBeenCalledTimes(1)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it("should call JumpBackward on the player plugin if seeking backwards", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
        player.beginPlaybackFrom(20)
        window.SamsungMapleOnCurrentPlayTime(20000)
        window.SamsungMapleOnStreamInfoReady()
        player.toPlaying()
        recentEvents = []
        player.playFrom(0)

        expect(mockPlayerPlugin.JumpBackward).toHaveBeenCalledTimes(1)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it("should not attempt to seek if seeking close to current time", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
        player.beginPlayback()
        window.SamsungMapleOnCurrentPlayTime(0)
        window.SamsungMapleOnStreamInfoReady()
        player.toPlaying()
        recentEvents = []
        player.playFrom(1.5)

        expect(mockPlayerPlugin.JumpForward).toHaveBeenCalledTimes(0)
        expect(mockPlayerPlugin.JumpBackward).toHaveBeenCalledTimes(0)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING)
      })
    })

    describe("in a paused state", () => {
      it("should call JumpForward and Resume on the player plugin if seeking forwards", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
        player.beginPlayback()
        window.SamsungMapleOnCurrentPlayTime(0)
        window.SamsungMapleOnStreamInfoReady()
        player.toPaused()
        recentEvents = []
        player.playFrom(20)

        expect(mockPlayerPlugin.JumpForward).toHaveBeenCalledTimes(1)
        expect(mockPlayerPlugin.Resume).toHaveBeenCalledTimes(1)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it("should call JumpBackward and Resume on the player plugin if seeking backwards", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
        player.beginPlaybackFrom(20)
        window.SamsungMapleOnCurrentPlayTime(20000)
        window.SamsungMapleOnStreamInfoReady()
        player.toPaused()
        recentEvents = []
        player.playFrom(0)

        expect(mockPlayerPlugin.JumpBackward).toHaveBeenCalledTimes(1)
        expect(mockPlayerPlugin.Resume).toHaveBeenCalledTimes(1)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it("should not attempt to seek and call Resume on the player plugin if seeking close to current time", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
        player.beginPlayback()
        window.SamsungMapleOnCurrentPlayTime(0)
        window.SamsungMapleOnStreamInfoReady()
        player.toPaused()
        recentEvents = []
        player.playFrom(1.5)

        expect(mockPlayerPlugin.JumpForward).toHaveBeenCalledTimes(0)
        expect(mockPlayerPlugin.JumpBackward).toHaveBeenCalledTimes(0)
        expect(mockPlayerPlugin.Resume).toHaveBeenCalledTimes(1)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING)
      })
    })

    describe("in a complete state", () => {
      it("calls Stop and ResumePlay on the player plugin, and emits a buffering event", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType")
        player.beginPlayback()
        window.SamsungMapleOnCurrentPlayTime(0)
        window.SamsungMapleOnStreamInfoReady()
        window.SamsungMapleOnRenderingComplete()
        recentEvents = []
        player.playFrom(20)

        expect(mockPlayerPlugin.Stop).toHaveBeenCalledTimes(1)
        expect(mockPlayerPlugin.ResumePlay).toHaveBeenCalledTimes(1)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })
    })
  })
})
