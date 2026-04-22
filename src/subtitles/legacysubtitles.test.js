import LegacySubtitles from "./legacysubtitles"
import TransportControlPosition from "../models/transportcontrolposition"
import LoadUrl from "../utils/loadurl"
import Plugins from "../plugins"
import Renderer from "./renderer"

jest.mock("../utils/loadurl")
jest.mock("../plugins", () => ({
  updateContext: jest.fn(),
  interface: {
    onSubtitlesTimeout: jest.fn(),
    onSubtitlesXMLError: jest.fn(),
    onSubtitlesRenderError: jest.fn(),
    onSubtitlesTransformError: jest.fn(),
  },
}))

const mockRender = () => document.createElement("div")

jest.mock("./renderer")

const mockStart = jest.fn()
const mockStop = jest.fn()

Renderer.mockImplementation(() => ({
  start: mockStart,
  stop: mockStop,
  render: mockRender,
}))

describe("Legacy Subtitles", () => {
  const mockMediaPlayer = {
    getDuration: jest.fn(),
  }

  const loadUrlStubResponseXml = "<?xml>"
  const loadUrlStubResponseText = "loadUrlStubResponseText"

  let parentElement
  let legacySubtitles
  let subtitlesUrl
  let subtitlesCdn
  let mockMediaSources
  let availableSourcesCount

  beforeEach(() => {
    LoadUrl.mockImplementation((url, callbackObject) => {
      callbackObject.onLoad(loadUrlStubResponseXml, loadUrlStubResponseText, 200)
    })

    parentElement = document.createElement("div")
    subtitlesUrl = "http://stub-captions.test"
    subtitlesCdn = "supplier1"
    mockMediaSources = {
      subtitlesRequestTimeout: jest.fn(),
      currentSubtitlesSource: jest.fn().mockReturnValue(subtitlesUrl),
      currentSubtitlesCdn: jest.fn().mockReturnValue(subtitlesCdn),
      failoverSubtitles: jest.fn().mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            if (availableSourcesCount > 1) {
              availableSourcesCount--
              return resolve()
            }

            return reject()
          })
      ),
    }

    mockMediaSources.failoverSubtitles
  })

  afterEach(() => {
    legacySubtitles.tearDown()
    LoadUrl.mockClear()
    Renderer.mockClear()
    mockStart.mockClear()
    mockStop.mockClear()
  })

  it("Should load the subtitles url if auto start is true", () => {
    const autoStart = true
    legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart })

    expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))
  })

  it("Should not load the subtitles url if auto start is false", () => {
    const autoStart = false
    legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart })

    expect(LoadUrl).not.toHaveBeenCalled()
  })

  it("Has a player subtitles class", () => {
    legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })

    expect(parentElement.firstChild.className).toContain("playerCaptions")
  })

  it("Should fire subtitlesXMLError if responseXML from the loader is invalid", () => {
    LoadUrl.mockImplementation((url, callbackObject) => {
      callbackObject.onLoad(null, "", 200)
    })
    legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })

    expect(Plugins.interface.onSubtitlesXMLError).toHaveBeenCalledWith({ cdn: subtitlesCdn })
    expect(Plugins.interface.onSubtitlesXMLError).toHaveBeenCalledTimes(1)
  })

  it("Should try to failover to the next url if responseXML from the loader is invalid", () => {
    availableSourcesCount = 1
    LoadUrl.mockImplementation((url, callbackObject) => {
      callbackObject.onError({ statusCode: 404 })
    })
    legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })

    expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledWith({
      statusCode: 404,
    })
    expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1)
  })

  it("Should fire onSubtitlesTimeout if the XHR times out", () => {
    LoadUrl.mockImplementation((url, callbackObject) => {
      callbackObject.onTimeout()
    })
    legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })

    expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledWith({ cdn: subtitlesCdn })
    expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1)
  })

  describe("Start", () => {
    it("Should call start on the renderer when the renderer exists", () => {
      legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })

      legacySubtitles.start()

      expect(mockStart).toHaveBeenCalledWith()
    })

    it("Should load the subtitle url and create the renderer when the renderer doesnt exist", () => {
      legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources)

      legacySubtitles.start()

      expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))
      expect(Renderer).toHaveBeenCalledWith("playerCaptions", expect.any(String), mockMediaPlayer)
    })

    it("Should not start subtitles if there is invalid xml in the response object", () => {
      LoadUrl.mockImplementation((url, callbackObject) => {
        callbackObject.onError()
      })
      legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources)

      legacySubtitles.start()

      expect(Renderer).not.toHaveBeenCalled()
    })
  })

  describe("Stop", () => {
    it("Stops the subtitles if there is valid xml in the response object", () => {
      legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })
      legacySubtitles.stop()

      expect(mockStop).toHaveBeenCalledWith()
    })

    it("Does not stop the subtitles if there is is invalid xml in the response object", () => {
      LoadUrl.mockImplementation((url, callbackObject) => {
        callbackObject.onError()
      })

      legacySubtitles = new LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })
      legacySubtitles.stop()

      expect(mockStop).not.toHaveBeenCalledWith()
    })
  })

  describe("Updating position", () => {
    beforeEach(() => {
      legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, { autoStart: true })
    })

    test.each([
      { className: "controlsVisible", pos: TransportControlPosition.CONTROLS_ONLY },
      { className: "controlsWithInfoVisible", pos: TransportControlPosition.CONTROLS_WITH_INFO },
      { className: "leftCarouselVisible", pos: TransportControlPosition.LEFT_CAROUSEL },
      { className: "bottomCarouselVisible", pos: TransportControlPosition.BOTTOM_CAROUSEL },
    ])("Has class $position.className for position $position.pos", (position) => {
      legacySubtitles.updatePosition(position.pos)

      expect(parentElement.firstChild.className).toContain(position.className)
    })

    it("Replaces classes when position changed", () => {
      legacySubtitles.updatePosition(TransportControlPosition.CONTROLS_ONLY)

      expect(parentElement.firstChild.className).toContain("controlsVisible")
      legacySubtitles.updatePosition(TransportControlPosition.CONTROLS_WITH_INFO)

      expect(parentElement.firstChild.className).not.toContain("controlsVisible")
    })
  })

  describe("always on top", () => {
    it("should set the parent element's z-index to the maximum value when alwaysOnTop is true", () => {
      legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, {
        autoStart: true,
        alwaysOnTop: true,
      })

      const subtitlesElement = parentElement.firstChild

      expect(subtitlesElement.style.zIndex).toBe("2147483647")
    })

    it("should not set the parent element's z-index when alwaysOnTop is false", () => {
      legacySubtitles = LegacySubtitles(mockMediaPlayer, parentElement, mockMediaSources, {
        autoStart: true,
        alwaysOnTop: false,
      })

      const subtitlesElement = parentElement.firstChild

      expect(subtitlesElement.style.zIndex).toBe("")
    })
  })
})
