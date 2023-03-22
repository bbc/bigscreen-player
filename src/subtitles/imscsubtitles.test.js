import IMSCSubtitles from "./imscsubtitles"
import { fromXML, generateISD, renderHTML } from "smp-imsc"
import LoadUrl from "../utils/loadurl"
import Plugins from "../plugins"

jest.mock("smp-imsc")
jest.mock("../utils/loadurl")

jest.mock("../plugins", () => {
  return {
    interface: {
      onSubtitlesTimeout: jest.fn(),
      onSubtitlesXMLError: jest.fn(),
      onSubtitlesRenderError: jest.fn(),
      onSubtitlesTransformError: jest.fn(),
    },
  }
})

describe("IMSC Subtitles", () => {
  let mockParentElement
  let fromXmlReturn
  let mediaPlayer
  let subtitles
  let mockMediaSources
  let subtitlesUrl
  let subtitlesCdn
  let segmentLength
  let epochStartTimeMilliseconds
  let avalailableSourceCount

  const LoadUrlStubResponseXml = "<?xml>"
  let LoadUrlStubResponseText

  function msToS(timeMs) {
    return timeMs / 1000
  }

  beforeEach(() => {
    subtitlesUrl = "http://stub-subtitles.test"
    subtitlesCdn = "supplier1"
    LoadUrlStubResponseText = '<?xml version="1.0" encoding="utf-8"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>'
    segmentLength = undefined
    epochStartTimeMilliseconds = undefined

    mediaPlayer = {
      getCurrentTime: jest.fn(),
    }

    mockMediaSources = {
      currentSubtitlesSource: jest.fn(),
      failoverSubtitles: jest.fn(),
      currentSubtitlesSegmentLength: jest.fn(),
      currentSubtitlesCdn: jest.fn(),
      subtitlesRequestTimeout: jest.fn(),
      time: jest.fn(),
    }

    mockMediaSources.currentSubtitlesSource.mockImplementation(() => {
      return subtitlesUrl
    })
    mockMediaSources.failoverSubtitles.mockImplementation((postFailoverAction, failoverErrorAction) => {
      if (avalailableSourceCount > 1) {
        avalailableSourceCount--
        postFailoverAction()
      } else {
        failoverErrorAction()
      }
    })

    mockMediaSources.currentSubtitlesSegmentLength.mockImplementation(() => {
      return segmentLength
    })
    mockMediaSources.currentSubtitlesCdn.mockImplementation(() => {
      return subtitlesCdn
    })
    mockMediaSources.time.mockImplementation(() => {
      return {
        windowStartTime: epochStartTimeMilliseconds,
      }
    })

    jest.useFakeTimers()

    fromXmlReturn = {
      getMediaTimeEvents: () => {
        return [1, 3, 8]
      },
      head: {
        styling: {},
      },
      body: {
        contents: [],
      },
    }

    renderHTML.mockImplementation(jest.fn())
    generateISD.mockReturnValue({ contents: ["mockContents"] })
    fromXML.mockReturnValue(fromXmlReturn)

    LoadUrl.mockImplementation((url, callbackObject) => {
      callbackObject.onLoad(LoadUrlStubResponseXml, LoadUrlStubResponseText, 200)
    })

    mockParentElement = document.createElement("div")
    jest.spyOn(mockParentElement, "clientWidth", "get").mockReturnValue(200)
    jest.spyOn(mockParentElement, "clientHeight", "get").mockReturnValue(100)

    document.body.appendChild(mockParentElement)
  })

  afterEach(() => {
    jest.useRealTimers()
    LoadUrl.mockReset()
    fromXML.mockReset()
    generateISD.mockReset()
    renderHTML.mockReset()
    Plugins.interface.onSubtitlesRenderError.mockReset()
    document.body.removeChild(mockParentElement)
  })

  function progressTime(mediaPlayerTime) {
    mediaPlayer.getCurrentTime.mockReturnValue(mediaPlayerTime)
    jest.advanceTimersByTime(751)
  }

  describe("construction", () => {
    afterEach(() => {
      subtitles.stop()
    })

    it("is constructed with the correct interface", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      expect(subtitles).toEqual(
        expect.objectContaining({
          start: expect.any(Function),
          stop: expect.any(Function),
          updatePosition: expect.any(Function),
          tearDown: expect.any(Function),
        })
      )
    })

    it("autoplay argument starts the update loop", () => {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})
      progressTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })
  })

  describe("customisation", () => {
    it("overrides the subtitles styling metadata with supplied defaults when rendering", () => {
      const styleOpts = { backgroundColour: "black", fontFamily: "Arial" }
      const expectedOpts = { spanBackgroundColorAdjust: { transparent: "black" }, fontFamily: "Arial" }
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, styleOpts)

      subtitles.start()
      progressTime(9)

      expect(renderHTML).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(HTMLDivElement),
        null,
        100,
        200,
        false,
        null,
        null,
        false,
        expectedOpts
      )
    })

    it("overrides the subtitles styling metadata with supplied custom styles when rendering", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      const styleOpts = { size: 0.7, lineHeight: 0.9 }
      const expectedOpts = { sizeAdjust: 0.7, lineHeightAdjust: 0.9 }

      mediaPlayer.getCurrentTime.mockReturnValue(1)

      subtitles.start()
      subtitles.customise(styleOpts, true)

      expect(renderHTML).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(HTMLDivElement),
        null,
        100,
        200,
        false,
        null,
        null,
        false,
        expectedOpts
      )
    })

    it("merges the current subtitles styling metadata with new supplied custom styles when rendering", () => {
      const defaultStyleOpts = { backgroundColour: "black", fontFamily: "Arial" }
      const customStyleOpts = { size: 0.7, lineHeight: 0.9 }
      const expectedOpts = {
        spanBackgroundColorAdjust: { transparent: "black" },
        fontFamily: "Arial",
        sizeAdjust: 0.7,
        lineHeightAdjust: 0.9,
      }

      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, defaultStyleOpts)

      mediaPlayer.getCurrentTime.mockReturnValue(1)

      subtitles.start()
      subtitles.customise(customStyleOpts, true)

      expect(renderHTML).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(HTMLDivElement),
        null,
        100,
        200,
        false,
        null,
        null,
        false,
        expectedOpts
      )
    })

    it("does not render custom styles when subtitles are not enabled", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      const subsEnabled = false
      subtitles.start()
      subtitles.customise({}, subsEnabled)

      expect(renderHTML).not.toHaveBeenCalled()
    })
  })

  describe("example rendering", () => {
    it("should call fromXML, generate and render when renderExample is called", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.renderExample("", {}, {})

      expect(fromXML).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("should call renderHTML with a preview element with the correct structure when no position info", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, undefined)

      let exampleSubsElement = null
      let height = null
      let width = null

      renderHTML.mockImplementation((isd, subsElement, _, renderHeight, renderWidth) => {
        exampleSubsElement = subsElement
        height = renderHeight
        width = renderWidth
      })

      subtitles.renderExample("", {}, {})

      expect(renderHTML).toHaveBeenCalledTimes(1)

      expect(exampleSubsElement.style.top).toBe("0px")
      expect(exampleSubsElement.style.right).toBe("0px")
      expect(exampleSubsElement.style.bottom).toBe("0px")
      expect(exampleSubsElement.style.left).toBe("0px")

      expect(height).toBe(100)
      expect(width).toBe(200)
    })

    it("should call renderHTML with a preview element with the correct structure when there is position info", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      let exampleSubsElement = null
      let height = null
      let width = null

      renderHTML.mockImplementation((isd, subsElement, _, renderHeight, renderWidth) => {
        exampleSubsElement = subsElement
        height = renderHeight
        width = renderWidth
      })

      subtitles.renderExample(
        "",
        {},
        {
          top: 1,
          right: 2,
          bottom: 3,
          left: 4,
        }
      )

      expect(renderHTML).toHaveBeenCalledTimes(1)

      expect(exampleSubsElement.style.top).toBe("1px")
      expect(exampleSubsElement.style.right).toBe("4px")
      expect(exampleSubsElement.style.bottom).toBe("3px")
      expect(exampleSubsElement.style.left).toBe("8px")

      expect(height).toBe(96)
      expect(width).toBe(188)
    })
  })

  describe("Vod subtitles", () => {
    afterEach(() => {
      subtitles.stop()
    })

    it("Should load the subtitles url", () => {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))
    })

    it("Should load the next available url if loading of first XML fails", () => {
      avalailableSourceCount = 2
      LoadUrl.mockImplementation((url, callbackObject) => {
        callbackObject.onError()
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledTimes(2)
    })

    it("Calls fromXML on creation with the extracted XML from the text property of the response argument", () => {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
    })

    it("Calls fromXML on creation with the original text property of the response argument if expected header is not found", () => {
      LoadUrlStubResponseText =
        '<?xml version="1.0" encoding="utf-8" extra property="something"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>'
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
    })

    it("fires tranformError plugin if IMSC throws an exception when parsing", () => {
      fromXML.mockImplementation(() => {
        throw new Error()
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(Plugins.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1)
    })

    it("fires subtitleTransformError if responseXML from the loader is invalid", () => {
      LoadUrl.mockImplementation((url, callbackObject) => {
        callbackObject.onLoad(null, "", 200)
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})
      expect(Plugins.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesTimeout if the xhr times out", () => {
      LoadUrl.mockImplementation((url, callbackObject) => {
        callbackObject.onTimeout()
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledWith({ cdn: subtitlesCdn })
      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1)
    })

    it("does not attempt to load subtitles if there is no subtitles url", () => {
      subtitlesUrl = undefined
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).not.toHaveBeenCalled()
    })

    it("should not load subtitles everytime we start if it is already loaded", () => {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))

      LoadUrl.mockReset()
      subtitles.stop()
      subtitles.start()

      expect(LoadUrl).not.toHaveBeenCalled()
    })

    it("cannot start when xml transforming has failed", () => {
      fromXML.mockImplementation(() => {
        throw new Error()
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when current time is undefined", () => {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      progressTime(undefined)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when xml transforming has failed", () => {
      fromXML.mockImplementation(() => {
        throw new Error()
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when the initial current time is less than the first subtitle time", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()

      progressTime(0.75)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does attempt to generate and render when the initial current time is greater than the final subtitle time", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()
      progressTime(9)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 9)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      progressTime(9.25)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("does attempt to generate and render when the initial current time is mid way through a stream", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()

      progressTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 4)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("only generate and render when there are new subtitles to display", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()

      progressTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      progressTime(2.25)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      progressTime(3)

      expect(generateISD).toHaveBeenCalledTimes(2)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 3)
      expect(renderHTML).toHaveBeenCalledTimes(2)

      progressTime(9)

      expect(generateISD).toHaveBeenCalledTimes(3)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 9)
      expect(renderHTML).toHaveBeenCalledTimes(3)
    })

    it("no longer attempts any rendering if subtitles have been stopped", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      generateISD.mockReset()
      renderHTML.mockReset()

      subtitles.stop()
      progressTime(4)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("no longer attempts any rendering if subtitles have been torn down", () => {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      generateISD.mockReset()
      renderHTML.mockReset()

      subtitles.tearDown()
      progressTime(4)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("fires onSubtitlesRenderError plugin if IMSC throws an exception when rendering", () => {
      renderHTML.mockImplementation(() => {
        throw new Error()
      })
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesRenderError plugin if IMSC throws an exception when generating ISD", () => {
      generateISD.mockImplementation(() => {
        throw new Error()
      })
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })
  })

  describe("Live subtitles", () => {
    beforeEach(() => {
      subtitlesUrl = "https://subtitles/$segment$.test"
      segmentLength = 3.84
      epochStartTimeMilliseconds = 1614769200000 // Wednesday, 3 March 2021 11:00:00
    })

    afterEach(() => {
      subtitles.stop()
    })

    describe("Loading segments", () => {
      it("should load the first three segments with correct urls on the first update interval", () => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512815.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512816.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512817.test", expect.any(Object))
      })

      it("should load the segment two segments ahead of current time", () => {
        // epochStartTimeSeconds = Wednesday, 3 March 2021 11:00:00
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        // At 13.84 seconds, we should be loading the segment correseponding to 21.52 seconds
        // 1614769221520 = Wednesday, 3 March 2021 11:00:21.52
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512818.test", expect.any(Object))
      })

      it("should not load a segment if segments array already contains it", () => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512818.test", expect.any(Object))

        mediaPlayer.getCurrentTime.mockReturnValue(13.84) // time hasn't progressed. e.g. in paused state
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512818.test", expect.any(Object))
      })

      it("only keeps three segments when playing", () => {
        LoadUrl.mockClear()
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        progressTime(10)
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512815.test", expect.any(Object))

        progressTime(13.84)
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512818.test", expect.any(Object))

        progressTime(10)
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512815.test", expect.any(Object))
      })

      it("load three new segments when seeking back to a point where none of the segments are available", () => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(113.84)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512815.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512816.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512817.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })

      it("loads three new segments when seeking forwards to a point where none of the segments are available", () => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(100)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512838.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512839.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512840.test", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })

      it("should not load segments when auto start is false", () => {
        subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it("should load segments when start is called and autoStart is false", () => {
        subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()

        LoadUrl.mockReset()
        subtitles.start()

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512815.test", expect.any(Object))
      })

      it("calls fromXML with xml string where responseText contains more than a simple xml string", () => {
        LoadUrlStubResponseText = "stuff that might exists before the xml string" + LoadUrlStubResponseText
        mediaPlayer.getCurrentTime.mockReturnValue(10)

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        jest.advanceTimersByTime(750)

        expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
      })

      it("should stop loading segments when stop is called", () => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        LoadUrl.mockReset()
        subtitles.stop()

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it("should not create hanging interval references when start is called from an already started state", () => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        subtitles.start()

        expect(() => {
          subtitles.tearDown()
          jest.advanceTimersByTime(750)
        }).not.toThrow() // if the original interval caused by the autostart was lost, an exception would be thrown on tearDown
      })

      it("should not try to load segments when the currentTime is not known by the player", () => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(-1000)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it("should stop loading segments when xml transforming has failed", () => {
        fromXML.mockImplementation(() => {
          throw new Error()
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()

        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it("should not stop loading segments when the xml response is invalid", () => {
        LoadUrl.mockImplementation((url, callbackObject) => {
          callbackObject.onLoad(null, "", 200)
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()

        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith("https://subtitles/420512818.test", expect.any(Object))
      })

      it("should failover to the next url if loading of subtitles segments fails 3 times in a row", () => {
        LoadUrl.mockImplementation((url, callbackObject) => {
          callbackObject.onError()
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)
        // will attempt to load three segments after this tick

        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1)
      })

      it("should not failover if loading subtitles segments fails less than three times in a row", () => {
        let loadAttempts = 0

        LoadUrl.mockImplementation((url, callbackObject) => {
          loadAttempts++
          // fail first two segments, load third succesfully
          if (loadAttempts > 2) {
            callbackObject.onLoad(LoadUrlStubResponseXml, LoadUrlStubResponseText, 200)
          } else {
            callbackObject.onError()
          }
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(0)
      })

      it("Should continue loading segments from next available url if loading from first subtitles url fails", () => {
        avalailableSourceCount = 2
        LoadUrl.mockImplementation((url, callbackObject) => {
          callbackObject.onError()
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()

        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })
    })

    describe("rendering", () => {
      beforeEach(() => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})
      })

      afterEach(() => {
        generateISD.mockClear()
        renderHTML.mockClear()
      })

      it("should generate and render when time has progressed past a known un-rendered subtitles", () => {
        let times = [
          [0, 1, 2, 3.84],
          [0, 3.84, 4, 7.68],
          [0, 7.68, 9, 9.7, 11.52],
        ]
        let counter = -1

        times = times.map((time) => {
          return time.map((t) => {
            return t === 0 ? t : t + msToS(epochStartTimeMilliseconds)
          })
        })

        generateISD.mockReturnValue({ contents: ["mockContents"] })

        fromXML.mockImplementation(() => {
          counter = counter + 1

          return {
            getMediaTimeEvents: () => {
              return times[counter]
            },
            mockCallId: counter,
            head: {
              styling: {},
            },
            body: {
              contents: new Array(1),
            },
          }
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        progressTime(2.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ mockCallId: 0 }),
          msToS(epochStartTimeMilliseconds) + 2.75
        )
        expect(renderHTML).toHaveBeenCalledWith(
          expect.objectContaining({ contents: ["mockContents"] }),
          expect.any(HTMLDivElement),
          null,
          100,
          200,
          false,
          null,
          null,
          false,
          {}
        )

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(3.5)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(4.25)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ mockCallId: 1 }),
          msToS(epochStartTimeMilliseconds) + 4.25
        )
        expect(renderHTML).toHaveBeenCalledWith(
          expect.objectContaining({ contents: ["mockContents"] }),
          expect.any(HTMLDivElement),
          null,
          100,
          200,
          false,
          null,
          null,
          false,
          {}
        )

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(5)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(5.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(6.5)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(7.25)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(8)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ mockCallId: 2 }),
          msToS(epochStartTimeMilliseconds) + 8
        )
        expect(renderHTML).toHaveBeenCalledWith(
          expect.objectContaining({ contents: ["mockContents"] }),
          expect.any(HTMLDivElement),
          null,
          100,
          200,
          false,
          null,
          null,
          false,
          {}
        )

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(8.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(9.5)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ mockCallId: 2 }),
          msToS(epochStartTimeMilliseconds) + 9.5
        )
        expect(renderHTML).toHaveBeenCalledWith(
          expect.objectContaining({ contents: ["mockContents"] }),
          expect.any(HTMLDivElement),
          null,
          100,
          200,
          false,
          null,
          null,
          false,
          {}
        )

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(10.25)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ mockCallId: 2 }),
          msToS(epochStartTimeMilliseconds) + 10.25
        )
        expect(renderHTML).toHaveBeenCalledWith(
          expect.objectContaining({ contents: ["mockContents"] }),
          expect.any(HTMLDivElement),
          null,
          100,
          200,
          false,
          null,
          null,
          false,
          {}
        )

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(11)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(11.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ mockCallId: 2 }),
          msToS(epochStartTimeMilliseconds) + 11.75
        )
        expect(renderHTML).toHaveBeenCalledWith(
          expect.objectContaining({ contents: ["mockContents"] }),
          expect.any(HTMLDivElement),
          null,
          100,
          200,
          false,
          null,
          null,
          false,
          {}
        )

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(11.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()
      })
    })
  })
})
