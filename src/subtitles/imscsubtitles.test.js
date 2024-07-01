import IMSCSubtitles from "./imscsubtitles"
import { fromXML, generateISD, renderHTML } from "smp-imsc"
import LoadUrl from "../utils/loadurl"
import Plugins from "../plugins"

jest.mock("smp-imsc")

jest.mock("../utils/loadurl")

jest.mock("../plugins", () => ({
  interface: {
    onSubtitlesTimeout: jest.fn(),
    onSubtitlesXMLError: jest.fn(),
    onSubtitlesRenderError: jest.fn(),
    onSubtitlesTransformError: jest.fn(),
  },
}))

const UPDATE_INTERVAL = 750

describe("IMSC Subtitles", () => {
  // Cleaned up between tests
  let subtitles

  // Used in MediaSources mock to handle failovers
  let captionsConsumedSoFar = 0
  let captions = null

  let epochStartTimeMilliseconds
  let targetElement

  const mockFromXmlReturn = {
    getMediaTimeEvents: () => [1, 3, 8],
    head: {
      styling: {},
    },
    body: {
      contents: [],
    },
  }

  fromXML.mockReturnValue(mockFromXmlReturn)

  const mockLoadUrlResponse = {
    xml: "<?xml>",
    text: '<?xml version="1.0" encoding="utf-8"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>',
  }

  const mockMediaPlayer = {
    getCurrentTime: jest.fn(),
  }

  const mockMediaSources = {
    currentSubtitlesSource: jest.fn(() => captions[captionsConsumedSoFar].url),
    currentSubtitlesSegmentLength: jest.fn(() => captions[captionsConsumedSoFar].segmentLength),
    currentSubtitlesCdn: jest.fn(() => captions[captionsConsumedSoFar].cdn),
    failoverSubtitles: jest.fn((dispatchFailover, dispatchFailoverError) => {
      if (captionsConsumedSoFar >= captions.length) {
        dispatchFailoverError()
        return
      }

      captionsConsumedSoFar += 1

      dispatchFailover()
    }),
    subtitlesRequestTimeout: jest.fn(),
    time: jest.fn(() => ({
      windowStartTime: epochStartTimeMilliseconds,
    })),
  }

  generateISD.mockReturnValue({ contents: ["mockContents"] })

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    jest.clearAllTimers()

    // Reset instance
    subtitles?.stop()

    // Reset loadUrl, it is called multiple times in each test
    LoadUrl.mockReset()
    LoadUrl.mockImplementation((url, callbackObject) => {
      callbackObject.onLoad(mockLoadUrlResponse.xml, mockLoadUrlResponse.text, 200)
    })

    // Reset current time to 0, it is called multiple times in each test
    mockMediaPlayer.getCurrentTime.mockReturnValue(0)

    // Reset the target HTML element between each test
    targetElement?.remove()
    targetElement = document.createElement("div")

    jest.spyOn(targetElement, "clientWidth", "get").mockReturnValue(200)
    jest.spyOn(targetElement, "clientHeight", "get").mockReturnValue(100)
    jest.spyOn(targetElement, "removeChild")

    document.body.appendChild(targetElement)

    // Reset interfaces between each test
    captionsConsumedSoFar = 0
    captions = null

    epochStartTimeMilliseconds = undefined

    mockLoadUrlResponse.text = '<?xml version="1.0" encoding="utf-8"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>'
  })

  function progressTime(mediaPlayerTime) {
    mockMediaPlayer.getCurrentTime.mockReturnValue(mediaPlayerTime)
    jest.advanceTimersByTime(UPDATE_INTERVAL)
  }

  describe("construction", () => {
    it("returns the correct interface", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      expect(subtitles).toEqual(
        expect.objectContaining({
          start: expect.any(Function),
          stop: expect.any(Function),
          updatePosition: expect.any(Function),
          tearDown: expect.any(Function),
        })
      )
    })

    it("starts the update loop immediately when set to autoplay", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockFromXmlReturn, 1.5)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("does not start the update loop immediately when not autoplaying", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })
  })

  describe("customisation", () => {
    it("overrides the subtitles styling metadata with supplied defaults when rendering", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      const expectedStyles = { spanBackgroundColorAdjust: { transparent: "black" }, fontFamily: "Arial" }

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {
        backgroundColour: "black",
        fontFamily: "Arial",
      })

      subtitles.start()

      progressTime(1)

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
        expectedStyles
      )
    })

    it("overrides the subtitles styling metadata with supplied custom styles when rendering", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      const styleOpts = { size: 0.7, lineHeight: 0.9 }
      const expectedOpts = { sizeAdjust: 0.7, lineHeightAdjust: 0.9 }

      mockMediaPlayer.getCurrentTime.mockReturnValueOnce(1)

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
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      const defaultStyleOpts = { backgroundColour: "black", fontFamily: "Arial" }
      const customStyleOpts = { size: 0.7, lineHeight: 0.9 }
      const expectedOpts = {
        spanBackgroundColorAdjust: { transparent: "black" },
        fontFamily: "Arial",
        sizeAdjust: 0.7,
        lineHeightAdjust: 0.9,
      }

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, defaultStyleOpts)

      mockMediaPlayer.getCurrentTime.mockReturnValueOnce(1)

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
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      const subsEnabled = false
      subtitles.start()
      subtitles.customise({}, subsEnabled)

      expect(renderHTML).not.toHaveBeenCalled()
    })
  })

  describe("example rendering", () => {
    it("should call fromXML, generate and render when renderExample is called", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.renderExample("", {}, {})

      expect(fromXML).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("should call renderHTML with a preview element with the correct structure when no position info", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources)

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
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

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

  describe("subtitles delivered as a whole", () => {
    it("should load the subtitles url", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/subtitles.xml", expect.any(Object))
    })

    it("should load the next available url if loading of first XML fails", () => {
      captions = [
        { url: "mock://some.media/captions/subtitles.xml", cdn: "foo" },
        { url: "mock://other.media/captions/subtitles.xml", cdn: "bar" },
      ]

      LoadUrl.mockImplementationOnce((url, callbackObject) => {
        callbackObject.onError()
      })

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledTimes(2)
      expect(LoadUrl).toHaveBeenNthCalledWith(1, "mock://some.media/captions/subtitles.xml", expect.any(Object))
      expect(LoadUrl).toHaveBeenNthCalledWith(2, "mock://other.media/captions/subtitles.xml", expect.any(Object))
    })

    it("fires tranformError plugin if IMSC throws an exception when parsing", () => {
      fromXML.mockImplementationOnce(() => {
        throw new Error("An error arose during parsing.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      expect(Plugins.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1)
    })

    it("fires subtitleXMLError if responseXML from the loader is invalid", () => {
      LoadUrl.mockImplementationOnce((url, callbackObject) => {
        callbackObject.onLoad(null, "", 200)
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      expect(Plugins.interface.onSubtitlesXMLError).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesTimeout if the xhr times out", () => {
      LoadUrl.mockImplementationOnce((url, callbackObject) => {
        callbackObject.onTimeout()
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledWith({ cdn: "foo" })
      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1)
    })

    it("does not attempt to load subtitles if there is no subtitles url", () => {
      captions = [{}]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      expect(LoadUrl).not.toHaveBeenCalled()
    })

    it("should not load subtitles everytime we start if it is already loaded", () => {
      captions = [
        { url: "mock://some.media/captions/subtitles.xml", cdn: "foo" },
        { url: "mock://other.media/captions/subtitles.xml", cdn: "bar" },
      ]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledTimes(1)
      expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/subtitles.xml", expect.any(Object))

      subtitles.stop()
      subtitles.start()

      expect(LoadUrl).toHaveBeenCalledTimes(1)
    })

    it("cannot start when xml transforming has failed", () => {
      fromXML.mockImplementationOnce(() => {
        throw new Error("An error arose during transformation.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when current time is undefined", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      progressTime()

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when xml transforming has failed", () => {
      fromXML.mockImplementationOnce(() => {
        throw new Error("An error occured during transformation.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, true, targetElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when the initial current time is less than the first subtitle time", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()

      progressTime(0.75)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("attempts to generate and render when the initial current time is greater than the final subtitle time", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()
      progressTime(9)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockFromXmlReturn, 9)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      progressTime(9.25)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("attempts to generate and render when the initial current time is mid way through a stream", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()

      progressTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockFromXmlReturn, 4)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("only generates and renders when there are new subtitles to display", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()

      progressTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockFromXmlReturn, 1.5)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      progressTime(2.25)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      progressTime(3)

      expect(generateISD).toHaveBeenCalledTimes(2)
      expect(generateISD).toHaveBeenCalledWith(mockFromXmlReturn, 3)
      expect(renderHTML).toHaveBeenCalledTimes(2)

      progressTime(9)

      expect(generateISD).toHaveBeenCalledTimes(3)
      expect(generateISD).toHaveBeenCalledWith(mockFromXmlReturn, 9)
      expect(renderHTML).toHaveBeenCalledTimes(3)
    })

    it("no longer attempts any rendering if subtitles have been stopped", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      subtitles.stop()
      progressTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("no longer attempts any rendering if subtitles have been torn down", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      subtitles.tearDown()
      progressTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesRenderError plugin if IMSC throws an exception when rendering", () => {
      renderHTML.mockImplementationOnce(() => {
        throw new Error("An error occured during rendering.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesRenderError plugin if IMSC throws an exception when generating ISD", () => {
      generateISD.mockImplementationOnce(() => {
        throw new Error("An error occured generating ISD.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, false, targetElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })
  })
})
