import Html5MediaPlayer from "./html5"
import MediaPlayerBase from "./mediaplayerbase"

describe("HTML5 Base", () => {
  let sourceContainer
  let player
  let mockSourceElement
  let mockVideoMediaElement
  let mockAudioMediaElement
  let metaDataCallback
  let finishedBufferingCallback
  let errorCallback
  let endedCallback
  let timeupdateCallback
  let waitingCallback
  let playingCallback
  let recentEvents

  function eventCallbackReporter(event) {
    recentEvents.push(event)
  }

  function getRecentEventTypes() {
    return recentEvents.map((event) => event.type)
  }

  function giveMediaElementMetaData(mediaElement, metadata) {
    try {
      jest.spyOn(mediaElement, "seekable", "get").mockReturnValue({
        start: () => metadata.start,
        end: () => metadata.end,
        length: 2,
      })
    } catch {
      mediaElement.seekable = {
        start: () => metadata.start,
        end: () => metadata.end,
        length: 2,
      }
    }
  }

  function createPlayer() {
    player = Html5MediaPlayer()
    jest.spyOn(player, "toPaused")

    player.addEventCallback(this, eventCallbackReporter)
  }

  beforeEach(() => {
    window.bigscreenPlayer = {}
    recentEvents = []

    mockSourceElement = document.createElement("source")
    mockVideoMediaElement = document.createElement("video")
    mockAudioMediaElement = document.createElement("audio")
    sourceContainer = document.createElement("div")

    jest.spyOn(document, "createElement").mockImplementation((type) => {
      switch (type) {
        case "source": {
          return mockSourceElement
        }
        case "video": {
          return mockVideoMediaElement
        }
        case "audio": {
          return mockAudioMediaElement
        }
        // No default
      }
      return sourceContainer
    })

    jest.spyOn(mockVideoMediaElement, "addEventListener").mockImplementation((name, methodCall) => {
      switch (name) {
        case "loadedmetadata": {
          metaDataCallback = methodCall

          break
        }
        case "canplay": {
          finishedBufferingCallback = methodCall

          break
        }
        case "error": {
          errorCallback = methodCall

          break
        }
        case "ended": {
          endedCallback = methodCall

          break
        }
        case "waiting": {
          waitingCallback = methodCall

          break
        }
        case "playing": {
          playingCallback = methodCall

          break
        }
        case "timeupdate": {
          timeupdateCallback = methodCall

          break
        }
        // No default
      }
    })

    jest.spyOn(mockAudioMediaElement, "addEventListener").mockImplementation((name, methodCall) => {
      switch (name) {
        case "loadedmetadata": {
          metaDataCallback = methodCall

          break
        }
        case "canplay": {
          finishedBufferingCallback = methodCall

          break
        }
        case "error": {
          errorCallback = methodCall

          break
        }
        case "ended": {
          endedCallback = methodCall

          break
        }
        case "waiting": {
          waitingCallback = methodCall

          break
        }
        // No default
      }
    })

    jest.spyOn(mockVideoMediaElement, "play").mockImplementation(() => {})
    jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue()
    jest.spyOn(mockVideoMediaElement, "load").mockImplementation(() => {})
    jest.spyOn(mockVideoMediaElement, "pause").mockImplementation(() => {})

    jest.spyOn(mockAudioMediaElement, "play").mockImplementation(() => {})
    jest.spyOn(mockAudioMediaElement, "seekable", "get").mockReturnValue()
    jest.spyOn(mockAudioMediaElement, "load").mockImplementation(() => {})
    jest.spyOn(mockAudioMediaElement, "pause").mockImplementation(() => {})
    createPlayer()
  })

  afterEach(() => {
    jest.clearAllMocks()
    player = null
    delete window.bigscreenPlayer
  })

  describe("Media Player Common Tests", () => {
    describe("Empty State Tests", () => {
      it("Get Source Returns Undefined In Empty State", () => {
        expect(player.getSource()).toBeUndefined()
      })

      it("Get Mime Type Returns Undefined In Empty State", () => {
        expect(player.getMimeType()).toBeUndefined()
      })

      it("Get Current Time Returns Undefined In Empty State", () => {
        expect(player.getCurrentTime()).toBeUndefined()
      })

      it("Get Seekable Range Returns Undefined In Empty State", () => {
        expect(player.getSeekableRange()).toBeUndefined()
      })

      it("Get Duration Returns Undefined In Empty State", () => {
        expect(player.getDuration()).toBeUndefined()
      })

      it("Get Source Returns Undefined In Empty State After Reset", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        metaDataCallback()
        finishedBufferingCallback()

        player.reset()

        expect(player.getSource()).toBeUndefined()
      })

      it("Get Mime Type Returns Undefined In Empty State After Reset", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        metaDataCallback()
        finishedBufferingCallback()

        player.reset()

        expect(player.getMimeType()).toBeUndefined()
      })

      it("Get Current Time Returns Undefined In Empty State After Reset", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        metaDataCallback()
        finishedBufferingCallback()

        player.reset()

        expect(player.getCurrentTime()).toBeUndefined()
      })

      it("Get Seekable Range Returns Undefined In Empty State After Reset", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        metaDataCallback()
        finishedBufferingCallback()

        player.reset()

        expect(player.getSeekableRange()).toBeUndefined()
      })

      it("Get Duration Returns Undefined In Empty State After Reset", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        metaDataCallback()
        finishedBufferingCallback()

        player.reset()

        expect(player.getDuration()).toBeUndefined()
      })

      it("Calling Begin Playback In Empty State Is An Error", () => {
        player.beginPlayback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Begin Playback From In Empty State Is An Error", () => {
        player.beginPlaybackFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Pause In Empty State Is An Error", () => {
        player.pause()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Resume In Empty State Is An Error", () => {
        player.resume()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Stop In Empty State Is An Error", () => {
        player.stop()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Initialise Media In Empty State Goes To Stopped State", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })

      it("Calling Reset In Empty State Stays In Empty State", () => {
        player.reset()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.EMPTY)
      })
    })

    describe("Stopped state tests", () => {
      beforeEach(() => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        recentEvents = []
      })

      it("Get Source Returns Correct Value In Stopped State", () => {
        expect(player.getSource()).toBe("testUrl")
      })

      it("Get Mime Type Returns Correct Value In Stopped State", () => {
        expect(player.getMimeType()).toBe("testMimeType")
      })

      it("Get Current Time Returns Undefined In Stopped State", () => {
        expect(player.getCurrentTime()).toBeUndefined()
      })

      it("Get Seekable Range Returns Undefined In Stopped State", () => {
        expect(player.getSeekableRange()).toBeUndefined()
      })

      it("Get Duration Returns Undefined In Stopped State", () => {
        expect(player.getDuration()).toBeUndefined()
      })

      it("Calling Initialise Media In Stopped State Is An Error", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Play From In Stopped State Is An Error", () => {
        player.playFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Pause In Stopped State Is An Error", () => {
        player.pause()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Resume In Stopped State Is An Error", () => {
        player.resume()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Send Meta Data In Stopped State Stays In Stopped State", () => {
        metaDataCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })

      it("Finish Buffering In Stopped State Stays In Stopped State", () => {
        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })

      it("Start Buffering In Stopped State Stays In Stopped State", () => {
        waitingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })

      it("Player Error In Stopped State Gets Reported", () => {
        mockVideoMediaElement.error = {
          code: "test",
        }

        errorCallback({ type: "testError" })

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Time Passing Does Not Cause Status Event To Be Sent In Stopped State", () => {
        mockVideoMediaElement.currentTime += 1

        expect(recentEvents).toEqual([])
      })

      it("Calling Reset In Stopped State Goes To Empty State", () => {
        player.reset()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.EMPTY)
      })

      it("Calling Begin Playback From In Stopped State Goes To Buffering State", () => {
        player.beginPlaybackFrom()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("Finish Buffering Then Begin Playback From In Stopped State Goes To Buffering", () => {
        finishedBufferingCallback()

        player.beginPlaybackFrom()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("Calling Begin Playback In Stopped State Goes To Buffering State", () => {
        player.beginPlayback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("Calling Stop In Stopped State Stays In Stopped State", () => {
        player.stop()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })
    })

    describe("Buffering state tests", () => {
      beforeEach(() => {
        jest.useFakeTimers()
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        player.beginPlaybackFrom(0)
        recentEvents = []
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it("Get Source Returns Expected Value In Buffering State", () => {
        expect(player.getSource()).toBe("testUrl")
      })

      it("Get Mime Type Returns Expected Value In Buffering State", () => {
        expect(player.getMimeType()).toBe("testMimeType")
      })

      it("Calling Initialise Media In Buffering State Is An Error", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Begin Playback In Buffering State Is An Error", () => {
        player.beginPlayback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Begin Playback From In Buffering State Is An Error", () => {
        player.beginPlaybackFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Reset In Buffering State Is An Error", () => {
        player.reset()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Send Meta Data In Buffering State Stays In Buffering State", () => {
        metaDataCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("Start Buffering In Buffering State Stays In Buffering State", () => {
        waitingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("Device Error In Buffering State Gets Reported", () => {
        mockVideoMediaElement.error = {
          code: "test",
        }

        errorCallback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Time Passing Does Not Cause Status Event To Be Sent In Buffering State", () => {
        mockVideoMediaElement.currentTime += 1
        jest.advanceTimersByTime(1200)

        // sentinel & playing events
        expect(getRecentEventTypes()).toEqual([
          MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING,
          MediaPlayerBase.EVENT.PLAYING,
        ])
      })

      it("When Buffering Finishes And No Further Api Calls Then We Go To Playing State", () => {
        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
      })

      it("When Pause Called And Buffering Finishes Then We Go To Paused State", () => {
        player.pause()

        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      })

      it("When Pause Then Resume Called Before Buffering Finishes Then We Go To Playing State", () => {
        player.pause()
        player.resume()

        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
      })

      it("When Begin Playback From Middle Of Media And Buffering Finishes Then We Go To Playing From Specified Point", () => {
        player.stop()
        player.beginPlaybackFrom(20)

        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
        expect(mockVideoMediaElement.currentTime).toBe(20)
      })

      it("Calling Stop In Buffering State Goes To Stopped State", () => {
        player.stop()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })

      it("Device Buffering Notification In Buffering State Does Not Emit Second Buffering Event", () => {
        waitingCallback()

        expect(getRecentEventTypes()).not.toContain(MediaPlayerBase.EVENT.BUFFERING)
      })
    })

    describe("Playing State Tests", () => {
      beforeEach(() => {
        jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        player.beginPlaybackFrom(0)
        finishedBufferingCallback()
        metaDataCallback()

        jest.useFakeTimers()
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it("Get Source Returns Expected Value In Playing State", () => {
        expect(player.getSource()).toBe("testUrl")
      })

      it("Get Mime Type Returns Expected Value In Playing State", () => {
        expect(player.getMimeType()).toBe("testMimeType")
      })

      it("Get Current Time Returns Expected Value In Playing State", () => {
        expect(player.getCurrentTime()).toBe(0)
      })

      it("Get Seekable Range Returns Expected Value In Playing State", () => {
        expect(player.getSeekableRange()).toEqual({ start: 0, end: 100 })
      })

      it("Get Duration Returns Expected Value In Playing State", () => {
        expect(player.getDuration()).toBe(100)
      })

      it("Calling Begin Playback In Playing State Is An Error", () => {
        player.beginPlayback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Begin Playback From In Playing State Is An Error", () => {
        player.beginPlaybackFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Initialise Media In Playing State Is An Error", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Reset In Playing State Is An Error", () => {
        player.reset()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Send Meta Data In Playing State Stays In Playing State", () => {
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

        metaDataCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
      })

      it("Finish Buffering In Playing State Stays In Playing State", () => {
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
      })

      it("Device Error In Playing State Gets Reported", () => {
        mockVideoMediaElement.error = {
          code: "test",
        }

        errorCallback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("When Call Resume While Already Playing Then Remain In Play State", () => {
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

        player.resume()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
      })

      it("When Call Play From While Playing Goes To Buffering State", () => {
        player.playFrom(90)

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("When Calling Pause While Playing Goes To Paused State", () => {
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

        player.pause()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      })

      it("When Media Finishes When Playing Then Goes To Complete State", () => {
        giveMediaElementMetaData(mockVideoMediaElement, { start: 1, end: 99 })

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

        mockVideoMediaElement.currentTime = 100
        endedCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.COMPLETE)
      })

      it("When Buffering Starts While Playing Goes To Buffering State", () => {
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

        waitingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("Get Regular Status Event When Playing", () => {
        timeupdateCallback()
        jest.advanceTimersByTime(1000)

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.STATUS)

        recentEvents = []
        timeupdateCallback()
        jest.advanceTimersByTime(1000)

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.STATUS)

        recentEvents = []
        timeupdateCallback()
        jest.advanceTimersByTime(1000)

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.STATUS)
      })

      it("Get Duration Returns Infinity With A Live Video Stream", () => {
        player.stop()
        player.reset()
        player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        player.beginPlaybackFrom(0)
        finishedBufferingCallback()
        metaDataCallback()

        const actualDurations = [0, "foo", undefined, null, Infinity, 360]
        for (let idx = 0; idx < actualDurations.length; idx++) {
          giveMediaElementMetaData(mockVideoMediaElement, { start: 0, end: actualDurations[idx] })

          expect(player.getDuration()).toEqual(Infinity)
        }
      })

      it("Get Duration Returns Infinity With A Live Audio Stream", () => {
        player.stop()
        player.reset()
        player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_AUDIO, "testUrl", "testMimeType", sourceContainer, {})
        player.beginPlaybackFrom(0)
        finishedBufferingCallback()
        metaDataCallback()

        const actualDurations = [0, "foo", undefined, null, Infinity, 360]
        for (let idx = 0; idx < actualDurations.length; idx++) {
          giveMediaElementMetaData(mockAudioMediaElement, { start: 0, end: actualDurations[idx] })

          expect(player.getDuration()).toEqual(Infinity)
        }
      })
    })

    describe("Paused state tests", () => {
      beforeEach(() => {
        jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)
        jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
          start: () => 0,
          end: () => 100,
          length: 2,
        })

        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        player.beginPlaybackFrom(0)
        finishedBufferingCallback()
        metaDataCallback()
        player.pause()

        jest.useFakeTimers()
      })

      afterEach(() => {
        jest.useRealTimers()
        recentEvents = []
      })

      it("Get Source Returns Expected Value In Paused State", () => {
        expect(player.getSource()).toBe("testUrl")
      })

      it("Get Mime Type Returns Expected Value In Paused State", () => {
        expect(player.getMimeType()).toBe("testMimeType")
      })

      it("Get Current Time Returns Expected Value In Paused State", () => {
        expect(player.getCurrentTime()).toBe(0)
      })

      it("Get Seekable Range Returns Expected Value In Paused State", () => {
        expect(player.getSeekableRange()).toEqual({ start: 0, end: 100 })
      })

      it("Get Duration Returns Expected Value In Paused State", () => {
        expect(player.getDuration()).toBe(100)
      })

      it("Calling Begin Playback In Paused State Is An Error", () => {
        player.beginPlayback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Begin Playback From In Paused State Is An Error", () => {
        player.beginPlaybackFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Initialise Media In Paused State Is An Error", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Calling Reset In Paused State Is An Error", () => {
        player.reset()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Send Meta Data In Paused State Stays In Paused State", () => {
        metaDataCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      })

      it("Finish Buffering In Paused State Stays In Paused State", () => {
        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      })

      it("Start Buffering In Paused State Stays In Paused State", () => {
        waitingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      })

      it("Device Error In Paused State Gets Reported", () => {
        mockVideoMediaElement.error = {
          code: "test",
        }

        errorCallback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
      })

      it("Time Passing Does Not Cause Status Event To Be Sent In Paused State", () => {
        jest.advanceTimersByTime(10000)

        expect(getRecentEventTypes()).not.toContain(MediaPlayerBase.EVENT.STATUS)
      })

      it("When Calling Resume While Paused Goes To Playing State", () => {
        player.resume()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
      })

      it("When Call Play From While Paused Goes To Buffering State", () => {
        player.playFrom(90)

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("When Call Pause While Already Paused Then Remain In Paused State", () => {
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)

        player.pause()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      })

      it("When Calling Stop While Paused Goes To Stopped State", () => {
        player.stop()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })
    })

    describe("Complete state tests", () => {
      beforeEach(() => {
        jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)
        jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
          start: () => 0,
          end: () => 100,
          length: 2,
        })

        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        player.beginPlaybackFrom(0)
        finishedBufferingCallback()
        metaDataCallback()
        mockVideoMediaElement.currentTime = 100
        endedCallback()

        jest.useFakeTimers()
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it("Get Source Returns Expected Value In Complete State", () => {
        expect(player.getSource()).toBe("testUrl")
      })

      it("Get Mime Type Returns Expected Value In Complete State", () => {
        expect(player.getMimeType()).toBe("testMimeType")
      })

      it("Get Seekable Range Returns Expected Value In Complete State", () => {
        expect(player.getSeekableRange()).toEqual({ start: 0, end: 100 })
      })

      it("Get Duration Returns Expected Value In Complete State", () => {
        expect(player.getDuration()).toBe(100)
      })

      it("Get Current Time Returns Expected Value In Complete State", () => {
        expect(player.getCurrentTime()).toBe(100)
      })

      it("Calling Begin Playback In Complete State Is An Error", () => {
        player.beginPlayback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Begin Playback From In Complete State Is An Error", () => {
        player.beginPlaybackFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Initialise Media From In Complete State Is An Error", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Pause From In Complete State Is An Error", () => {
        player.pause()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Resume From In Complete State Is An Error", () => {
        player.resume()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Reset From In Complete State Is An Error", () => {
        player.reset()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Send Meta Data In Complete State Stays In Complete State", () => {
        const previousState = player.getState()

        metaDataCallback()

        expect(player.getState()).toEqual(previousState)
      })

      it("Finish Buffering In Complete State Stays In Complete State", () => {
        const previousState = player.getState()

        finishedBufferingCallback()

        expect(player.getState()).toEqual(previousState)
      })

      it("Start Buffering In Complete State Stays In Complete State", () => {
        const previousState = player.getState()

        waitingCallback()

        expect(player.getState()).toEqual(previousState)
      })

      it("Time Passing Does Not Cause Status Event To Be Sent In Complete State", () => {
        timeupdateCallback()
        jest.advanceTimersByTime()

        expect(getRecentEventTypes()).not.toContain(MediaPlayerBase.EVENT.STATUS)
      })

      it("When Call Play From While Complete Goes To Buffering State", () => {
        player.playFrom(90)

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      })

      it("Calling Stop In Complete State Goes To Stopped State", () => {
        player.stop()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED)
      })
    })

    describe("Error state tests", () => {
      beforeEach(() => {
        jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)
        jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
          start: () => 0,
          end: () => 100,
          length: 2,
        })
        mockVideoMediaElement.error = {
          code: "test",
        }

        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})
        player.beginPlaybackFrom(0)
        finishedBufferingCallback()
        metaDataCallback()
        mockVideoMediaElement.currentTime = 100
        player.reset()

        recentEvents = []
        jest.useFakeTimers()
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it("Get Source Returns Undefined In Error State", () => {
        expect(player.getSource()).toBeUndefined()
      })

      it("Get Mime Type Returns Undefined In Error State", () => {
        expect(player.getMimeType()).toBeUndefined()
      })

      it("Get Seekable Range Returns Undefined In Error State", () => {
        expect(player.getSeekableRange()).toBeUndefined()
      })

      it("Get Duration Returns Undefined In Error State", () => {
        expect(player.getDuration()).toBeUndefined()
      })

      it("Get Current Time Returns Undefined In Error State", () => {
        expect(player.getCurrentTime()).toBeUndefined()
      })

      it("Calling Begin Playback In Error State Is An Error", () => {
        player.beginPlayback()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Begin Playback From In Error State Is An Error", () => {
        player.beginPlaybackFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Initialise Media In Error State Is An Error", () => {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "testUrl", "testMimeType", sourceContainer, {})

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Play From In Error State Is An Error", () => {
        player.playFrom()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Pause In Error State Is An Error", () => {
        player.pause()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Resume In Error State Is An Error", () => {
        player.resume()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Stop From In Error State Is An Error", () => {
        player.stop()

        expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })

      it("Calling Reset In Error State Goes To Empty State", () => {
        player.reset()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.EMPTY)
      })

      it("When Buffering Finishes During Error We Continue To Be In Error", () => {
        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)

        metaDataCallback()
        finishedBufferingCallback()

        expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR)
      })
    })
  })

  describe("Initialise Media", () => {
    it("Creates a video element when called with type VIDEO", () => {
      jest.clearAllMocks()
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {})

      expect(document.createElement).toHaveBeenCalledTimes(2)
      expect(document.createElement).toHaveBeenCalledWith("video", "mediaPlayerVideo")
    })

    it("Creates an audio element when called with type AUDIO", () => {
      jest.clearAllMocks()
      player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, null, null, sourceContainer, {})

      expect(document.createElement).toHaveBeenCalledTimes(2)
      expect(document.createElement).toHaveBeenCalledWith("audio", "mediaPlayerAudio")
    })

    it("Creates a video element when called with type LIVE_VIDEO", () => {
      jest.clearAllMocks()
      player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, null, null, sourceContainer, {})

      expect(document.createElement).toHaveBeenCalledTimes(2)
      expect(document.createElement).toHaveBeenCalledWith("video", "mediaPlayerVideo")
    })

    it("Creates an audio element when called with type LIVE_AUDIO", () => {
      jest.clearAllMocks()
      player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_AUDIO, null, null, sourceContainer, {})

      expect(document.createElement).toHaveBeenCalledTimes(2)
      expect(document.createElement).toHaveBeenCalledWith("audio", "mediaPlayerAudio")
    })

    it("The created video element is passed into the source container", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {})

      expect(sourceContainer.firstChild).toBe(mockVideoMediaElement)
    })

    it("The Audio element is passed into the source container", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, null, null, sourceContainer, {})

      expect(sourceContainer.firstChild).toBe(mockAudioMediaElement)
    })

    it("Source url is present on the source element", () => {
      const url = "http://url/"

      jest.spyOn(mockVideoMediaElement, "appendChild")

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, url, null, sourceContainer, {})

      expect(mockVideoMediaElement.appendChild).toHaveBeenCalledWith(mockSourceElement)
      expect(mockVideoMediaElement.firstChild.src).toBe(url)
    })
  })

  describe("Reset and Stop", () => {
    afterEach(() => {
      delete window.bigscreenPlayer.overrides
    })

    it("Video is removed from the DOM", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {})

      expect(sourceContainer.firstChild).toBe(mockVideoMediaElement)

      player.reset()

      expect(sourceContainer.firstChild).not.toBe(mockVideoMediaElement)
    })

    it("Audio is removed from the DOM", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, null, null, sourceContainer, {})

      expect(sourceContainer.firstChild).toBe(mockAudioMediaElement)

      player.reset()

      expect(sourceContainer.firstChild).not.toBe(mockAudioMediaElement)
    })

    it("Source element is removed from the media element", () => {
      jest.spyOn(mockVideoMediaElement, "removeChild")

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {})

      player.reset()

      expect(mockVideoMediaElement.removeChild).toHaveBeenCalledWith(mockSourceElement)
    })

    it("Reset Unloads Media Element Source As Per Guidelines", () => {
      // Guidelines in HTML5 video spec, section 4.8.10.15:
      // http://www.w3.org/TR/2011/WD-html5-20110405/video.html#best-practices-for-authors-using-media-elements

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      mockVideoMediaElement.load.mockClear()
      jest.spyOn(mockVideoMediaElement, "removeAttribute").mockImplementation(() => {})

      player.reset()

      expect(mockVideoMediaElement.removeAttribute).toHaveBeenCalledWith("src")
      expect(mockVideoMediaElement.removeAttribute).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.load).toHaveBeenCalledTimes(1)
    })

    it("should not Unload Media Element Source if disabled", () => {
      window.bigscreenPlayer.overrides = {
        disableMediaSourceUnload: true,
      }

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      mockVideoMediaElement.load.mockClear()
      jest.spyOn(mockVideoMediaElement, "removeAttribute").mockImplementation(() => {})

      player.reset()

      expect(mockVideoMediaElement.removeAttribute).toHaveBeenCalledTimes(0)
      expect(mockVideoMediaElement.load).toHaveBeenCalledTimes(0)
    })

    it("Calling Stop In Stopped State Does Not Call Pause On The Device", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.stop()

      expect(mockVideoMediaElement.pause).not.toHaveBeenCalled()
    })
  })

  describe("seekable range", () => {
    it("If duration and seekable range is missing get seekable range returns undefined and logs a warning", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      metaDataCallback()
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue()
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue()

      player.beginPlayback()

      expect(player.getSeekableRange()).toBeUndefined()
    })

    it("Seekable Range Takes Precedence Over Duration On Media Element", () => {
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(60)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)
      finishedBufferingCallback()

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 30,
        length: 2,
      })

      metaDataCallback({ start: 10, end: 30 })

      expect(player.getSeekableRange()).toEqual({ start: 10, end: 30 })
      expect(mockVideoMediaElement.duration).toBe(60)
    })

    it("Seekable Is Not Used Until Metadata Is Set", () => {
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue()

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlayback()

      expect(player.getSeekableRange()).toBeUndefined()

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 30,
        length: 2,
      })

      metaDataCallback()

      expect(player.getSeekableRange()).toEqual({ start: 10, end: 30 })
    })

    it("Get Seekable Range Gets End Time From Duration When No Seekable Property", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue()
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(60)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlayback()
      metaDataCallback({ start: 0, end: 30 })

      expect(player.getSeekableRange()).toEqual({ start: 0, end: 60 })
    })

    it("Get Seekable Range Gets End Time From First Time Range In Seekable Property", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 30,
        length: 2,
      })
      metaDataCallback({ start: 10, end: 30 })

      expect(player.getSeekableRange()).toEqual({ start: 10, end: 30 })
    })
  })

  describe("Media Element", () => {
    it("Video Element Is Full Screen", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(mockVideoMediaElement.style.position).toBe("absolute")
      expect(mockVideoMediaElement.style.top).toBe("0px")
      expect(mockVideoMediaElement.style.left).toBe("0px")
      expect(mockVideoMediaElement.style.width).toBe("100%")
      expect(mockVideoMediaElement.style.height).toBe("100%")
      expect(mockVideoMediaElement.style.zIndex).toBe("")
    })

    it("Autoplay Is Turned Off On Media Element Creation", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(mockVideoMediaElement.autoplay).toBe(false)
    })

    it("Error Event From Media Element Causes Error Log With Code And Error Message In Event", () => {
      mockVideoMediaElement.error = {
        code: 1,
        message: "This is a test error",
      }

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      errorCallback()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)

      const expectedArray = [expect.objectContaining(mockVideoMediaElement.error)]
      expect(recentEvents).toEqual(expect.arrayContaining(expectedArray))
    })

    it("Error Event From Source Element Causes Error Log And Error Message In Event", () => {
      let sourceError

      jest.spyOn(mockSourceElement, "addEventListener").mockImplementation((name, methodCall) => {
        if (name === "error") {
          sourceError = methodCall
        }
      })

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      sourceError()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.ERROR)
    })

    it("Pause Passed Through To Media Element When In Playing State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      metaDataCallback({})

      player.beginPlayback()
      player.pause()

      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Pause Not Passed From Media Element To Media Player On User Pause From Buffering", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      // We dont fire the metadata ready callback so it stays in the buffering state
      player.beginPlayback()

      mockVideoMediaElement.pause()

      expect(player.toPaused).toHaveBeenCalledTimes(0)
    })

    it("Pause Not Passed From Media Element To Media Player On User Pause From Playing", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      metaDataCallback({})

      player.beginPlayback()

      mockVideoMediaElement.pause()

      expect(player.toPaused).toHaveBeenCalledTimes(0)
    })

    it("Pause Not Passed From Media Element To Media Player On Stop", () => {
      // Initialise media terminates in the stopped state
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      mockVideoMediaElement.pause()

      expect(player.toPaused).toHaveBeenCalledTimes(0)
    })

    it("Play Called On Media Element When Resume In Paused State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)
      player.pause()

      metaDataCallback({})
      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      mockVideoMediaElement.play.mockClear()

      player.resume()

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
    })

    it("Play Called On Media Element When Resume In Buffering State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)
      player.pause()

      metaDataCallback({})

      mockVideoMediaElement.play.mockClear()

      player.resume()

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
    })

    it("Play Not Called On Media Element When Resume In Buffering State Before Metadata", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)
      player.pause()

      mockVideoMediaElement.play.mockClear()

      player.resume()

      expect(mockVideoMediaElement.play).not.toHaveBeenCalled()
    })

    it("Pause Passed Through To Media Element When In Buffered State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)
      player.pause()

      metaDataCallback({})

      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Load Called On Media Element When Initialise Media Is Called", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(mockVideoMediaElement.load).toHaveBeenCalledTimes(1)
    })

    it("Media Element Preload Attribute Is Set To Auto", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(mockVideoMediaElement.preload).toBe("auto")
    })

    it("Play From Sets Current Time And Calls Play On Media Element When In Playing State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({})
      finishedBufferingCallback()

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.currentTime).toBe(0)

      mockVideoMediaElement.play.mockClear()

      player.playFrom(10)

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.currentTime).toBe(10)
    })

    it("Get Player Element Returns Video Element For Video", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(player.getPlayerElement()).toEqual(mockVideoMediaElement)
    })

    it("Get Player Element Returns Audio Element For Audio", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, "http://url/", "video/mp4", sourceContainer, {})

      expect(player.getPlayerElement()).toEqual(mockAudioMediaElement)
    })
  })

  describe("Time features", () => {
    beforeEach(() => {
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)
      mockVideoMediaElement.play.mockClear()
    })

    it("Play From Clamps When Called In Playing State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({})
      finishedBufferingCallback()

      player.playFrom(110)

      expect(mockVideoMediaElement.currentTime).toBe(98.9)
    })

    it("Play From Sets Current Time And Calls Play On Media Element When In Complete State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      finishedBufferingCallback()
      metaDataCallback()

      mockVideoMediaElement.play.mockClear()

      player.playFrom(10)

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.currentTime).toBe(10)
    })

    it("Play From Sets Current Time And Calls Play On Media Element When In Paused State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback()
      finishedBufferingCallback()

      player.pause()

      mockVideoMediaElement.play.mockClear()

      player.playFrom(10)

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.currentTime).toBe(10)
    })

    it("Begin Playback From After Metadata", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      metaDataCallback()

      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
      expect(mockVideoMediaElement.currentTime).toBe(50)
      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
    })

    it("Get Duration Returns Undefined Before Metadata Is Set", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      expect(player.getDuration()).toBeUndefined()

      metaDataCallback()

      expect(player.getDuration()).toBe(100)
    })

    it("Get Duration Returns Device Duration With An On Demand Audio Stream", () => {
      jest.spyOn(mockAudioMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlayback()

      metaDataCallback()

      expect(player.getDuration()).toBe(100)
    })
  })

  describe("Current Time", () => {
    it("Play From Sets Current Time And Calls Play On Media Element When In Stopped State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(50)

      expect(mockVideoMediaElement.play).not.toHaveBeenCalled()
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)

      mockVideoMediaElement.play.mockClear()
      metaDataCallback({ start: 0, end: 100 })

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      expect(mockVideoMediaElement.currentTime).toBe(50)

      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("Begin Playback From Sets Current Time And Calls Play On Media Element When In Stopped State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(10)
      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.currentTime).toBe(10)
    })

    it("Play From Clamps When Called In Stopped State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(110)

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 100,
        length: 2,
      })
      metaDataCallback()

      expect(mockVideoMediaElement.currentTime).toBe(98.9)
    })

    it("Play From Then Pause Sets Current Time And Calls Pause On Media Element When In Stopped State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(50)
      player.pause()

      expect(mockVideoMediaElement.pause).not.toHaveBeenCalled()
      expect(mockVideoMediaElement.play).not.toHaveBeenCalled()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 100,
        length: 2,
      })

      metaDataCallback()

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
      expect(mockVideoMediaElement.currentTime).toBe(50)

      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
    })

    it("Play From Zero Then Pause Defers Call To Pause On Media Element When In Stopped State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)
      player.pause()

      expect(mockVideoMediaElement.pause).not.toHaveBeenCalled()
    })

    it("Play From Defers Setting Current Time And Calling Play On Media Element Until We Have Metadata", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)
      player.playFrom(10)

      expect(mockVideoMediaElement.play).not.toHaveBeenCalled()

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 100,
        length: 2,
      })

      metaDataCallback()

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.currentTime).toBe(10)
    })

    it("Play From Clamps When Called In Buffering State And Dont Have Metadata", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)
      player.playFrom(110)

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 100,
        length: 2,
      })
      metaDataCallback()

      finishedBufferingCallback()

      expect(mockVideoMediaElement.currentTime).toBe(98.9)
    })

    it("Play From Sets Current Time And Calls Play On Media Element When In Buffering State And Has Metadata", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 100,
        length: 2,
      })
      metaDataCallback()

      mockVideoMediaElement.play.mockClear()

      player.playFrom(10)

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(mockVideoMediaElement.currentTime).toBe(10)
    })

    it("Play From Clamps When Called In Buffering State And Has Metadata", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)

      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 10,
        end: () => 100,
        length: 2,
      })
      metaDataCallback()

      player.playFrom(110)
      finishedBufferingCallback()

      expect(mockVideoMediaElement.currentTime).toBe(98.9)
    })

    it("Play From Current Time When Playing Goes To Buffering Then To Playing", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)
      metaDataCallback()
      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

      waitingCallback()

      mockVideoMediaElement.currentTime = 20

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)

      player.playFrom(30)
      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("Play From Just Before Current Time When Playing Goes To Buffering Then To Playing", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)
      metaDataCallback()
      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)

      waitingCallback()

      mockVideoMediaElement.currentTime = 50.999

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)

      player.playFrom(50)
      finishedBufferingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("Begin Playback From Current Time When Played Then Stopped Goes To Buffering Then To Playing", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      metaDataCallback()

      player.beginPlaybackFrom(50)

      expect(mockVideoMediaElement.currentTime).toBe(50)

      player.stop()

      mockVideoMediaElement.play.mockClear()

      player.beginPlaybackFrom(50)

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)

      finishedBufferingCallback()
      mockVideoMediaElement.play()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("Play From Current Time When Paused Goes To Buffering Then To Playing", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback()
      finishedBufferingCallback()

      mockVideoMediaElement.play.mockClear()
      mockVideoMediaElement.currentTime = 50

      player.pause()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)

      player.playFrom(50)

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1)

      finishedBufferingCallback()
      mockVideoMediaElement.play()

      expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(2)
      expect(player.getState()).toEqual(MediaPlayerBase.EVENT.PLAYING.toUpperCase())
    })

    it("Begin Playback From Sets Current Time After Finish Buffering But No Metadata", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(50)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Play From Near Current Time Will Not Cause Finish Buffering To Perform Seek Later", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback()
      player.beginPlaybackFrom(0)

      mockVideoMediaElement.currentTime = 50
      player.playFrom(50.999)

      mockVideoMediaElement.currentTime = 70
      finishedBufferingCallback()

      expect(mockVideoMediaElement.currentTime).toBe(70)
    })
  })

  describe("Playback Rate", () => {
    it("sets the playback rate on the media element", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.setPlaybackRate(2)

      expect(mockVideoMediaElement.playbackRate).toBe(2)
    })

    it("gets the playback rate on the media element", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      const testRate = 1.5
      player.setPlaybackRate(testRate)

      const rate = player.getPlaybackRate()

      expect(rate).toEqual(testRate)
    })
  })

  describe("Media Element Stop", () => {
    it("Stop When In Buffering State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)
      player.stop()

      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Stop When In Playing State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback()
      finishedBufferingCallback()

      player.stop()

      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Stop When In Complete State", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback()
      finishedBufferingCallback()

      endedCallback()
      player.stop()

      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Reset Remove All Event Listeners From The Media Element", () => {
      const listeners = [
        "canplay",
        "seeked",
        "playing",
        "error",
        "ended",
        "waiting",
        "timeupdate",
        "loadedMetaData",
        "pause",
      ]

      jest.spyOn(mockVideoMediaElement, "removeEventListener").mockImplementation(() => {})
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.reset()

      expect(mockVideoMediaElement.removeEventListener).toHaveBeenCalledTimes(listeners.length)
    })

    it("Remove all event callbacks works correctly", () => {
      function playAndEmitAfterRemoveAllCallbacks() {
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
        player.beginPlaybackFrom(0)
        player.removeAllEventCallbacks()
        endedCallback()
      }

      expect(playAndEmitAfterRemoveAllCallbacks).not.toThrow()
    })
  })

  describe("Events", () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
      delete window.bigscreenPlayer.overrides
    })

    it("Waiting Html5 Event While Buffering Only Gives Single Buffering Event", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      player.beginPlaybackFrom(0)
      waitingCallback()

      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
    })

    it("Seek Attempted Event Emitted On Initialise Media If The State Is Empty", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)
    })

    it("Seek Finished Event Emitted On Status Update When Time is Within Sentinel Threshold And The State is Playing", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)

      player.beginPlaybackFrom(0)
      waitingCallback()
      playingCallback()

      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
    })

    it("Seek Finished Event Is Emitted Only Once", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)

      player.beginPlaybackFrom(0)
      waitingCallback()
      playingCallback()

      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
      recentEvents = []
      timeupdateCallback()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
    })

    it("Seek Finished Event Is Emitted After restartTimeout When Enabled", () => {
      window.bigscreenPlayer.overrides = {
        restartTimeout: 10000,
      }

      createPlayer()

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED)

      player.beginPlaybackFrom(0)
      waitingCallback()
      playingCallback()

      // Needs to be triggered 6 times to set emitSeekFinishedAtCorrectStartingPoint counter to 5.
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()
      timeupdateCallback()

      jest.advanceTimersByTime(10000)

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)

      jest.advanceTimersByTime(1100)
      timeupdateCallback()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED)
    })
  })

  describe("Sentinels", () => {
    function waitForSentinels() {
      jest.advanceTimersByTime(1100)
    }

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("Enter Buffering Sentinel Causes Transition To Buffering When Playback Halts For More Than One Sentinel Iteration Since State Changed", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime += 1
      mockVideoMediaElement.currentTime += 1

      recentEvents = []
      waitForSentinels()
      waitForSentinels()
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.BUFFERING)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
    })

    it("Enter Buffering Sentinel Not Fired When Sentinels Disabled", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: true,
      })
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime += 1
      mockVideoMediaElement.currentTime += 1

      recentEvents = []
      waitForSentinels()
      waitForSentinels()
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("No Sentinels Activate When Current Time Runs Normally Then Jumps Backwards", () => {
      const INITIAL_TIME = 30
      const SEEK_SENTINEL_TOLERANCE = 15
      const AFTER_JUMP_TIME = INITIAL_TIME - (SEEK_SENTINEL_TOLERANCE + 5)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: true,
      })
      player.beginPlaybackFrom(INITIAL_TIME)

      metaDataCallback()
      finishedBufferingCallback()

      recentEvents = []

      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      mockVideoMediaElement.currentTime = AFTER_JUMP_TIME
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("No Sentinels Activate When Current Time Runs Normally Then Jumps Backwards Near End Of Media", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(95)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      recentEvents = []

      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      mockVideoMediaElement.currentTime = 100
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("Pause Sentinel Activates When Current Time Runs Normally Then Jumps Backwards When Paused", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(10)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      player.pause()
      recentEvents = []

      mockVideoMediaElement.currentTime = 0
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
    })

    it("Enter Buffering Sentinel Does Not Activate When Playback Halts When Only One Sentinel Iteration Since State Changed", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(10)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime += 1

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
    })

    it("Enter Buffering Sentinel Does Nothing When Playback Is Working", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(10)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime += 1
      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("Enter Buffering Sentinel Does Nothing When Device Reports Buffering Correctly", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(10)

      waitingCallback()

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
    })

    it("Enter Buffering Sentinel Does Nothing When Device Is Paused", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(10)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime += 1

      player.pause()

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
    })
    function ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted() {
      for (let idx = 0; idx < 3; idx++) {
        mockVideoMediaElement.currentTime += 1
        waitForSentinels()
      }

      for (let idx = 0; idx < 2; idx++) {
        mockVideoMediaElement.currentTime = 0
        waitForSentinels()
      }

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    }

    function ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted() {
      for (let idx = 0; idx < 2; idx++) {
        mockVideoMediaElement.currentTime = 0
        waitForSentinels()
      }

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
    }

    function ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance() {
      for (let idx = 0; idx < 3; idx++) {
        mockVideoMediaElement.currentTime += 1
        waitForSentinels()
      }

      for (let idx = 0; idx < 2; idx++) {
        mockVideoMediaElement.currentTime = 0
        waitForSentinels()
      }

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)

      mockVideoMediaElement.currentTime = 0.01
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
    }

    it("Enter Buffering Sentinel Does Nothing When Device Time Is Reported As Zero During Playback", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(10)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      recentEvents = []
      ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted()
    })

    it("Enter Buffering Sentinel Does Nothing When Begin Playback Is Called And Device Time Is Reported As Zero For At Least Two Intervals", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(20)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      recentEvents = []
      ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted()
    })

    it("Enter Buffering Sentinel Fires When Begin Playback From Zero Is Called And Device Time Does Not Advance", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      recentEvents = []
      ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted()
    })

    it("Enter Buffering Sentinel Fires When Begin Playback Is Called And Device Time Does Not Advance", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      recentEvents = []
      ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted()
    })

    it("Enter Buffering Sentinel Fires When Seeked To Zero And Device Time Is Reported As Zero For At Least Two Intervals", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(20)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      recentEvents = []

      player.playFrom(0)
      finishedBufferingCallback()
      waitForSentinels()
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
    })

    it("Enter Buffering Sentinel Only Fires On Second Attempt When Device Reports Time As Not Changing Within Tolerance", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()
      recentEvents = []

      ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)

      mockVideoMediaElement.currentTime = 0.01
      waitForSentinels()

      mockVideoMediaElement.currentTime = 0.01
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING)
    })

    it("Enter Buffering Sentinel Does Not Fire On Two Non Consecutive Occurrences Of Device Reporting Time As Not Changing Within Tolerance", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()
      recentEvents = []

      ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance()
      ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance()
    })

    it("Exit Buffering Sentinel Causes Transition To Playing When Playback Starts", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })

      mockVideoMediaElement.currentTime += 1
      recentEvents = []
      waitForSentinels()

      expect(getRecentEventTypes()).toEqual([
        MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING,
        MediaPlayerBase.EVENT.PLAYING,
      ])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("Exit Buffering Sentinel Not Fired When Sentinels Disabled", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: true,
      })
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })

      mockVideoMediaElement.currentTime += 1

      recentEvents = []
      waitForSentinels()

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING)
    })

    it("Exit Buffering Sentinel Causes Transition To Paused When Device Reports Paused", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      metaDataCallback({ start: 0, end: 100 })

      player.pause()

      recentEvents = []
      jest.spyOn(mockVideoMediaElement, "paused", "get").mockReturnValue(true)
      waitForSentinels()

      expect(getRecentEventTypes()).toEqual([
        MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING,
        MediaPlayerBase.EVENT.PAUSED,
      ])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
    })

    it("Exit Buffering Sentinel Is Not Fired When Device Is Paused And Metadata Has Been Not Been Loaded", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(0)

      // Meta Data is not loaded at this point
      jest.spyOn(mockVideoMediaElement, "paused", "get").mockReturnValue(true)
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING)
    })

    it("Seek Sentinel Sets Current Time", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(50)

      metaDataCallback()
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0

      recentEvents = []
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Seek Sentinel Sets Current Time Not Fired When Sentinels Disabled", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: true,
      })
      player.beginPlaybackFrom(50)

      metaDataCallback({ start: 0, end: 100 })
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(mockVideoMediaElement.currentTime).toBe(0)
    })

    it("Seek Sentinel Clamps Target Seek Time When Required", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      player.beginPlaybackFrom(110)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0

      recentEvents = []
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(98.9)
    })

    it("Seek Sentinel Does Not Reseek To Initial Seek Time After 15s", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(10)
      finishedBufferingCallback()

      recentEvents = []
      for (let idx = 0; idx < 20; idx++) {
        mockVideoMediaElement.currentTime += 1
        waitForSentinels()
      }

      expect(recentEvents).toEqual([])
      expect(mockVideoMediaElement.currentTime).toBe(30)
    })

    it("Seek Sentinel Does Not Reseek To Initial Seek Time After15s When Playback Leaves Seekable Range", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback()

      player.beginPlaybackFrom(95)
      finishedBufferingCallback()

      recentEvents = []
      for (let idx = 0; idx < 20; idx++) {
        mockVideoMediaElement.currentTime += 1
        waitForSentinels()
      }

      expect(recentEvents).toEqual([])
      expect(mockVideoMediaElement.currentTime).toBe(115)
    })

    it("Seek Sentinel Sets Current Time When Paused", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      player.pause()
      mockVideoMediaElement.currentTime = 0

      recentEvents = []
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Seek Sentinel Does Not Seek When Begin Playback Called", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(0)
      finishedBufferingCallback()

      recentEvents = []
      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(mockVideoMediaElement.currentTime).toBe(1)
    })

    it("Seek Sentinel Does Not Seek When Begin Playback Starts Playing Half Way Through Media", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      recentEvents = []
      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(mockVideoMediaElement.currentTime).toBe(51)
    })

    it("Seek Sentinel Does Not Seek When Begin Playback After Previously Seeking", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      player.stop()
      player.beginPlayback()
      mockVideoMediaElement.currentTime = 0
      finishedBufferingCallback()

      recentEvents = []
      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(mockVideoMediaElement.currentTime).toBe(1)
    })

    it("Seek Sentinel Activates When Device Reports New Position Then Reverts To Old Position", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      waitForSentinels()
      mockVideoMediaElement.currentTime = 0

      recentEvents = []
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Seek Sentinel Does Not Fire In Live When Device Jumps Back Less Than Thirty Seconds", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(29.9)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
    })

    it("Seek Sentinel Fires In Live When Device Jumps Back More Than Thirty Seconds", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback({ start: 0, end: 100 })

      player.beginPlaybackFrom(30.1)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0

      recentEvents = []
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
    })

    it("Pause Sentinel Retries Pause If Pause Fails", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback()

      player.beginPlaybackFrom(0)
      finishedBufferingCallback()
      player.pause()

      mockVideoMediaElement.currentTime += 1
      recentEvents = []
      mockVideoMediaElement.pause.mockClear()
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
    })

    it("Pause Sentinel Not Fired When Sentinels Disabled", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: true,
      })
      metaDataCallback()

      player.beginPlaybackFrom(0)
      finishedBufferingCallback()
      player.pause()

      mockVideoMediaElement.currentTime += 1
      recentEvents = []
      mockVideoMediaElement.pause.mockClear()
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(mockVideoMediaElement.pause).not.toHaveBeenCalled()
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
    })

    it("Pause Sentinel Does Not Retry Pause If Pause Succeeds", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })
      metaDataCallback()

      player.beginPlaybackFrom(0)
      finishedBufferingCallback()
      player.pause()

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
    })

    it("End Of Media Sentinel Goes To Complete If Time Is Not Advancing And No Complete Event Fired", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback()
      player.beginPlaybackFrom(98)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 99
      waitForSentinels()

      mockVideoMediaElement.currentTime = 100
      waitForSentinels()

      recentEvents = []
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE, MediaPlayerBase.EVENT.COMPLETE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.COMPLETE)
    })

    it("End Of Media Sentinel Not Fired When Sentinels Disabled", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: true,
      })

      metaDataCallback()
      player.beginPlaybackFrom(98)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 99
      waitForSentinels()

      mockVideoMediaElement.currentTime = 100
      waitForSentinels()

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE, MediaPlayerBase.EVENT.COMPLETE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING)
    })

    it("EndOf Media Sentinel Does Not Activate If Time Is Not Advancing When Outside A Second Of End And No Complete Event Fired", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(98)
      finishedBufferingCallback()

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE)
      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.COMPLETE)
    })

    it("End Of Media Sentinel Does Not Activate If Time Is Not Advancing When Outside Seekable Range But Within Duration", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(98)
      finishedBufferingCallback()
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(150)

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE)
      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.COMPLETE)
    })

    it("End Of Media Sentinel Does Not Activate If Reach End Of Media Normally", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(100)
      finishedBufferingCallback()
      endedCallback()

      recentEvents = []
      waitForSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.COMPLETE)
    })

    it("End Of Media Sentinel Does Not Activate If Time Is Advancing Near End Of Media And No Complete Event Fired", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(100)
      finishedBufferingCallback()

      recentEvents = []
      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE)
      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.COMPLETE)
    })

    it("Only One Sentinel Fired At A Time When Both Seek And Pause Sentinels Are Needed", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(0)
      player.playFrom(30)

      mockVideoMediaElement.currentTime = 0
      finishedBufferingCallback()
      player.pause()

      recentEvents = []
      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)

      recentEvents = []
      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
    })

    function resetStubsThenAdvanceTimeThenRunSentinels() {
      recentEvents = []
      mockVideoMediaElement.pause.mockClear()
      mockVideoMediaElement.currentTime += 1
      waitForSentinels()
    }

    it("Pause Sentinel Retries Pause Twice", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(0)
      finishedBufferingCallback()
      player.pause()

      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)

      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Pause Sentinel Emits Failure Event And Gives Up On Third Attempt", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(0)
      finishedBufferingCallback()
      player.pause()

      resetStubsThenAdvanceTimeThenRunSentinels()
      resetStubsThenAdvanceTimeThenRunSentinels()
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      expect(mockVideoMediaElement.pause).not.toHaveBeenCalled()

      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(recentEvents).toEqual([])
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      expect(mockVideoMediaElement.pause).not.toHaveBeenCalled()
    })

    it("Pause Sentinel Attempt Count Is Not Reset By Calling Pause When Already Paused", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(0)
      finishedBufferingCallback()

      player.pause()
      resetStubsThenAdvanceTimeThenRunSentinels()
      player.pause()

      resetStubsThenAdvanceTimeThenRunSentinels()
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      expect(mockVideoMediaElement.pause).not.toHaveBeenCalled()
    })

    it("Pause Sentinel Attempt Count Is Reset By Calling Pause When Not Paused", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(0)
      finishedBufferingCallback()
      player.pause()

      resetStubsThenAdvanceTimeThenRunSentinels()
      resetStubsThenAdvanceTimeThenRunSentinels()

      player.resume()
      player.pause()

      resetStubsThenAdvanceTimeThenRunSentinels()
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)
      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Seek Sentinel Retries Seek Twice", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(50)

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Seek Sentinel Emits Failure Event And Gives Up On Third Attempt When Device Does Not Enter Buffering Upon Seek", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE)
      expect(mockVideoMediaElement.currentTime).toBe(1)

      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE)
      expect(mockVideoMediaElement.currentTime).toBe(2)
    })

    it("Seek Sentinel Giving Up Does Not Prevent Pause Sentinel Activation", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(50)
      finishedBufferingCallback()

      player.pause()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()
      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED)

      mockVideoMediaElement.currentTime = 0
      mockVideoMediaElement.currentTime += 1
      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)

      mockVideoMediaElement.currentTime = 0
      mockVideoMediaElement.currentTime += 1
      mockVideoMediaElement.currentTime += 1
      resetStubsThenAdvanceTimeThenRunSentinels()

      // Ensure that pause has a second attempt (rather than seek returning, etc)
      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
      expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1)
    })

    it("Seek Sentinel Attempt Count Is Reset By Calling Play From", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(0)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()
      mockVideoMediaElement.currentTime = 0

      player.playFrom(50)
      finishedBufferingCallback()
      mockVideoMediaElement.currentTime = 0

      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Seek Sentinel Attempt Count Is Reset By Calling Begin Playback From", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(0)
      finishedBufferingCallback()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()

      mockVideoMediaElement.currentTime = 0
      resetStubsThenAdvanceTimeThenRunSentinels()
      mockVideoMediaElement.currentTime = 0

      player.stop()
      player.beginPlaybackFrom(50)
      finishedBufferingCallback()
      mockVideoMediaElement.currentTime = 0

      resetStubsThenAdvanceTimeThenRunSentinels()

      expect(getRecentEventTypes()).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK)
      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Exit Buffering Sentinel Performs Deferred Seek If No Loaded Metadata Event", () => {
      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {})
      player.beginPlaybackFrom(50)

      mockVideoMediaElement.currentTime += 1
      waitForSentinels()

      expect(mockVideoMediaElement.currentTime).toBe(50)
    })

    it("Pause Sentinel Does Not Fire When Device Time Advances By Less Than Sentinel Tolerance", () => {
      jest.spyOn(mockVideoMediaElement, "seekable", "get").mockReturnValue({
        start: () => 0,
        end: () => 100,
        length: 2,
      })
      jest.spyOn(mockVideoMediaElement, "duration", "get").mockReturnValue(100)

      player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, "http://url/", "video/mp4", sourceContainer, {
        disableSentinels: false,
      })

      metaDataCallback({ start: 0, end: 100 })
      player.beginPlaybackFrom(20)
      finishedBufferingCallback()

      recentEvents = []

      player.pause()
      mockVideoMediaElement.currentTime += 0.01
      waitForSentinels()

      expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE)
    })
  })
})
