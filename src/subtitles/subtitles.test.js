/* eslint-disable jest/no-done-callback */
import IMSCSubtitles from "./imscsubtitles"
import LegacySubtitles from "./legacysubtitles"
import DashSubtitles from "./dashsubtitles"

import Subtitles from "./subtitles"

jest.mock("./imscsubtitles")
jest.mock("./legacysubtitles")
jest.mock("./dashsubtitles")

describe("Subtitles", () => {
  let isAvailable
  let isSegmented

  let playbackElement = null

  const mockMediaSources = {
    subtitlesRequestTimeout: jest.fn(),
    currentSubtitlesSource: jest.fn(() => {
      if (!isAvailable) {
        return ""
      }

      return isSegmented ? "mock://some.media/captions/$segment$.m4s" : "mock://some.media/captions/subtitles.xml"
    }),
    currentSubtitlesSegmentLength: jest.fn(() => (isSegmented ? 3.84 : null)),
  }

  beforeEach(() => {
    // Clean up settings on window
    window.bigscreenPlayer = {}

    // Clean up and initialise playback element
    playbackElement?.remove()
    playbackElement = document.createElement("div")
    document.body.append(playbackElement)

    // Reset captions state
    isAvailable = true
    isSegmented = false
  })

  describe("strategy construction", () => {
    describe("legacy", () => {
      beforeEach(() => {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true,
          },
        }

        LegacySubtitles.mockReset()
      })

      it("implementation is available when legacy subtitles override is true", (done) => {
        const mockMediaPlayer = {}
        const autoStart = true

        Subtitles(mockMediaPlayer, autoStart, playbackElement, null, mockMediaSources, (result) => {
          expect(result).toBe(true)
          expect(LegacySubtitles).toHaveBeenCalledTimes(1)
          done()
        })
      })

      it("implementation is not available when legacy subtitles override is true, but subtitles are segmented", (done) => {
        isSegmented = true
        const mockMediaPlayer = {}
        const autoStart = true

        Subtitles(mockMediaPlayer, autoStart, playbackElement, null, mockMediaSources, () => {
          expect(LegacySubtitles).not.toHaveBeenCalled()
          expect(IMSCSubtitles).not.toHaveBeenCalled()
          done()
        })
      })
    })

    describe("dash", () => {
      beforeEach(() => {
        window.bigscreenPlayer = {
          overrides: {
            dashSubtitles: true,
          },
        }

        DashSubtitles.mockReset()
      })

      it("implementation is available when dash subtitles override is true", (done) => {
        const mockMediaPlayer = {}
        const autoStart = true

        Subtitles(mockMediaPlayer, autoStart, playbackElement, null, mockMediaSources, (result) => {
          expect(result).toBe(true)
          expect(DashSubtitles).toHaveBeenCalledTimes(1)
          done()
        })
      })

      it("implementation is available when dash subtitles override is true, even if segmented URL is passed", (done) => {
        isSegmented = true
        const mockMediaPlayer = {}
        const autoStart = true

        Subtitles(mockMediaPlayer, autoStart, playbackElement, null, mockMediaSources, () => {
          expect(LegacySubtitles).not.toHaveBeenCalled()
          expect(IMSCSubtitles).not.toHaveBeenCalled()
          expect(DashSubtitles).toHaveBeenCalledTimes(1)
          done()
        })
      })
    })

    describe("imscjs", () => {
      it("implementation is available when legacy subtitles override is false", (done) => {
        const mockMediaPlayer = {}
        const autoStart = true

        Subtitles(mockMediaPlayer, autoStart, playbackElement, null, mockMediaSources, (result) => {
          expect(result).toBe(true)
          expect(IMSCSubtitles).toHaveBeenCalledTimes(1)
          done()
        })
      })
    })
  })

  describe("generic calls", () => {
    const mockSubtitlesInterface = {
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
    const customDefaultStyle = {}

    beforeAll(() => {
      // Mock one of the subtitle strategies with the interface
      IMSCSubtitles.mockReturnValue(mockSubtitlesInterface)
    })

    beforeEach(() => {
      mockSubtitlesInterface.start.mockReset()
      mockSubtitlesInterface.stop.mockReset()
      mockSubtitlesInterface.tearDown.mockReset()
      mockSubtitlesInterface.updatePosition.mockReset()
    })

    describe("construction", () => {
      it("calls subtitles strategy with the correct arguments", (done) => {
        Subtitles(mockMediaPlayer, autoStart, playbackElement, customDefaultStyle, mockMediaSources, (result) => {
          expect(result).toBe(true)
          expect(IMSCSubtitles).toHaveBeenCalledWith(
            mockMediaPlayer,
            autoStart,
            playbackElement,
            mockMediaSources,
            customDefaultStyle
          )
          done()
        })
      })
    })

    describe("show", () => {
      it("should start subtitles when enabled and available", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.enable()
            subtitles.show()

            expect(mockSubtitlesInterface.start).toHaveBeenCalledTimes(1)
            done()
          }
        )
      })

      it("should not start subtitles when disabled and available", (done) => {
        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.disable()
            subtitles.show()

            expect(mockSubtitlesInterface.start).not.toHaveBeenCalled()
            done()
          }
        )
      })

      it("should not start subtitles when enabled and unavailable", (done) => {
        isAvailable = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.enable()
            subtitles.show()

            expect(mockSubtitlesInterface.start).not.toHaveBeenCalled()
            done()
          }
        )
      })

      it("should not start subtitles when disabled and unavailable", (done) => {
        isAvailable = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.disable()
            subtitles.show()

            expect(mockSubtitlesInterface.start).not.toHaveBeenCalled()
            done()
          }
        )
      })
    })

    describe("hide", () => {
      it("should stop subtitles when available", (done) => {
        isAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.hide()

            expect(mockSubtitlesInterface.stop).toHaveBeenCalledTimes(1)
            done()
          }
        )
      })
    })

    describe("enable", () => {
      it("should set enabled state to true", (done) => {
        isAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
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
        isAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.disable()

            expect(mockSubtitlesInterface.stop).not.toHaveBeenCalled()
            expect(subtitles.enabled()).toBe(false)
            done()
          }
        )
      })
    })

    describe("enabled", () => {
      it("should return true if subtitles are enabled at construction", (done) => {
        isAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          autoStart,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.enabled()).toBe(true)
            done()
          }
        )
      })

      it("should return true if subtitles are enabled by an api call", (done) => {
        isAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          false,
          playbackElement,
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
        isAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          false,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.enabled()).toBe(false)
            done()
          }
        )
      })

      it("should return true if subtitles are disabled by an api call", (done) => {
        isAvailable = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
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
      it("returns true if url to subtitles delivered as a whole exists", (done) => {
        isAvailable = true
        isSegmented = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(true)
            done()
          }
        )
      })

      it("returns true if url to subtitles delivered as segments exists for imsc", (done) => {
        isAvailable = true
        isSegmented = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(true)
            done()
          }
        )
      })

      it("returns true for whole subtitles when legacy strategy is forced", (done) => {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true,
          },
        }

        isAvailable = true
        isSegmented = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(true)
            done()
          }
        )
      })

      it("returns true for segmented subtitles when no live support is defined in config", (done) => {
        isAvailable = true
        isSegmented = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(true)
            done()
          }
        )
      })

      it("returns false for segmented subtitles when the device is seekable but also legacy subs", (done) => {
        window.bigscreenPlayer = {
          liveSupport: "seekable",
          overrides: {
            legacySubtitles: true,
          },
        }

        isAvailable = true
        isSegmented = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(false)
            done()
          }
        )
      })

      it("returns false for segmented subtitles when the device is playable", (done) => {
        window.bigscreenPlayer = {
          liveSupport: "playable",
        }

        isAvailable = true
        isSegmented = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(false)
            done()
          }
        )
      })

      it("returns false for segmented subtitles when the device is restartable", (done) => {
        window.bigscreenPlayer = {
          liveSupport: "restartable",
        }

        isAvailable = true
        isSegmented = true

        const subtitles = Subtitles(
          mockMediaPlayer,
          true,
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            expect(subtitles.available()).toBe(false)
            done()
          }
        )
      })

      it("should return false when no url exists", (done) => {
        isAvailable = false

        const subtitles = Subtitles(
          mockMediaPlayer,
          false,
          playbackElement,
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
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.setPosition("center")

            expect(mockSubtitlesInterface.updatePosition).toHaveBeenCalledWith("center")
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
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.customise(customStyleObj)

            expect(mockSubtitlesInterface.customise).toHaveBeenCalledWith(customStyleObj, true)
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
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            const exampleXMLString = "<tt></tt>"
            const customStyleObj = { size: 0.7 }
            const safePosition = { top: 0, right: 0, bottom: 0, left: 30 }
            subtitles.renderExample(exampleXMLString, customStyleObj, safePosition)

            expect(mockSubtitlesInterface.renderExample).toHaveBeenCalledWith(
              exampleXMLString,
              customStyleObj,
              safePosition
            )
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
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.clearExample()

            expect(mockSubtitlesInterface.clearExample).toHaveBeenCalledTimes(1)
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
          playbackElement,
          customDefaultStyle,
          mockMediaSources,
          () => {
            subtitles.tearDown()

            expect(mockSubtitlesInterface.tearDown).toHaveBeenCalledTimes(1)
            done()
          }
        )
      })
    })
  })
})
