import samsungStreamingMediaPlayer from './samsungstreaming'
import MediaPlayerBase from './mediaplayerbase'
import { jest } from '@jest/globals'

describe('Samsung Streaming', function () {
  var PlayerEventCodes = {
    RENDERING_COMPLETE: 8,
    BUFFERING_COMPLETE: 12,
    CURRENT_PLAYBACK_TIME: 14
  }

  var mockPlayerPlugin = {
    Execute: function () {},
    OnEvent: function () {},
    Open: function () {},
    Close: function () {}
  }

  var player
  var recentEvents

  function eventCallbackReporter (event) {
    recentEvents.push(event.type)
  }

  beforeEach(function () {
    jest.spyOn(document, 'getElementById').mockImplementation(function (id) {
      if (id === 'sefPlayer') {
        return mockPlayerPlugin
      }
    })
    jest.spyOn(mockPlayerPlugin, 'Execute').mockImplementation(function (command) {
      if (command === 'GetDuration') {
        return 100000
      } else {
        return 1
      }
    })
    jest.spyOn(mockPlayerPlugin, 'Close').mockImplementation(() => {})
    jest.spyOn(mockPlayerPlugin, 'Open').mockImplementation(() => {})

    player = samsungStreamingMediaPlayer()
    recentEvents = []
    player.addEventCallback(this, eventCallbackReporter)
  })

  afterEach(function () {
    jest.clearAllMocks()
  })

  describe('initialiseMedia', function () {
    it('should set the source and mimeType and emit a stopped event', function () {
      recentEvents = []
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')

      expect(player.getSource()).toEqual('testUrl')
      expect(player.getMimeType()).toEqual('testMimeType')
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.STOPPED)
    })

    it('should call InitPlayer on the player plugin', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')

      expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('InitPlayer', 'testUrl')
    })

    it('should modify the source if mimeType is HLS', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'application/vnd.apple.mpegurl')

      expect(player.getSource()).toEqual('testUrl|COMPONENT=HLS')
    })

    it('should modify the source if mimeType is HLS and is live media', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, 'testUrl', 'application/vnd.apple.mpegurl')

      expect(player.getSource()).toEqual('testUrl|HLSSLIDING|COMPONENT=HLS')
    })

    it('should open the streaming player plugin if mimeType is HLS', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'application/vnd.apple.mpegurl')

      expect(mockPlayerPlugin.Open).toHaveBeenCalledWith('StreamingPlayer', '1.0', 'StreamingPlayer')
    })

    it('should open the player plugin if mimeType is not HLS', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')

      expect(mockPlayerPlugin.Open).toHaveBeenCalledWith('Player', '1.010', 'Player')
    })
  })

  describe('beginPlaybackFrom', function () {
    it('should call StartPlayback with start time on the player plugin if in a stopped state', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
      recentEvents = []
      mockPlayerPlugin.Execute.mockClear()
      player.beginPlaybackFrom(0)

      expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('StartPlayback', 0)
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
    })
  })

  describe('beginPlayback', function () {
    it('should call StartPlayback on the player plugin if in a stopped state', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
      recentEvents = []
      mockPlayerPlugin.Execute.mockClear()
      player.beginPlayback()

      expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('StartPlayback')
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
    })
  })

  describe('pause', function () {
    it('should call Pause on the player plugin if in a playing state', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
      player.beginPlayback()
      player.toPlaying()
      recentEvents = []
      mockPlayerPlugin.Execute.mockClear()
      player.pause()

      expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Pause')
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.PAUSED)
    })
  })

  describe('stop', function () {
    it('should emit a stopped event if in a playing state', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
      player.beginPlayback()
      player.toPlaying()
      recentEvents = []
      mockPlayerPlugin.Execute.mockClear()
      player.stop()

      expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Stop')
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.STOPPED)
    })
  })

  describe('reset', function () {
    it('should call Stop and Close on the player plugin if in a stopped state', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
      mockPlayerPlugin.Execute.mockClear()
      player.reset()

      expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Stop')
      expect(mockPlayerPlugin.Close).toHaveBeenCalledTimes(1)
    })
  })

  describe('resume', function () {
    it('should call Resume on the player plugin and emit a playing event if in a paused state', function () {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
      player.beginPlayback()
      player.toPaused()
      recentEvents = []
      mockPlayerPlugin.Execute.mockClear()
      player.resume()

      expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Resume')
      expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING)
    })
  })

  describe('playFrom', function () {
    describe('in a playing state', function () {
      it('should call JumpForward on the player plugin if seeking forwards', function () {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
        player.beginPlayback()
        mockPlayerPlugin.OnEvent(PlayerEventCodes.CURRENT_PLAYBACK_TIME, 0)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.BUFFERING_COMPLETE)
        player.toPlaying()
        recentEvents = []
        mockPlayerPlugin.Execute.mockClear()
        player.playFrom(20)

        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('JumpForward', 20)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it('should call JumpBackward on the player plugin if seeking backwards', function () {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
        player.beginPlaybackFrom(20)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.CURRENT_PLAYBACK_TIME, 20000)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.BUFFERING_COMPLETE)
        player.toPlaying()
        recentEvents = []
        mockPlayerPlugin.Execute.mockClear()
        player.playFrom(0)

        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('JumpBackward', 20)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it('should not attempt to seek if seeking close to current time', function () {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
        player.beginPlayback()
        mockPlayerPlugin.OnEvent(PlayerEventCodes.CURRENT_PLAYBACK_TIME, 0)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.BUFFERING_COMPLETE)
        player.toPlaying()
        recentEvents = []
        mockPlayerPlugin.Execute.mockClear()
        player.playFrom(3)

        expect(mockPlayerPlugin.Execute).not.toHaveBeenCalledWith('JumpForward')
        expect(mockPlayerPlugin.Execute).not.toHaveBeenCalledWith('JumpBackward')
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING)
      })
    })

    describe('in a paused state', function () {
      it('should call JumpForward and Resume on the player plugin if seeking forwards', function () {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
        player.beginPlayback()
        mockPlayerPlugin.OnEvent(PlayerEventCodes.CURRENT_PLAYBACK_TIME, 0)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.BUFFERING_COMPLETE)
        player.toPaused()
        recentEvents = []
        mockPlayerPlugin.Execute.mockClear()
        player.playFrom(20)

        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('JumpForward', 20)
        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Resume')
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it('should call JumpBackward and Resume on the player plugin if seeking backwards', function () {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
        player.beginPlaybackFrom(20)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.CURRENT_PLAYBACK_TIME, 20000)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.BUFFERING_COMPLETE)
        player.toPaused()
        recentEvents = []
        player.playFrom(0)

        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('JumpBackward', 20)
        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Resume')
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })

      it('should not attempt to seek and call Resume on the player plugin if seeking close to current time', function () {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
        player.beginPlayback()
        mockPlayerPlugin.OnEvent(PlayerEventCodes.CURRENT_PLAYBACK_TIME, 0)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.BUFFERING_COMPLETE)
        player.toPaused()
        recentEvents = []
        mockPlayerPlugin.Execute.mockClear()
        player.playFrom(3)

        expect(mockPlayerPlugin.Execute).not.toHaveBeenCalledWith('JumpForward')
        expect(mockPlayerPlugin.Execute).not.toHaveBeenCalledWith('JumpBackward')
        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Resume')
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING)
      })
    })

    describe('in a complete state', function () {
      it('calls Stop and StartPlayback on the player plugin, and emits a buffering event', function () {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType')
        player.beginPlayback()
        mockPlayerPlugin.OnEvent(PlayerEventCodes.CURRENT_PLAYBACK_TIME, 0)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.BUFFERING_COMPLETE)
        mockPlayerPlugin.OnEvent(PlayerEventCodes.RENDERING_COMPLETE)
        recentEvents = []
        mockPlayerPlugin.Execute.mockClear()
        player.playFrom(20)

        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('Stop')
        expect(mockPlayerPlugin.Execute).toHaveBeenCalledWith('StartPlayback', 20)
        expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING)
      })
    })
  })
})
