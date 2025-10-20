import { ManifestType } from "../models/manifesttypes"
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

const SEGMENT_BUFFER_SIZE = 3
const UPDATE_INTERVAL = 750

const mockImscDoc = {
  getMediaTimeEvents: () => [1, 3, 8],
  head: {
    styling: {},
  },
  body: {
    contents: [],
  },
}

const mockMediaPlayer = {
  getCurrentTime: jest.fn(),
}

function progressTime(offsetInSeconds) {
  const currentTime = mockMediaPlayer.getCurrentTime()
  mockMediaPlayer.getCurrentTime.mockReturnValue(currentTime + offsetInSeconds)
  jest.advanceTimersByTime(UPDATE_INTERVAL)
}

function setTime(presentationTimeInSeconds) {
  mockMediaPlayer.getCurrentTime.mockReturnValue(presentationTimeInSeconds)
  jest.advanceTimersByTime(UPDATE_INTERVAL)
}

describe("IMSC Subtitles", () => {
  // Cleaned up between tests
  let subtitles

  // Used in MediaSources mock to handle failovers
  let captionsConsumedSoFar = 0
  let captions = null

  let targetElement

  const mockLoadUrlResponse = {
    xml: "<?xml>",
    text: '<?xml version="1.0" encoding="utf-8"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>',
  }

  const mockMediaSources = {
    currentSubtitlesSource: jest.fn(() => captions[captionsConsumedSoFar].url),
    currentSubtitlesSegmentLength: jest.fn(() => captions[captionsConsumedSoFar].segmentLength),
    currentSubtitlesCdn: jest.fn(() => captions[captionsConsumedSoFar].cdn),
    failoverSubtitles: jest.fn(
      () =>
        new Promise((resolve, reject) => {
          if (captionsConsumedSoFar >= captions.length) {
            return reject()
          }

          captionsConsumedSoFar += 1

          return resolve()
        })
    ),
    subtitlesRequestTimeout: jest.fn(),
    time: jest.fn().mockReturnValue({
      manifestType: ManifestType.STATIC,
      availabilityStartTimeInMilliseconds: 0,
      presentationTimeOffsetInMilliseconds: 0,
      timeShiftBufferDepthInMilliseconds: 0,
    }),
  }

  beforeEach(() => {
    fromXML.mockReturnValue(mockImscDoc)
    generateISD.mockReturnValue({ contents: ["mockContents"] })

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

    mockLoadUrlResponse.text = '<?xml version="1.0" encoding="utf-8"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>'
  })

  describe("construction", () => {
    it("returns the correct interface", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

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

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      setTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockImscDoc, 1.5)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("does not start the update loop immediately when not autoplaying", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: false })

      setTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })
  })

  describe("customisation", () => {
    it("overrides the subtitles styling metadata with supplied defaults when rendering", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      const expectedStyles = { spanBackgroundColorAdjust: { transparent: "black" }, fontFamily: "Arial" }

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, {
        defaultStyleOpts: {
          backgroundColour: "black",
          fontFamily: "Arial",
        },
      })

      subtitles.start()

      setTime(1)

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

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

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

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { defaultStyleOpts })

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

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      const subsEnabled = false
      subtitles.start()
      subtitles.customise({}, subsEnabled)

      expect(renderHTML).not.toHaveBeenCalled()
    })
  })

  describe("example rendering", () => {
    it("should call fromXML, generate and render when renderExample is called", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.renderExample("", {}, {})

      expect(fromXML).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("should call renderHTML with a preview element with the correct structure when no position info", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

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

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

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

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/subtitles.xml", expect.any(Object))
    })

    it("should load the next available url if loading of first XML fails", async () => {
      captions = [
        { url: "mock://some.media/captions/subtitles.xml", cdn: "foo" },
        { url: "mock://other.media/captions/subtitles.xml", cdn: "bar" },
      ]

      LoadUrl.mockImplementationOnce((url, callbackObject) => {
        callbackObject.onError()
      })

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      await jest.runOnlyPendingTimersAsync()

      expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1)
      expect(LoadUrl).toHaveBeenCalledTimes(2)
      expect(LoadUrl).toHaveBeenNthCalledWith(1, "mock://some.media/captions/subtitles.xml", expect.any(Object))
      expect(LoadUrl).toHaveBeenNthCalledWith(2, "mock://other.media/captions/subtitles.xml", expect.any(Object))
    })

    it("calls fromXML on creation with the extracted XML from the text property of the response argument", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
    })

    it("calls fromXML on creation with the original text property of the response argument if expected header is not found", () => {
      mockLoadUrlResponse.text =
        '<?xml version="1.0" encoding="utf-8" extra property="👽"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>'

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
    })

    it("fires tranformError plugin if IMSC throws an exception when parsing", () => {
      fromXML.mockImplementationOnce(() => {
        throw new Error("An error arose during parsing.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      expect(Plugins.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1)
    })

    it("fires subtitleXMLError if responseXML from the loader is invalid", () => {
      LoadUrl.mockImplementationOnce((url, callbackObject) => {
        callbackObject.onLoad(null, "", 200)
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      expect(Plugins.interface.onSubtitlesXMLError).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesTimeout if the xhr times out", () => {
      LoadUrl.mockImplementationOnce((url, callbackObject) => {
        callbackObject.onTimeout()
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledWith({ cdn: "foo" })
      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1)
    })

    it("does not attempt to load subtitles if there is no subtitles url", () => {
      captions = [{}]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      expect(LoadUrl).not.toHaveBeenCalled()
    })

    it("should not load subtitles everytime we start if it is already loaded", () => {
      captions = [
        { url: "mock://some.media/captions/subtitles.xml", cdn: "foo" },
        { url: "mock://other.media/captions/subtitles.xml", cdn: "bar" },
      ]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

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

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      setTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when current time is undefined", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      setTime()

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when xml transforming has failed", () => {
      fromXML.mockImplementationOnce(() => {
        throw new Error("An error occured during transformation.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

      setTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("does not try to generate and render when the initial current time is less than the first subtitle time", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()

      setTime(0.75)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it("attempts to generate and render when the initial current time is greater than the final subtitle time", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()
      setTime(9)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockImscDoc, 9)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      setTime(9.25)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("attempts to generate and render when the initial current time is mid way through a stream", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()

      setTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockImscDoc, 4)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("only generates and renders when there are new subtitles to display", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()

      setTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(mockImscDoc, 1.5)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      setTime(2.25)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      setTime(3)

      expect(generateISD).toHaveBeenCalledTimes(2)
      expect(generateISD).toHaveBeenCalledWith(mockImscDoc, 3)
      expect(renderHTML).toHaveBeenCalledTimes(2)

      setTime(9)

      expect(generateISD).toHaveBeenCalledTimes(3)
      expect(generateISD).toHaveBeenCalledWith(mockImscDoc, 9)
      expect(renderHTML).toHaveBeenCalledTimes(3)
    })

    it("no longer attempts any rendering if subtitles have been stopped", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()
      setTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      subtitles.stop()
      setTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("no longer attempts any rendering if subtitles have been torn down", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()
      setTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)

      subtitles.tearDown()
      setTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesRenderError plugin if IMSC throws an exception when rendering", () => {
      renderHTML.mockImplementationOnce(() => {
        throw new Error("An error occured during rendering.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()
      setTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })

    it("fires onSubtitlesRenderError plugin if IMSC throws an exception when generating ISD", () => {
      generateISD.mockImplementationOnce(() => {
        throw new Error("An error occured generating ISD.")
      })

      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources)

      subtitles.start()
      setTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })
  })

  describe("subtitles delivered as segments", () => {
    beforeEach(() => {
      mockMediaSources.time.mockReturnValue({
        manifestType: ManifestType.DYNAMIC,
        availabilityStartTimeInMilliseconds: 30000,
        presentationTimeOffsetInMilliseconds: 0,
        timeShiftBufferDepthInMilliseconds: 7200000,
      })

      mockMediaPlayer.getCurrentTime.mockReturnValue(1614769200) // Wednesday, 3 March 2021 11:00:00
    })

    describe("Loading segments", () => {
      it("fills the buffer with correct segment urls on the first update interval", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledTimes(SEGMENT_BUFFER_SIZE)
        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512812.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512813.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512814.m4s", expect.any(Object))
      })

      it("loads the segment that is two segments ahead of current time", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, {
          autoStart: true,
        })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledTimes(SEGMENT_BUFFER_SIZE)

        progressTime(4) // progress past one segment

        // 4 seconds into playback the segment two (2) ahead is the fourth (4) segment relative the to epoch start time.
        // Given a segment length of 3.84, The fourth (4) segment to load corresponds to 11.52s.
        // epoch time = epoch start time [seconds] + 11.52s = 1614769215
        // segment number
        //  = epoch time [seconds] / segment length [seconds]
        //  = floor(1614769212 / 3.84)
        //  = 420512815
        expect(LoadUrl).toHaveBeenCalledTimes(4)
        expect(LoadUrl).toHaveBeenLastCalledWith("mock://some.media/captions/420512815.m4s", expect.any(Object))
      })

      it("does not load a segment if it already is in the buffer", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        progressTime(13.84)

        expect(LoadUrl).toHaveBeenCalledTimes(SEGMENT_BUFFER_SIZE)
        expect(LoadUrl).toHaveBeenLastCalledWith("mock://some.media/captions/420512818.m4s", expect.any(Object))

        jest.advanceTimersByTime(750) // playback time hasn't progressed. e.g. in paused state

        expect(LoadUrl).toHaveBeenCalledTimes(SEGMENT_BUFFER_SIZE)
      })

      it("only keeps three segments in the buffer when playing", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledTimes(3)

        progressTime(4) // progress past one segment

        expect(LoadUrl).toHaveBeenCalledTimes(4)

        progressTime(-4) // progress backwards 1 segment

        expect(LoadUrl).toHaveBeenCalledTimes(5)
        expect(LoadUrl).toHaveBeenLastCalledWith("mock://some.media/captions/420512812.m4s", expect.any(Object))
      })

      it("load three new segments when seeking back to a point where none of the segments are available", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        progressTime(100) // seek way ahead

        expect(LoadUrl).toHaveBeenCalledTimes(3)

        progressTime(-99) // seek way back

        expect(LoadUrl).toHaveBeenCalledTimes(6)

        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512812.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512813.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512814.m4s", expect.any(Object))
      })

      it("loads three new segments when seeking forwards to a point where none of the segments are available", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledTimes(3)

        progressTime(100) // seek way ahead

        expect(LoadUrl).toHaveBeenCalledTimes(6)

        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512838.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512839.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://some.media/captions/420512840.m4s", expect.any(Object))
      })

      it("does not immediately load segments when auto start is false", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: false })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it("loads segments when start is called and autoStart is false", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: false })

        expect(LoadUrl).not.toHaveBeenCalled()

        subtitles.start()

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })

      it("calls fromXML with xml string where responseText contains more than a simple xml string", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        mockLoadUrlResponse.text = `stuff that might exists before the xml string${mockLoadUrlResponse.text}`

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
      })

      it("stops loading segments when stop is called", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledTimes(3)

        subtitles.stop()

        progressTime(100)

        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })

      it("does not leak interval references when start is called from an already started state", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        subtitles.start()

        expect(() => {
          subtitles.tearDown()
          jest.advanceTimersByTime(UPDATE_INTERVAL)
        }).not.toThrow() // if the original interval caused by the autostart was lost, an exception would be thrown on tearDown
      })

      it("does not load segments when the currentTime is not known by the player", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        mockMediaPlayer.getCurrentTime.mockReturnValueOnce(NaN)
        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it("does not load segments when currentTime is zero", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        mockMediaPlayer.getCurrentTime.mockReturnValue(0)

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it("stops loading all segments when the XML transform fails for some segment", () => {
        fromXML.mockImplementationOnce(() => {
          throw new Error("An error occured during transformation.")
        })

        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        progressTime(1)

        expect(LoadUrl).toHaveBeenCalledTimes(3)

        progressTime(100)

        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })

      it("does not stop loading segments when the xml response is invalid for some segment", () => {
        LoadUrl.mockImplementationOnce((url, callbackObject) => {
          callbackObject.onLoad(null, "", 200)
        })

        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        progressTime(1)

        expect(LoadUrl).toHaveBeenCalledTimes(3)

        progressTime(11)

        expect(LoadUrl).toHaveBeenCalledTimes(6)
      })

      it("performs a failover to the next url when subtitles segments fail to load 3 times in a row", async () => {
        for (const _ in [1, 2, 3]) {
          LoadUrl.mockImplementationOnce((url, callbackObject) => {
            callbackObject.onError()
          })
        }

        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
          {
            type: "application/ttml+xml",
            url: "mock://other.media/captions/$segment$.m4s",
            cdn: "bar",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1)

        await jest.advanceTimersByTimeAsync(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledWith("mock://other.media/captions/420512812.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://other.media/captions/420512813.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://other.media/captions/420512814.m4s", expect.any(Object))
      })

      it("does not perform a failover when subtitles segments fails to load less than three times in a row", () => {
        for (const _ in [1, 2]) {
          LoadUrl.mockImplementationOnce((url, callbackObject) => {
            callbackObject.onError()
          })
        }

        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
          {
            type: "application/ttml+xml",
            url: "mock://other.media/captions/$segment$.m4s",
            cdn: "bar",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(mockMediaSources.failoverSubtitles).not.toHaveBeenCalled()
      })

      it("handles different segment url templates when performing a failover", async () => {
        for (const _ in [1, 2, 3]) {
          LoadUrl.mockImplementationOnce((_, callbacks) => {
            callbacks.onError()
          })
        }

        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
          {
            type: "application/ttml+xml",
            url: "mock://other.media/captions/$Number$.m4s",
            cdn: "bar",
            segmentLength: 3.84,
          },
        ]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        jest.advanceTimersByTime(UPDATE_INTERVAL)

        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1)

        await jest.advanceTimersByTimeAsync(UPDATE_INTERVAL)

        expect(LoadUrl).toHaveBeenCalledWith("mock://other.media/captions/420512812.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://other.media/captions/420512813.m4s", expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith("mock://other.media/captions/420512814.m4s", expect.any(Object))
      })
    })

    describe("rendering", () => {
      beforeEach(() => {
        mockMediaSources.time.mockReturnValue({
          manifestType: ManifestType.DYNAMIC,
          availabilityStartTimeInMilliseconds: 30000,
          presentationTimeOffsetInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 7200000,
        })

        mockMediaPlayer.getCurrentTime.mockReturnValue(1614769200) // Wednesday, 3 March 2021 11:00:00
      })

      it("generates and renders when time has progressed past a known unrendered subtitles segment", () => {
        captions = [
          {
            type: "application/ttml+xml",
            url: "mock://some.media/captions/$segment$.m4s",
            cdn: "foo",
            segmentLength: 3.84,
          },
        ]

        const epochStartTimeSeconds = 1614769200

        const convertSecondsToEpoch = (...seconds) =>
          seconds.map((time) => (time === 0 ? 0 : epochStartTimeSeconds + time))

        const buildMockSegment = ({ beginTimes, id } = {}) => ({
          _mockedSegmentID: id,
          body: {
            contents: ["stub"],
          },
          head: {
            styling: {},
          },
          getMediaTimeEvents: () => beginTimes,
        })

        fromXML.mockReturnValueOnce(
          buildMockSegment({
            id: 1,
            beginTimes: convertSecondsToEpoch(0, 1, 2, 3.84),
          })
        )

        fromXML.mockReturnValueOnce(
          buildMockSegment({
            id: 2,
            beginTimes: convertSecondsToEpoch(0, 3.84, 4, 7.68),
          })
        )

        fromXML.mockReturnValueOnce(
          buildMockSegment({
            id: 3,
            beginTimes: convertSecondsToEpoch(0, 7.68, 9, 9.7, 11.52),
          })
        )

        fromXML.mockReturnValue(buildMockSegment({ id: null }))

        generateISD.mockReturnValue({ contents: ["mockContents"] })

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, { autoStart: true })

        progressTime(2.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ _mockedSegmentID: 1 }),
          epochStartTimeSeconds + 2.75
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

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        progressTime(0.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ _mockedSegmentID: 2 }),
          epochStartTimeSeconds + 4.25
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

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        progressTime(0.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ _mockedSegmentID: 3 }),
          epochStartTimeSeconds + 8
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

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        progressTime(0.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ _mockedSegmentID: 3 }),
          epochStartTimeSeconds + 9.5
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

        progressTime(0.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ _mockedSegmentID: 3 }),
          epochStartTimeSeconds + 10.25
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

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        progressTime(0.75)

        expect(generateISD).toHaveBeenCalledWith(
          expect.objectContaining({ _mockedSegmentID: 3 }),
          epochStartTimeSeconds + 11.75
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

        progressTime(0.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()
      })

      it("removes subtitle element after seeking to an unsubtitled region", () => {
        captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

        subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, {
          autoStart: true,
          alwaysOnTop: false,
        })

        setTime(20)

        const preSeekAwayContainer = document.querySelector("#bsp_subtitles")
        expect(preSeekAwayContainer).not.toBeNull()

        setTime(0)

        const postSeekAwayContainer = document.querySelector("#bsp_subtitles")
        expect(postSeekAwayContainer).toBeNull()
      })
    })
  })

  describe("always on top", () => {
    it("should set the container element's z-index to the maximum value when alwaysOnTop is true", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, {
        autoStart: true,
        alwaysOnTop: true,
      })

      setTime(1.5)

      const container = document.querySelector("#bsp_subtitles")

      expect(container.style.zIndex).toBe("2147483647")
    })

    it("should not set the container element's z-index when alwaysOnTop is false", () => {
      captions = [{ url: "mock://some.media/captions/subtitles.xml", cdn: "foo" }]

      subtitles = IMSCSubtitles(mockMediaPlayer, targetElement, mockMediaSources, {
        autoStart: true,
        alwaysOnTop: false,
      })

      setTime(1.5)

      const container = document.querySelector("#bsp_subtitles")

      expect(container.style.zIndex).toBe("")
    })
  })
})
