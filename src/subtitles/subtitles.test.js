/* eslint-disable jest/no-done-callback */
import IMSCSubtitles from "./imscsubtitles"
import LegacySubtitles from "./legacysubtitles"
import Subtitles from "./subtitles"

jest.mock("./imscsubtitles")
jest.mock("./legacysubtitles")

describe("Subtitles", () => {
  let captions = null
  let subtitlesAvailable
  let live

  const mockMediaSources = {
    subtitlesRequestTimeout: jest.fn(),
    currentSubtitlesSource: jest.fn(() => (subtitlesAvailable ? captions.url : "")),
    currentSubtitlesSegmentLength: jest.fn(() => (live ? captions.segmentLength : null)),
  }

  beforeAll(() => {
    captions = {
      url: "http://subtitles.example.test",
      segmentLength: 3.84,
    }
  })

  beforeEach(() => {
    window.bigscreenPlayer = {}
    subtitlesAvailable = true
    live = false
  })

  describe("strategy construction", () => {
    describe("legacy", () => {
      beforeEach(() => {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true,
          },
        }
      })

      it("implementation is available when legacy subtitles override is true", (done) => {
        const mockMediaPlayer = {}
        const autoStart = true
        const mockPlaybackElement = document.createElement("div")
        const mockCallback = (result) => {
          expect(result).toBe(true)
          expect(LegacySubtitles).toHaveBeenCalledTimes(1)
          done()
        }

        Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, null, mockMediaSources, mockCallback)
      })
    })

    describe("imscjs", () => {
      it("implementation is available when legacy subtitles override is false", (done) => {
        const mockMediaPlayer = {}
        const autoStart = true
        const mockPlaybackElement = document.createElement("div")
        const mockCallback = (result) => {
          expect(result).toBe(true)
          expect(IMSCSubtitles).toHaveBeenCalledTimes(1)
          done()
        }

        Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, null, mockMediaSources, mockCallback)
      })
    })
  })

  describe("generic calls", () => {
    const mockIMSCSubtitles = {
      start: jest.fn(),
      stop: jest.fn(),
      updatePosition: jest.fn(),
      customise: jest.fn(),
      renderExample: jest.fn(),
      clearExample: jest.fn(),
      tearDown: jest.fn(),
    }

    const mockMediaPlayer = {}
    const autoStart = true
    const mockPlaybackElement = document.createElement("div")
    const customDefaultStyle = {}

    beforeAll(() => {
      IMSCSubtitles.mockReturnValue(mockIMSCSubtitles)
    })

    beforeEach(() => {
      mockIMSCSubtitles.start.mockReset()
      mockIMSCSubtitles.stop.mockReset()
      mockIMSCSubtitles.updatePosition.mockReset()
      mockIMSCSubtitles.tearDown.mockReset()
    })

    describe("construction", () => {
      it("calls subtitles strategy with the correct arguments", (done) => {
        const mockCallback = (result) => {
          expect(result).toBe(true)
          expect(IMSCSubtitles).toHaveBeenCalledWith(
            mockMediaPlayer,
            autoStart,
            mockPlaybackElement,
            mockMediaSources,
            customDefaultStyle
          )
          done()
        }

        Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mockMediaSources, mockCallback)
      })
    })

    describe("show", () => {
      it("should start subtitles when enabled and available", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.enable()
            subtitles.show()

            expect(mockIMSCSubtitles.start).toHaveBeenCalledTimes(1)
            done()
          }
        )
      })

      it("should not start subtitles when disabled and available", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.disable()
            subtitles.show()

            expect(mockIMSCSubtitles.start).not.toHaveBeenCalled()
            done()
          }
        )
      })

      it("should not start subtitles when enabled and unavailable", (done) => {
        subtitlesAvailable = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.enable()
            subtitles.show()

            expect(mockIMSCSubtitles.start).not.toHaveBeenCalled()
            done()
          }
        )
      })

      it("should not start subtitles when disabled and unavailable", (done) => {
        subtitlesAvailable = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.disable()
            subtitles.show()

            expect(mockIMSCSubtitles.start).not.toHaveBeenCalled()
            done()
          }
        )
      })
    })

    describe("hide", () => {
      it("should stop subtitles when available", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.hide()

            expect(mockIMSCSubtitles.stop).toHaveBeenCalledTimes(1)
            done()
          }
        )
      })
    })

    describe("enable", () => {
      it("should set enabled state to true", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.enable()

            expect(subtitles.enabled()).toBe(true)
            done()
          }
        )
      })
    })

    describe("disable", () => {
      it("should set enabled state to false", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.disable()

            expect(mockIMSCSubtitles.stop).not.toHaveBeenCalled()
            expect(subtitles.enabled()).toBe(false)
            done()
          }
        )
      })
    })

    describe("enabled", () => {
      it("should return true if subtitles are enabled at construction", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.enabled()).toBe(true)
            done()
          }
        )
      })

      it("should return true if subtitles are enabled by an api call", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          false,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.enable()

            expect(subtitles.enabled()).toBe(true)
            done()
          }
        )
      })

      it("should return false if subtitles are disabled at construction", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          false,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.enabled()).toBe(false)
            done()
          }
        )
      })

      it("should return true if subtitles are disabled by an api call", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.disable()

            expect(subtitles.enabled()).toBe(false)
            done()
          }
        )
      })
    })

    describe("available", () => {
      it("should return true if VOD and url exists", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.enable()

            expect(subtitles.available()).toBe(true)
            done()
          }
        )
      })

      it("should return true if LIVE, url exists and no override", (done) => {
        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(true)
            done()
          }
        )
      })

      it("should return true if VOD, url exists and legacy override exists", (done) => {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true,
          },
        }

        subtitlesAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(true)
            done()
          }
        )
      })

      it("should return false if LIVE, url exists and legacy override exists", (done) => {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true,
          },
        }

        live = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(false)
            done()
          }
        )
      })

      it("should return false if VOD and no url exists", (done) => {
        subtitlesAvailable = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          false,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(false)
            done()
          }
        )
      })

      it("should return false if LIVE and no url exists", (done) => {
        subtitlesAvailable = false
        live = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(false)
            done()
          }
        )
      })
    })

    describe("setPosition", () => {
      it("calls through to subtitlesContainer updatePosition", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.setPosition("center")

            expect(mockIMSCSubtitles.updatePosition).toHaveBeenCalledWith("center")
            done()
          }
        )
      })
    })

    describe("customise", () => {
      it("passes through custom style object and enabled state to subtitlesContainer customise function", (done) => {
        const customStyleObj = { size: 0.7 }

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.customise(customStyleObj)

            expect(mockIMSCSubtitles.customise).toHaveBeenCalledWith(customStyleObj, true)
            done()
          }
        )
      })
    })

    describe("renderExample", () => {
      it("calls subtitlesContainer renderExample function with correct values", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            const exampleXMLString = "<tt></tt>"
            const customStyleObj = { size: 0.7 }
            const safePosition = { top: 0, right: 0, bottom: 0, left: 30 }
            subtitles.renderExample(exampleXMLString, customStyleObj, safePosition)

            expect(mockIMSCSubtitles.renderExample).toHaveBeenCalledWith(exampleXMLString, customStyleObj, safePosition)
            done()
          }
        )
      })
    })

    describe("clearExample", () => {
      it("calls subtitlesContainer clearExample function", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.clearExample()

            expect(mockIMSCSubtitles.clearExample).toHaveBeenCalledTimes(1)
            done()
          }
        )
      })
    })

    describe("tearDown", () => {
      it("calls through to subtitlesContainer tearDown", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          mockPlaybackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.tearDown()

            expect(mockIMSCSubtitles.tearDown).toHaveBeenCalledTimes(1)
            done()
          }
        )
      })
    })
  })
})
