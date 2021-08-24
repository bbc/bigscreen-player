import IMSCSubtitles from './imscsubtitles'
import { fromXML, generateISD, renderHTML } from 'smp-imsc'
import LoadUrl from '../utils/loadurl'
import Plugins from '../plugins'

jest.mock('smp-imsc')
jest.mock('../utils/loadurl')

jest.mock('../plugins', () => {
  return {
    interface: {
      onSubtitlesTimeout: jest.fn(),
      onSubtitlesXMLError: jest.fn(),
      onSubtitlesRenderError: jest.fn(),
      onSubtitlesTransformError: jest.fn()
    }
  }
})

describe('IMSC Subtitles', function () {
  var mockParentElement
  var fromXmlReturn
  var mediaPlayer
  var subtitles
  var mockMediaSources
  var subtitlesUrl
  var subtitlesCdn
  var segmentLength
  var epochStartTimeMilliseconds
  var avalailableSourceCount

  var LoadUrlStubResponseXml = '<?xml>'
  var LoadUrlStubResponseText

  function msToS (timeMs) {
    return timeMs / 1000
  }

  beforeEach(function () {
    subtitlesUrl = 'http://stub-subtitles.test'
    subtitlesCdn = 'supplier1'
    LoadUrlStubResponseText = '<?xml version="1.0" encoding="utf-8"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>'
    segmentLength = undefined
    epochStartTimeMilliseconds = undefined

    mediaPlayer = {
      'getCurrentTime': jest.fn()
    }
    mockMediaSources = {
      'currentSubtitlesSource': jest.fn(),
      'failoverSubtitles': jest.fn(),
      'currentSubtitlesSegmentLength': jest.fn(),
      'currentSubtitlesCdn': jest.fn(),
      'subtitlesRequestTimeout': jest.fn(),
      'time': jest.fn()
    }
    mockMediaSources.currentSubtitlesSource.mockImplementation(function () { return subtitlesUrl })
    mockMediaSources.failoverSubtitles.mockImplementation(function (postFailoverAction, failoverErrorAction) {
      if (avalailableSourceCount > 1) {
        avalailableSourceCount--
        postFailoverAction()
      } else {
        failoverErrorAction()
      }
    })
    mockMediaSources.currentSubtitlesSegmentLength.mockImplementation(function () { return segmentLength })
    mockMediaSources.currentSubtitlesCdn.mockImplementation(function () { return subtitlesCdn })
    mockMediaSources.time.mockImplementation(function () {
      return {
        windowStartTime: epochStartTimeMilliseconds
      }
    })

    jest.useFakeTimers()

    fromXmlReturn = {
      getMediaTimeEvents: function () {
        return [1, 3, 8]
      },
      head: {
        styling: {}
      },
      body: {
        contents: []
      }
    }

    renderHTML.mockImplementation(jest.fn())
    generateISD.mockReturnValue({ contents: ['mockContents'] })
    fromXML.mockReturnValue(fromXmlReturn)

    LoadUrl.mockImplementation(function (url, callbackObject) {
      callbackObject.onLoad(LoadUrlStubResponseXml, LoadUrlStubResponseText, 200)
    })

    mockParentElement = document.createElement('div')
    jest.spyOn(mockParentElement, 'clientWidth', 'get').mockReturnValue(200)
    jest.spyOn(mockParentElement, 'clientHeight', 'get').mockReturnValue(100)

    document.body.appendChild(mockParentElement)
  })

  afterEach(function () {
    jest.useRealTimers()
    LoadUrl.mockReset()
    fromXML.mockReset()
    generateISD.mockReset()
    renderHTML.mockReset()
    Plugins.interface.onSubtitlesRenderError.mockReset()
    document.body.removeChild(mockParentElement)
  })

  function progressTime (mediaPlayerTime) {
    mediaPlayer.getCurrentTime.mockReturnValue(mediaPlayerTime)
    jest.advanceTimersByTime(751)
  }

  describe('construction', function () {
    afterEach(function () {
      subtitles.stop()
    })

    it('is constructed with the correct interface', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      expect(subtitles).toEqual(expect.objectContaining({start: expect.any(Function), stop: expect.any(Function), updatePosition: expect.any(Function), tearDown: expect.any(Function)}))
    })

    it('autoplay argument starts the update loop', function () {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})
      progressTime(1.5)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })
  })

  describe('customisation', function () {
    it('overrides the subtitles styling metadata with supplied defaults when rendering', function () {
      var styleOpts = { backgroundColour: 'black', fontFamily: 'Arial' }
      var expectedOpts = { spanBackgroundColorAdjust: { transparent: 'black' }, fontFamily: 'Arial' }
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, styleOpts)

      subtitles.start()
      progressTime(9)

      expect(renderHTML).toHaveBeenCalledWith(expect.any(Object), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, expectedOpts)
    })

    it('overrides the subtitles styling metadata with supplied custom styles when rendering', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      var styleOpts = { size: 0.7, lineHeight: 0.9 }
      var expectedOpts = { sizeAdjust: 0.7, lineHeightAdjust: 0.9 }

      mediaPlayer.getCurrentTime.mockReturnValue(1)

      subtitles.start()
      subtitles.customise(styleOpts, true)

      expect(renderHTML).toHaveBeenCalledWith(expect.any(Object), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, expectedOpts)
    })

    it('merges the current subtitles styling metadata with new supplied custom styles when rendering', function () {
      var defaultStyleOpts = { backgroundColour: 'black', fontFamily: 'Arial' }
      var customStyleOpts = { size: 0.7, lineHeight: 0.9 }
      var expectedOpts = { spanBackgroundColorAdjust: { transparent: 'black' }, fontFamily: 'Arial', sizeAdjust: 0.7, lineHeightAdjust: 0.9 }

      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, defaultStyleOpts)

      mediaPlayer.getCurrentTime.mockReturnValue(1)

      subtitles.start()
      subtitles.customise(customStyleOpts, true)

      expect(renderHTML).toHaveBeenCalledWith(expect.any(Object), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, expectedOpts)
    })

    it('does not render custom styles when subtitles are not enabled', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      var subsEnabled = false
      subtitles.start()
      subtitles.customise({}, subsEnabled)

      expect(renderHTML).not.toHaveBeenCalled()
    })
  })

  describe('example rendering', function () {
    it('should call fromXML, generate and render when renderExample is called', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.renderExample('', {}, {})

      expect(fromXML).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it('should call renderHTML with a preview element with the correct structure when no position info', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, undefined)

      var exampleSubsElement = null
      var height = null
      var width = null
      renderHTML.mockImplementation(function (isd, subsElement, _, renderHeight, renderWidth) {
        exampleSubsElement = subsElement
        height = renderHeight
        width = renderWidth
      })

      subtitles.renderExample('', {}, {})

      expect(renderHTML).toHaveBeenCalledTimes(1)

      expect(exampleSubsElement.style.top).toBe('0px')
      expect(exampleSubsElement.style.right).toBe('0px')
      expect(exampleSubsElement.style.bottom).toBe('0px')
      expect(exampleSubsElement.style.left).toBe('0px')

      expect(height).toBe(100)
      expect(width).toBe(200)
    })

    it('should call renderHTML with a preview element with the correct structure when there is position info', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      var exampleSubsElement = null
      var height = null
      var width = null
      renderHTML.mockImplementation(function (isd, subsElement, _, renderHeight, renderWidth) {
        exampleSubsElement = subsElement
        height = renderHeight
        width = renderWidth
      })

      subtitles.renderExample('', {}, {
        top: 1,
        right: 2,
        bottom: 3,
        left: 4
      })

      expect(renderHTML).toHaveBeenCalledTimes(1)

      expect(exampleSubsElement.style.top).toBe('1px')
      expect(exampleSubsElement.style.right).toBe('4px')
      expect(exampleSubsElement.style.bottom).toBe('3px')
      expect(exampleSubsElement.style.left).toBe('8px')

      expect(height).toBe(96)
      expect(width).toBe(188)
    })
  })

  describe('Vod subtitles', function () {
    afterEach(function () {
      subtitles.stop()
    })

    it('Should load the subtitles url', function () {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))
    })

    it('Should load the next available url if loading of first XML fails', function () {
      avalailableSourceCount = 2
      LoadUrl.mockImplementation(function (url, callbackObject) {
        callbackObject.onError()
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledTimes(2)
    })

    it('Calls fromXML on creation with the extracted XML from the text property of the response argument', function () {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
    })

    it('Calls fromXML on creation with the original text property of the response argument if expected header is not found', function () {
      LoadUrlStubResponseText = '<?xml version="1.0" encoding="utf-8" extra property="something"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>'
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(fromXML).toHaveBeenCalledWith(LoadUrlStubResponseText)
    })

    it('fires tranformError plugin if IMSC throws an exception when parsing', function () {
      fromXML.mockImplementation(() => { throw new Error() })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(Plugins.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1)
    })

    it('fires subtitleTransformError if responseXML from the loader is invalid', function () {
      LoadUrl.mockImplementation(function (url, callbackObject) {
        callbackObject.onLoad(null, '', 200)
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})
      expect(Plugins.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1)
    })

    it('fires onSubtitlesTimeout if the xhr times out', function () {
      LoadUrl.mockImplementation(function (url, callbackObject) {
        callbackObject.onTimeout()
      })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledWith({cdn: subtitlesCdn})
      expect(Plugins.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1)
    })

    it('does not attempt to load subtitles if there is no subtitles url', function () {
      subtitlesUrl = undefined
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).not.toHaveBeenCalled()
    })

    it('should not load subtitles everytime we start if it is already loaded', function () {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))

      LoadUrl.mockReset()
      subtitles.stop()
      subtitles.start()

      expect(LoadUrl).not.toHaveBeenCalled()
    })

    it('cannot start when xml transforming has failed', function () {
      fromXML.mockImplementation(() => { throw new Error() })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it('does not try to generate and render when current time is undefined', function () {
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      progressTime(undefined)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it('does not try to generate and render when xml transforming has failed', function () {
      fromXML.mockImplementation(() => { throw new Error() })
      subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

      progressTime(1.5)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it('does not try to generate and render when the initial current time is less than the first subtitle time', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()

      progressTime(0.75)

      expect(generateISD).not.toHaveBeenCalled()
      expect(renderHTML).not.toHaveBeenCalled()
    })

    it('does attempt to generate and render when the initial current time is greater than the final subtitle time', function () {
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

    it('does attempt to generate and render when the initial current time is mid way through a stream', function () {
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()

      progressTime(4)

      expect(generateISD).toHaveBeenCalledTimes(1)
      expect(generateISD).toHaveBeenCalledWith(fromXmlReturn, 4)
      expect(renderHTML).toHaveBeenCalledTimes(1)
    })

    it('only generate and render when there are new subtitles to display', function () {
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

    it('no longer attempts any rendering if subtitles have been stopped', function () {
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

    it('no longer attempts any rendering if subtitles have been torn down', function () {
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

    it('fires onSubtitlesRenderError plugin if IMSC throws an exception when rendering', function () {
      renderHTML.mockImplementation(() => { throw new Error() })
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })

    it('fires onSubtitlesRenderError plugin if IMSC throws an exception when generating ISD', function () {
      generateISD.mockImplementation(() => { throw new Error() })
      subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

      subtitles.start()
      progressTime(1.5)

      expect(Plugins.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1)
    })
  })

  describe('Live subtitles', function () {
    beforeEach(function () {
      subtitlesUrl = 'https://subtitles/$segment$.test'
      segmentLength = 3.84
      epochStartTimeMilliseconds = 1614769200000 // Wednesday, 3 March 2021 11:00:00
    })

    afterEach(function () {
      subtitles.stop()
    })

    describe('Loading segments', function () {
      it('should load the first three segments with correct urls on the first update interval', function () {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512815.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512816.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512817.test', expect.any(Object))
      })

      it('should load the segment two segments ahead of current time', function () {
        // epochStartTimeSeconds = Wednesday, 3 March 2021 11:00:00
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        // At 13.84 seconds, we should be loading the segment correseponding to 21.52 seconds
        // 1614769221520 = Wednesday, 3 March 2021 11:00:21.52
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512818.test', expect.any(Object))
      })

      it('should not load a segment if segments array already contains it', function () {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512818.test', expect.any(Object))

        mediaPlayer.getCurrentTime.mockReturnValue(13.84) // time hasn't progressed. e.g. in paused state
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512818.test', expect.any(Object))
      })

      it('only keeps three segments when playing', function () {
        LoadUrl.mockClear()
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        progressTime(10)
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512815.test', expect.any(Object))

        progressTime(13.84)
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512818.test', expect.any(Object))

        progressTime(10)
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512815.test', expect.any(Object))
      })

      it('load three new segments when seeking back to a point where none of the segments are available', function () {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(113.84)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512815.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512816.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512817.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })

      it('loads three new segments when seeking forwards to a point where none of the segments are available', function () {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()
        mediaPlayer.getCurrentTime.mockReturnValue(100)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512838.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512839.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512840.test', expect.any(Object))
        expect(LoadUrl).toHaveBeenCalledTimes(3)
      })

      it('should not load segments when auto start is false', function () {
        subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it('should load segments when start is called and autoStart is false', function () {
        subtitles = IMSCSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()

        LoadUrl.mockReset()
        subtitles.start()

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512815.test', expect.any(Object))
      })

      it('calls fromXML with xml string where responseText contains more than a simple xml string', function () {
        LoadUrlStubResponseText = 'stuff that might exists before the xml string' + LoadUrlStubResponseText
        mediaPlayer.getCurrentTime.mockReturnValue(10)

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        jest.advanceTimersByTime(750)

        expect(fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>')
      })

      it('should stop loading segments when stop is called', function () {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        LoadUrl.mockReset()
        subtitles.stop()

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it('should not try to load segments when the currentTime is not known by the player', function () {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(-1000)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it('should stop loading segments when xml transforming has failed', function () {
        fromXML.mockImplementation(() => { throw new Error() })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()

        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).not.toHaveBeenCalled()
      })

      it('should not stop loading segments when the xml response is invalid', function () {
        LoadUrl.mockImplementation(function (url, callbackObject) {
          callbackObject.onLoad(null, '', 200)
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)

        LoadUrl.mockReset()

        mediaPlayer.getCurrentTime.mockReturnValue(13.84)
        jest.advanceTimersByTime(750)

        expect(LoadUrl).toHaveBeenCalledWith('https://subtitles/420512818.test', expect.any(Object))
      })

      it('should failover to the next url if loading of subtitles segments fails 3 times in a row', function () {
        LoadUrl.mockImplementation(function (url, callbackObject) {
          callbackObject.onError()
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        mediaPlayer.getCurrentTime.mockReturnValue(10)
        jest.advanceTimersByTime(750)
        // will attempt to load three segments after this tick

        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1)
      })

      it('should not failover if loading subtitles segments fails less than three times in a row', function () {
        var loadAttempts = 0
        LoadUrl.mockImplementation(function (url, callbackObject) {
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

      it('Should continue loading segments from next available url if loading from first subtitles url fails', function () {
        avalailableSourceCount = 2
        LoadUrl.mockImplementation(function (url, callbackObject) {
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

    describe('rendering', function () {
      var times = [[0, 1, 2, 3.84], [0, 3.84, 4, 7.68], [0, 7.68, 9, 9.7, 11.52]]
      var counter = -1

      generateISD.mockReturnValue({ contents: ['mockContents'] })

      fromXML.mockImplementation(function () {
        counter = counter + 1

        return {
          getMediaTimeEvents: function () {
            return times[counter]
          },
          mockCallId: counter,
          head: {
            styling: {}
          },
          body: {
            contents: new Array(1)
          }
        }
      })

      times = times.map(function (time) {
        return time.map(function (t) {
          return t === 0 ? t : t + msToS(epochStartTimeMilliseconds)
        })
      })
      beforeEach(() => {
        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})
      })

      afterEach(() => {
        generateISD.mockClear()
        renderHTML.mockClear()
      })

      it('should generate and render when time has progressed past a known un-rendered subtitles', function () {
        var times = [[0, 1, 2, 3.84], [0, 3.84, 4, 7.68], [0, 7.68, 9, 9.7, 11.52]]
        var counter = -1

        times = times.map(function (time) {
          return time.map(function (t) {
            return t === 0 ? t : t + msToS(epochStartTimeMilliseconds)
          })
        })

        generateISD.mockReturnValue({ contents: ['mockContents'] })

        fromXML.mockImplementation(function () {
          counter = counter + 1

          return {
            getMediaTimeEvents: function () {
              return times[counter]
            },
            mockCallId: counter,
            head: {
              styling: {}
            },
            body: {
              contents: new Array(1)
            }
          }
        })

        subtitles = IMSCSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {})

        progressTime(2.750)

        expect(generateISD).toHaveBeenCalledWith(expect.objectContaining({mockCallId: 0}), msToS(epochStartTimeMilliseconds) + 2.750)
        expect(renderHTML).toHaveBeenCalledWith(expect.objectContaining({ contents: ['mockContents'] }), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, {})

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(3.5)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(4.25)

        expect(generateISD).toHaveBeenCalledWith(expect.objectContaining({mockCallId: 1}), msToS(epochStartTimeMilliseconds) + 4.25)
        expect(renderHTML).toHaveBeenCalledWith(expect.objectContaining({ contents: ['mockContents'] }), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, {})

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

        expect(generateISD).toHaveBeenCalledWith(expect.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 8)
        expect(renderHTML).toHaveBeenCalledWith(expect.objectContaining({ contents: ['mockContents'] }), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, {})

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(8.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(9.5)

        expect(generateISD).toHaveBeenCalledWith(expect.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 9.5)
        expect(renderHTML).toHaveBeenCalledWith(expect.objectContaining({ contents: ['mockContents'] }), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, {})

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(10.25)

        expect(generateISD).toHaveBeenCalledWith(expect.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 10.25)
        expect(renderHTML).toHaveBeenCalledWith(expect.objectContaining({ contents: ['mockContents'] }), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, {})

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(11)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(11.75)

        expect(generateISD).toHaveBeenCalledWith(expect.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 11.75)
        expect(renderHTML).toHaveBeenCalledWith(expect.objectContaining({ contents: ['mockContents'] }), expect.any(HTMLDivElement), null, 100, 200, false, null, null, false, {})

        generateISD.mockClear()
        renderHTML.mockClear()

        progressTime(11.75)

        expect(generateISD).not.toHaveBeenCalled()
        expect(renderHTML).not.toHaveBeenCalled()
      })
    })
  })
})