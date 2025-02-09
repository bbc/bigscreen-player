import EmbeddedSubtitles from "./embeddedsubtitles"

const UPDATE_INTERVAL = 750

describe("Embedded Subtitles", () => {
  let subtitles
  let targetElement

  const mockMediaPlayer = {
    getCurrentTime: jest.fn(),
    setSubtitles: jest.fn(),
    addEventCallback: jest.fn(),
    customiseSubtitles: jest.fn(),
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    jest.clearAllTimers()

    // Reset the target HTML element between each test
    targetElement?.remove()
    targetElement = document.createElement("div")

    jest.spyOn(targetElement, "clientWidth", "get").mockReturnValue(200)
    jest.spyOn(targetElement, "clientHeight", "get").mockReturnValue(100)
    jest.spyOn(targetElement, "removeChild")

    document.body.appendChild(targetElement)

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

    it("Expect TTML rendering div to have been created", () => {
      const autoStart = false
      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement, null, {})

      progressTime(1.5)
      expect(targetElement.querySelector("#bsp_subtitles")).toBeTruthy()
    })
  })

  describe("autoplay", () => {
    it("triggers the MSE player to enable subtitles immediately when set to autoplay", () => {
      const autoStart = true

      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement, null, {})

      progressTime(1.5)
      expect(mockMediaPlayer.setSubtitles).toHaveBeenCalledTimes(1)
    })

    it("does not trigger the MSE player to enable subtitles immediately when set to autoplay", () => {
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
})
