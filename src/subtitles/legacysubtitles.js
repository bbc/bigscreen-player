import Renderer from './renderer'
import TransportControlPosition from '../models/transportcontrolposition'
import DOMHelpers from '../domhelpers'
import LoadURL from '../utils/loadurl'
import DebugTool from '../debugger/debugtool'
import Plugins from '../plugins'

function LegacySubtitles (mediaPlayer, autoStart, parentElement, mediaSources) {
  const container = document.createElement('div')
  let subtitlesRenderer

  if (autoStart) {
    start()
  }

  function loadSubtitles () {
    const url = mediaSources.currentSubtitlesSource()

    if (url && url !== '') {
      LoadURL(url, {
        timeout: mediaSources.subtitlesRequestTimeout(),
        onLoad: (responseXML, responseText, status) => {
          if (!responseXML) {
            DebugTool.info('Error: responseXML is invalid.')
            Plugins.interface.onSubtitlesXMLError({cdn: mediaSources.currentSubtitlesCdn()})
            return
          } else {
            createContainer(responseXML)
          }
        },
        onError: ({statusCode}) => {
          const errorCase = () => { DebugTool.info('Failed to load from subtitles file from all available CDNs') }
          DebugTool.info('Error loading subtitles data: ' + statusCode)
          mediaSources.failoverSubtitles(loadSubtitles, errorCase, statusCode)
        },
        onTimeout: () => {
          DebugTool.info('Request timeout loading subtitles')
          Plugins.interface.onSubtitlesTimeout({cdn: mediaSources.currentSubtitlesCdn()})
        }
      })
    }
  }

  function createContainer (xml) {
    container.id = 'playerCaptionsContainer'
    DOMHelpers.addClass(container, 'playerCaptions')

    // TODO: We don't need this extra Div really... can we get rid of render() and use the passed in container?
    subtitlesRenderer = Renderer('playerCaptions', xml, mediaPlayer)
    container.appendChild(subtitlesRenderer.render())

    parentElement.appendChild(container)
  }

  function start () {
    if (subtitlesRenderer) {
      subtitlesRenderer.start()
    } else {
      loadSubtitles()
    }
  }

  function stop () {
    if (subtitlesRenderer) {
      subtitlesRenderer.stop()
    }
  }

  function updatePosition (transportControlPosition) {
    const classes = {
      controlsVisible: TransportControlPosition.CONTROLS_ONLY,
      controlsWithInfoVisible: TransportControlPosition.CONTROLS_WITH_INFO,
      leftCarouselVisible: TransportControlPosition.LEFT_CAROUSEL,
      bottomCarouselVisible: TransportControlPosition.BOTTOM_CAROUSEL
    }

    for (const cssClassName in classes) {
      if (classes.hasOwnProperty(cssClassName)) {
        // Allow multiple flags to be set at once
        if ((classes[cssClassName] & transportControlPosition) === classes[cssClassName]) {
          DOMHelpers.addClass(container, cssClassName)
        } else {
          DOMHelpers.removeClass(container, cssClassName)
        }
      }
    }
  }

  function tearDown () {
    stop()
    DOMHelpers.safeRemoveElement(container)
  }

  return {
    start: start,
    stop: stop,
    updatePosition: updatePosition,
    customise: () => {},
    renderExample: () => {},
    clearExample: () => {},
    tearDown: tearDown
  }
}

export default LegacySubtitles
