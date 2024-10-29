import EmbeddedSubtitles from "./embeddedsubtitles"

const UPDATE_INTERVAL = 750

describe("Embedded Subtitles", () => {
  let subtitles
  let targetElement

  const mockMediaPlayer = {
    getCurrentTime: jest.fn(),
    setSubtitles: jest.fn(),
    addEventCallback: jest.fn(),
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

      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement)

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
      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement)

      progressTime(1.5)
      expect(targetElement.querySelector("#bsp_subtitles")).toBeTruthy()
    })
  })

  describe("autoplay", () => {
    it.skip("triggers the MSE player to enable subtitles immediately when set to autoplay", () => {
      const autoStart = true

      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement)

      progressTime(1.5)
      expect(mockMediaPlayer.setSubtitles).toHaveBeenCalledTimes(1)
    })

    it("does not trigger the MSE player to enable subtitles immediately when set to autoplay", () => {
      const autoStart = false

      subtitles = EmbeddedSubtitles(mockMediaPlayer, autoStart, targetElement)

      progressTime(1.5)
      expect(mockMediaPlayer.setSubtitles).toHaveBeenCalledTimes(0)
    })
  })
})
