import Renderer from "./renderer"
import TransportControlPosition from "../models/transportcontrolposition"
import DOMHelpers from "../domhelpers"
import LoadURL from "../utils/loadurl"
import DebugTool from "../debugger/debugtool"
import Plugins from "../plugins"

function LegacySubtitles(mediaPlayer, autoStart, parentElement, mediaSources) {
  const container = document.createElement("div")
  let subtitlesRenderer

  if (autoStart) {
    start()
  }

  function loadSubtitles() {
    const url = mediaSources.currentSubtitlesSource()

    if (url && url !== "") {
      LoadURL(url, {
        timeout: mediaSources.subtitlesRequestTimeout(),
        onLoad: (responseXML) => {
          if (responseXML) {
            createContainer(responseXML)
          } else {
            DebugTool.info("Error: responseXML is invalid.")
            Plugins.interface.onSubtitlesXMLError({ cdn: mediaSources.currentSubtitlesCdn() })
          }
        },
        onError: ({ statusCode, ...rest } = {}) => {
          DebugTool.info(`Error loading subtitles data: ${statusCode}`)

          mediaSources
            .failoverSubtitles({ statusCode, ...rest })
            .then(() => loadSubtitles())
            .catch(() => DebugTool.info("Failed to load from subtitles file from all available CDNs"))
        },
        onTimeout: () => {
          DebugTool.info("Request timeout loading subtitles")
          Plugins.interface.onSubtitlesTimeout({ cdn: mediaSources.currentSubtitlesCdn() })
        },
      })
    }
  }

  function createContainer(xml) {
    container.id = "playerCaptionsContainer"
    DOMHelpers.addClass(container, "playerCaptions")

    const videoHeight = parentElement.clientHeight

    container.style.position = "absolute"
    container.style.bottom = "0px"
    container.style.right = "0px"
    container.style.fontWeight = "bold"
    container.style.textAlign = "center"
    container.style.textShadow = "#161616 2px 2px 1px"
    container.style.color = "#ebebeb"

    if (videoHeight === 1080) {
      container.style.width = "1824px"
      container.style.fontSize = "63px"
      container.style.paddingRight = "48px"
      container.style.paddingLeft = "48px"
      container.style.paddingBottom = "60px"
    } else {
      // Assume 720 if not 1080. Styling implementation could be cleaner, but this is a quick fix for legacy subtitles
      container.style.width = "1216px"
      container.style.fontSize = "42px"
      container.style.paddingRight = "32px"
      container.style.paddingLeft = "32px"
      container.style.paddingBottom = "40px"
    }

    // TODO: We don't need this extra Div really... can we get rid of render() and use the passed in container?
    subtitlesRenderer = Renderer("playerCaptions", xml, mediaPlayer)
    container.appendChild(subtitlesRenderer.render())

    parentElement.appendChild(container)
  }

  function start() {
    if (subtitlesRenderer) {
      subtitlesRenderer.start()
    } else {
      loadSubtitles()
    }
  }

  function stop() {
    if (subtitlesRenderer) {
      subtitlesRenderer.stop()
    }
  }

  function updatePosition(transportControlPosition) {
    const classes = {
      controlsVisible: TransportControlPosition.CONTROLS_ONLY,
      controlsWithInfoVisible: TransportControlPosition.CONTROLS_WITH_INFO,
      leftCarouselVisible: TransportControlPosition.LEFT_CAROUSEL,
      bottomCarouselVisible: TransportControlPosition.BOTTOM_CAROUSEL,
    }

    for (const cssClassName in classes) {
      // eslint-disable-next-line no-prototype-builtins
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

  function tearDown() {
    stop()
    DOMHelpers.safeRemoveElement(container)
  }

  return {
    start,
    stop,
    updatePosition,
    customise: () => {},
    renderExample: () => {},
    clearExample: () => {},
    tearDown,
  }
}

export default LegacySubtitles
