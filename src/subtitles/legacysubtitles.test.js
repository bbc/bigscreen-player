import LegacySubtitles from './legacysubtitles'
import TransportControlPosition from '../models/transportcontrolposition'
import LoadUrl from '../utils/loadurl'

jest.mock('../utils/loadurl')

'use strict'

var mockRendererSpy
var mockRendererConstructor
var legacySubtitles
var parentElement = document.createElement('div')
var loadUrlStubResponseXml = '<?xml>'
var loadUrlStubResponseText = 'loadUrlStubResponseText'
var pluginInterfaceMock
var pluginsMock
var subtitlesUrl
var subtitlesCdn
var mockMediaSources
var avalailableSourceCount

describe('Legacy Subtitles', function () {
  beforeEach(function () {
    mockRendererSpy = {
      'start': jest.fn(),
      'stop': jest.fn(),
      'render': jest.fn()
    }
    mockRendererConstructor = jest.fn(() => mockRendererSpy)
    mockRendererSpy.render.mockReturnValue(document.createElement('div'))

    LoadUrl.mockImplementation(function (url, callbackObject) {
      callbackObject.onLoad(loadUrlStubResponseXml, loadUrlStubResponseText, 200)
    })

    subtitlesUrl = 'http://stub-captions.test'
    subtitlesCdn = 'supplier1'
    mockMediaSources = {
      'currentSubtitlesSource': jest.fn(),
      'failoverSubtitles': jest.fn(),
      'subtitlesRequestTimeout': jest.fn(),
      'currentSubtitlesCdn': jest.fn()
    }
    mockMediaSources.currentSubtitlesSource.mockReturnValue(subtitlesUrl)
    mockMediaSources.currentSubtitlesCdn.mockReturnValue(subtitlesCdn)
    mockMediaSources.failoverSubtitles.mockImplementation(function (postFailoverAction, failoverErrorAction) {
      if (avalailableSourceCount > 1) {
        avalailableSourceCount--
        postFailoverAction()
      } else {
        failoverErrorAction()
      }
    })

    pluginInterfaceMock = {
      'onSubtitlesRenderError': jest.fn(),
      'onSubtitlesTimeout': jest.fn(),
      'onSubtitlesXMLError': jest.fn(),
      'onSubtitlesLoadError': jest.fn()
    }
    pluginsMock = { interface: pluginInterfaceMock }

    // 'bigscreenplayer/subtitles/renderer': mockRendererConstructor,
    // 'bigscreenplayer/utils/loadurl': loadUrlMock,
    // 'bigscreenplayer/plugins': pluginsMock
  })

  afterEach(function () {
    legacySubtitles.tearDown()
    mockRendererSpy.start.calls.reset()
    mockRendererSpy.stop.calls.reset()
    mockRendererSpy.render.calls.reset()
  })

  it('Should load the subtitles url if auto start is true', function () {
    var autoStart = true
    legacySubtitles = LegacySubtitles(null, autoStart, parentElement, mockMediaSources)

    expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))
  })

  it('Should not load the subtitles url if auto start is false', function () {
    var autoStart = false
    legacySubtitles = LegacySubtitles(null, autoStart, parentElement, mockMediaSources)

    expect(LoadUrl).not.toHaveBeenCalled()
  })

  it('Has a player subtitles class', function () {
    legacySubtitles = LegacySubtitles(null, true, parentElement, mockMediaSources)

    expect(parentElement.firstChild.className).toContain('playerCaptions')
  })

  it('Should fire subtitlesXMLError if responseXML from the loader is invalid', function () {
    LoadUrl.mockImplementation(function (url, callbackObject) {
      callbackObject.onLoad(null, '', 200)
    })
    legacySubtitles = LegacySubtitles(null, true, parentElement, mockMediaSources)

    expect(pluginsMock.interface.onSubtitlesXMLError).toHaveBeenCalledWith({cdn: subtitlesCdn})
    expect(pluginsMock.interface.onSubtitlesXMLError).toHaveBeenCalledTimes(1)
  })

  it('Should try to failover to the next url if responseXML from the loader is invalid', function () {
    avalailableSourceCount = 1
    LoadUrl.mockImplementation(function (url, callbackObject) {
      callbackObject.onError(404)
    })
    legacySubtitles = LegacySubtitles(null, true, parentElement, mockMediaSources)

    expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), 404)
    expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1)
  })

  it('Should fire onSubtitlesTimeout if the XHR times out', function () {
    LoadUrl.mockImplementation(function (url, callbackObject) {
      callbackObject.onTimeout()
    })
    legacySubtitles = LegacySubtitles(null, true, parentElement, mockMediaSources)

    expect(pluginsMock.interface.onSubtitlesTimeout).toHaveBeenCalledWith({cdn: subtitlesCdn})
    expect(pluginsMock.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1)
  })

  describe('Start', function () {
    it('Should call start on the renderer when the renderer exists', function () {
      legacySubtitles = LegacySubtitles(null, true, parentElement, mockMediaSources)

      legacySubtitles.start()

      expect(mockRendererSpy.start).toHaveBeenCalledWith()
    })

    it('Should load the subtitle url and create the renderer when the renderer doesnt exist', function () {
      legacySubtitles = LegacySubtitles(null, false, parentElement, mockMediaSources)

      legacySubtitles.start()

      expect(LoadUrl).toHaveBeenCalledWith(subtitlesUrl, expect.any(Object))
      expect(mockRendererConstructor).toHaveBeenCalledWith('playerCaptions', expect.any(String), null)
    })

    it('Should not start subtitles if there is invalid xml in the response object', function () {
      LoadUrl.mockImplementation(function (url, callbackObject) {
        callbackObject.onError()
      })
      legacySubtitles = LegacySubtitles(null, false, parentElement, mockMediaSources)

      legacySubtitles.start()

      expect(mockRendererConstructor).not.toHaveBeenCalled()
    })
  })

  describe('Stop', function () {
    it('Stops the subtitles if there is valid xml in the response object', function () {
      legacySubtitles = LegacySubtitles(null, true, parentElement, mockMediaSources)
      legacySubtitles.stop()

      expect(mockRendererSpy.stop).toHaveBeenCalledWith()
    })

    it('Does not stop the subtitles if there is is invalid xml in the response object', function () {
      LoadUrl.mockImplementation(function (url, callbackObject) {
        callbackObject.onError()
      })

      legacySubtitles = new LegacySubtitles(null, true, parentElement, mockMediaSources)
      legacySubtitles.stop()

      expect(mockRendererSpy.stop).not.toHaveBeenCalledWith()
    })
  })

  describe('Updating position', function () {
    // beforeEach(function () {
    //   legacySubtitles = LegacySubtitles(null, true, parentElement, mockMediaSources)
    // })

    //   [ {className: 'controlsVisible', pos: TransportControlPosition.CONTROLS_ONLY},
    //   {className: 'controlsWithInfoVisible', pos: TransportControlPosition.CONTROLS_WITH_INFO},
    //   {className: 'leftCarouselVisible', pos: TransportControlPosition.LEFT_CAROUSEL},
    //   {className: 'bottomCarouselVisible', pos: TransportControlPosition.BOTTOM_CAROUSEL}].forEach(function (position) {
    //     it('Has class ' + position.className + ' for position ' + position.pos, function () {
    //       legacySubtitles.updatePosition(position.pos)

    //       expect(parentElement.firstChild.className).toContain(position.className)
    //     })
    //   })

    it('Replaces classes when position changed', function () {
      legacySubtitles.updatePosition(TransportControlPosition.CONTROLS_ONLY)

      expect(parentElement.firstChild.className).toContain('controlsVisible')
      legacySubtitles.updatePosition(TransportControlPosition.CONTROLS_WITH_INFO)

      expect(parentElement.firstChild.className).not.toContain('controlsVisible')
    })
  })
})
