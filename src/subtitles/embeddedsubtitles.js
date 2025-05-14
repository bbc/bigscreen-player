import { fromXML, generateISD, renderHTML } from "smp-imsc"
import DOMHelpers from "../domhelpers"
import Utils from "../utils/playbackutils"
import DebugTool from "../debugger/debugtool"
import Plugins from "../plugins"

function EmbeddedSubtitles(mediaPlayer, autoStart, parentElement, _mediaSources, defaultStyleOpts) {
  let exampleSubtitlesElement
  let imscRenderOpts = transformStyleOptions(defaultStyleOpts)
  let subtitlesEnabled = false

  // Call start upon first event
  if (autoStart) {
    mediaPlayer.addEventCallback(function startSubs() {
      start()
      mediaPlayer.removeEventCallback(startSubs)
    })
  }

  function removeExampleSubtitlesElement() {
    if (exampleSubtitlesElement) {
      DOMHelpers.safeRemoveElement(exampleSubtitlesElement)
      exampleSubtitlesElement = undefined
    }
  }

  function renderExample(exampleXmlString, styleOpts, safePosition = {}) {
    const exampleXml = fromXML(exampleXmlString)
    removeExampleSubtitlesElement()

    const customStyleOptions = transformStyleOptions(styleOpts)
    const exampleStyle = Utils.merge(imscRenderOpts, customStyleOptions)

    exampleSubtitlesElement = document.createElement("div")
    exampleSubtitlesElement.id = "subtitlesPreview"
    exampleSubtitlesElement.style.position = "absolute"

    const elementWidth = parentElement.clientWidth
    const elementHeight = parentElement.clientHeight
    const topPixels = ((safePosition.top || 0) / 100) * elementHeight
    const rightPixels = ((safePosition.right || 0) / 100) * elementWidth
    const bottomPixels = ((safePosition.bottom || 0) / 100) * elementHeight
    const leftPixels = ((safePosition.left || 0) / 100) * elementWidth

    const renderWidth = elementWidth - leftPixels - rightPixels
    const renderHeight = elementHeight - topPixels - bottomPixels

    exampleSubtitlesElement.style.top = `${topPixels}px`
    exampleSubtitlesElement.style.right = `${rightPixels}px`
    exampleSubtitlesElement.style.bottom = `${bottomPixels}px`
    exampleSubtitlesElement.style.left = `${leftPixels}px`
    parentElement.appendChild(exampleSubtitlesElement)

    renderSubtitle(exampleXml, 1, exampleSubtitlesElement, exampleStyle, renderHeight, renderWidth)
  }

  function renderSubtitle(xml, currentTime, subsElement, styleOpts, renderHeight, renderWidth) {
    try {
      const isd = generateISD(xml, currentTime)
      renderHTML(isd, subsElement, null, renderHeight, renderWidth, false, null, null, false, styleOpts)
    } catch (error) {
      error.name = "SubtitlesRenderError"
      DebugTool.error(error)

      Plugins.interface.onSubtitlesRenderError()
    }
  }

  function start() {
    subtitlesEnabled = true
    mediaPlayer.setSubtitles(true)
    mediaPlayer.customiseSubtitles(imscRenderOpts)
  }

  function stop() {
    subtitlesEnabled = false
    mediaPlayer.setSubtitles(false)
  }

  function tearDown() {
    stop()
  }

  function customise(styleOpts) {
    const customStyleOptions = transformStyleOptions(styleOpts)
    imscRenderOpts = Utils.merge(imscRenderOpts, customStyleOptions)
    mediaPlayer.customiseSubtitles(imscRenderOpts)
    if (subtitlesEnabled) {
      stop()
      start()
    }
  }

  // Opts: { backgroundColour: string (css colour, hex), fontFamily: string , size: number, lineHeight: number }
  function transformStyleOptions(opts) {
    if (opts === undefined) return

    const customStyles = {}

    if (opts.backgroundColour) {
      customStyles.spanBackgroundColorAdjust = { transparent: opts.backgroundColour }
    }

    if (opts.fontFamily) {
      customStyles.fontFamily = opts.fontFamily
    }

    if (opts.size > 0) {
      customStyles.sizeAdjust = opts.size
    }

    if (opts.lineHeight) {
      customStyles.lineHeightAdjust = opts.lineHeight
    }

    return customStyles
  }

  return {
    start,
    stop,
    updatePosition: () => {},
    customise,
    renderExample,
    clearExample: removeExampleSubtitlesElement,
    tearDown,
  }
}

export default EmbeddedSubtitles
