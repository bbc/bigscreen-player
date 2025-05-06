import EmbeddedSubtitles from "./embeddedsubtitles"
import { fromXML, generateISD, renderHTML } from "smp-imsc"

jest.mock("smp-imsc")

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

describe("Embedded Subtitles", () => {
  let subtitles
  let targetElement
  let subtitleElement

  const mockMediaPlayer = {
    getCurrentTime: jest.fn(),
    setSubtitles: jest.fn(),
    addEventCallback: jest.fn(),
    customiseSubtitles: jest.fn(),
  }

  beforeAll(() => {
    fromXML.mockReturnValue(mockImscDoc)
    generateISD.mockReturnValue({ contents: ["mockContents"] })
  })

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    jest.clearAllTimers()

    mockMediaPlayer.getCurrentTime.mockReturnValue(0)

    // Reset the target HTML element between each test
    targetElement?.remove()
    targetElement = document.createElement("div")

    subtitleElement?.remove()
    subtitleElement = document.createElement("div")
    subtitleElement.id = "bsp_subtitles"
    subtitleElement.style.position = "absolute"
    targetElement.appendChild(subtitleElement, targetElement.firstChild)

    jest.spyOn(targetElement, "clientWidth", "get").mockReturnValue(200)
    jest.spyOn(targetElement, "clientHeight", "get").mockReturnValue(100)
    jest.spyOn(targetElement, "removeChild")

    document.body.appendChild(targetElement)

    // Reset instance
    subtitles?.stop()

    // Reset instance
    subtitles?.tearDown()

    subtitles = null
    mockMediaPlayer.setSubtitles.mockClear()
  })

  function progressTime(mediaPlayerTime) {
    mockMediaPlayer.getCurrentTime.mockReturnValue(mediaPlayerTime)
    jest.advanceTimersByTime(UPDATE_INTERVAL)
  }

  describe("construction", () => {
    it("returns the correct interface", () => {
      const autoStart = false

      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement, null, {})

      expect(subtitles).toEqual(
        expect.objectContaining({
          start: expect.any(Function),
          stop: expect.any(Function),
          customise: expect.any(Function),
          tearDown: expect.any(Function),
        })
      )
    })
  })

  describe("autoplay", () => {
    it("triggers the MSE player to enable subtitles immediately when set to autoplay", () => {
      const autoStart = true

      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement, null, {})

      progressTime(1.5)
      expect(mockMediaPlayer.setSubtitles).toHaveBeenCalledTimes(1)
    })

    it("does not trigger the MSE player to enable subtitles immediately when autoplay is false", () => {
      const autoStart = false

      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement, null, {})

      progressTime(1.5)
      expect(mockMediaPlayer.setSubtitles).toHaveBeenCalledTimes(0)
    })
  })

  describe("customisation", () => {
    it("overrides the subtitles styling metadata with supplied defaults when rendering", () => {
      const expectedStyles = { spanBackgroundColorAdjust: { transparent: "black" }, fontFamily: "Arial" }

      subtitles = EmbeddedSubtitles(mockMediaPlayer, false, targetElement, null, {
        backgroundColour: "black",
        fontFamily: "Arial",
      })

      subtitles.start()

      progressTime(1)

      expect(mockMediaPlayer.customiseSubtitles).toHaveBeenCalledWith(expectedStyles)
    })

    it("overrides the subtitles styling metadata with supplied custom styles when rendering", () => {
      subtitles = EmbeddedSubtitles(mockMediaPlayer, false, targetElement, null, {})

      const styleOpts = { size: 0.7, lineHeight: 0.9 }
      const expectedOpts = { sizeAdjust: 0.7, lineHeightAdjust: 0.9 }

      mockMediaPlayer.getCurrentTime.mockReturnValueOnce(1)

      subtitles.start()
      subtitles.customise(styleOpts)

      expect(mockMediaPlayer.customiseSubtitles).toHaveBeenCalledWith(expectedOpts)
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

      subtitles = EmbeddedSubtitles(mockMediaPlayer, false, targetElement, null, defaultStyleOpts)

      mockMediaPlayer.getCurrentTime.mockReturnValueOnce(1)

      subtitles.start()
      subtitles.customise(customStyleOpts)

      expect(mockMediaPlayer.customiseSubtitles).toHaveBeenCalledWith(expectedOpts)
    })
  })

  describe("example rendering", () => {
    it("should call fromXML, generate and render when renderExample is called", () => {
      subtitles = EmbeddedSubtitles(mockMediaPlayer, false, targetElement, null, {})

      subtitles.renderExample("", {}, {})

      expect(fromXML).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it("should call renderHTML with a preview element with the correct structure when no position info", () => {
      subtitles = EmbeddedSubtitles(mockMediaPlayer, false, targetElement, null, {})

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
      subtitles = EmbeddedSubtitles(mockMediaPlayer, false, targetElement, null, {})

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
})
