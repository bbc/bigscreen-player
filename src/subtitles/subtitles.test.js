
import Subtitles from './subtitles'

const mockLegacySubtitles = jest.fn()
jest.mock('./legacysubtitles', () => { return mockLegacySubtitles })

const mockImscSubtitles = jest.fn()
jest.mock('./imscsubtitles', () => { return mockImscSubtitles })

describe('Subtitles', function () {
  var mediaSourcesMock
  var subtitlesAvailable
  var live

  mediaSourcesMock = {
    subtitlesRequestTimeout: jest.fn(),
    currentSubtitlesSource: function () {
      if (subtitlesAvailable) {
        return 'http://subtitles.example.test'
      } else {
        return ''
      }
    },
    currentSubtitlesSegmentLength: function () {
      return live ? 3.84 : undefined
    }
  }

  beforeEach(function () {
    subtitlesAvailable = true
    live = false
  })

  afterEach(function () {
    window.bigscreenPlayer = {}
  })

  describe('strategy construction', function () {
    describe('legacy', function () {
      beforeEach(function () {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true
          }
        }
      })

      it('implementation is available when legacy subtitles override is true', function (done) {
        var mockMediaPlayer = {}
        var autoStart = true
        var mockPlaybackElement = document.createElement('div')
        const mockCallback = (result) => {
          expect(result).toBe(true)
          expect(mockLegacySubtitles).toHaveBeenCalledTimes(1)
          done()
        }

        Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, null, mediaSourcesMock, mockCallback)
      })
    })

    describe('imscjs', function () {
      it('implementation is available when legacy subtitles override is false', function (done) {
        var mockMediaPlayer = {}
        var autoStart = true
        var mockPlaybackElement = document.createElement('div')
        const mockCallback = (result) => {
          expect(result).toBe(true)
          expect(mockImscSubtitles).toHaveBeenCalledTimes(1)
          done()
        }

        Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, null, mediaSourcesMock, mockCallback)
      })
    })
  })

  describe('generic calls', function () {
    var subtitlesContainerSpies
    var subtitlesContainer

    const mockMediaPlayer = {}
    const autoStart = true
    const mockPlaybackElement = document.createElement('div')
    const customDefaultStyle = {}

    beforeEach(function () {
      subtitlesContainerSpies = {
        'start': jest.fn(),
        'stop': jest.fn(),
        'updatePosition': jest.fn(),
        'customise': jest.fn(),
        'renderExample': jest.fn(),
        'clearExample': jest.fn(),
        'tearDown': jest.fn()
      }
      subtitlesContainer = mockImscSubtitles
      subtitlesContainer.mockImplementation(function () {
        return subtitlesContainerSpies
      })
    })

    afterEach(function () {
      subtitlesContainerSpies.start.mockReset()
      subtitlesContainerSpies.stop.mockReset()
      subtitlesContainerSpies.updatePosition.mockReset()
      subtitlesContainerSpies.tearDown.mockReset()
    })

    describe('construction', function () {
      it('calls subtitles strategy with the correct arguments', function (done) {
        const mockCallback = (result) => {
          expect(result).toBe(true)
          expect(subtitlesContainer).toHaveBeenCalledWith(mockMediaPlayer, autoStart, mockPlaybackElement, mediaSourcesMock, customDefaultStyle)
          done()
        }

        Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('show', function () {
      it('should start subtitles when enabled and available', function (done) {
        const mockCallback = () => {
          subtitles.enable()
          subtitles.show()

          expect(subtitlesContainerSpies.start).toHaveBeenCalledTimes(1)
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should not start subtitles when disabled and available', function (done) {
        const mockCallback = () => {
          subtitles.disable()
          subtitles.show()

          expect(subtitlesContainerSpies.start).not.toHaveBeenCalled()
          done()
        }
        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should not start subtitles when enabled and unavailable', function (done) {
        const mockCallback = () => {
          subtitles.enable()
          subtitles.show()

          expect(subtitlesContainerSpies.start).not.toHaveBeenCalled()
          done()
        }

        subtitlesAvailable = false
        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should not start subtitles when disabled and unavailable', function (done) {
        const mockCallback = () => {
          subtitles.disable()
          subtitles.show()

          expect(subtitlesContainerSpies.start).not.toHaveBeenCalled()
          done()
        }

        subtitlesAvailable = false
        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('hide', function () {
      it('should stop subtitles when available', function (done) {
        const mockCallback = () => {
          subtitles.hide()

          expect(subtitlesContainerSpies.stop).toHaveBeenCalledTimes(1)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('enable', function () {
      it('should set enabled state to true', function (done) {
        const mockCallback = () => {
          subtitles.enable()

          expect(subtitles.enabled()).toEqual(true)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('disable', function () {
      it('should set enabled state to false', function (done) {
        const mockCallback = () => {
          subtitles.disable()

          expect(subtitlesContainerSpies.stop).not.toHaveBeenCalled()
          expect(subtitles.enabled()).toEqual(false)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('enabled', function () {
      it('should return true if subtitles are enabled at construction', function (done) {
        const mockCallback = () => {
          expect(subtitles.enabled()).toEqual(true)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, autoStart, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return true if subtitles are enabled by an api call', function (done) {
        const mockCallback = () => {
          subtitles.enable()

          expect(subtitles.enabled()).toEqual(true)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, false, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return false if subtitles are disabled at construction', function (done) {
        const mockCallback = () => {
          expect(subtitles.enabled()).toEqual(false)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, false, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return true if subtitles are disabled by an api call', function (done) {
        const mockCallback = () => {
          subtitles.disable()

          expect(subtitles.enabled()).toEqual(false)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('available', function () {
      it('should return true if VOD and url exists', function (done) {
        const mockCallback = () => {
          subtitles.enable()

          expect(subtitles.available()).toEqual(true)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return true if LIVE, url exists and no override', function (done) {
        const mockCallback = () => {
          expect(subtitles.available()).toEqual(true)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return true if VOD, url exists and legacy override exists', function (done) {
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true
          }
        }
        const mockCallback = () => {
          expect(subtitles.available()).toEqual(true)
          done()
        }

        subtitlesAvailable = true
        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return false if LIVE, url exists and legacy override exists', function (done) {
        live = true
        window.bigscreenPlayer = {
          overrides: {
            legacySubtitles: true
          }
        }

        const mockCallback = () => {
          expect(subtitles.available()).toEqual(false)
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return false if VOD and no url exists', function (done) {
        const mockCallback = () => {
          expect(subtitles.available()).toEqual(false)
          done()
        }

        subtitlesAvailable = false
        const subtitles = Subtitles(mockMediaPlayer, false, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })

      it('should return false if LIVE and no url exists', function (done) {
        subtitlesAvailable = false
        live = true

        const mockCallback = () => {
          expect(subtitles.available()).toEqual(false)
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('setPosition', function () {
      it('calls through to subtitlesContainer updatePosition', function (done) {
        const mockCallback = () => {
          subtitles.setPosition('center')

          expect(subtitlesContainerSpies.updatePosition).toHaveBeenCalledWith('center')
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('customise', function () {
      it('passes through custom style object and enabled state to subtitlesContainer customise function', function (done) {
        const customStyleObj = { size: 0.7 }

        const mockCallback = () => {
          subtitles.customise(customStyleObj)

          expect(subtitlesContainerSpies.customise).toHaveBeenCalledWith(customStyleObj, true)
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('renderExample', function () {
      it('calls subtitlesContainer renderExample function with correct values', function (done) {
        const mockCallback = () => {
          const exampleXMLString = '<tt></tt>'
          const customStyleObj = { size: 0.7 }
          const safePosition = { top: 0, right: 0, bottom: 0, left: 30 }
          subtitles.renderExample(exampleXMLString, customStyleObj, safePosition)

          expect(subtitlesContainerSpies.renderExample).toHaveBeenCalledWith(exampleXMLString, customStyleObj, safePosition)
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('clearExample', function () {
      it('calls subtitlesContainer clearExample function ', function (done) {
        const mockCallback = () => {
          subtitles.clearExample()

          expect(subtitlesContainerSpies.clearExample).toHaveBeenCalledTimes(1)
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })

    describe('tearDown', function () {
      it('calls through to subtitlesContainer tearDown', function (done) {
        const mockCallback = () => {
          subtitles.tearDown()

          expect(subtitlesContainerSpies.tearDown).toHaveBeenCalledTimes(1)
          done()
        }

        const subtitles = Subtitles(mockMediaPlayer, true, mockPlaybackElement, customDefaultStyle, mediaSourcesMock, mockCallback)
      })
    })
  })
})
