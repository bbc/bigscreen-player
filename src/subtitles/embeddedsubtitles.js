import DOMHelpers from "../domhelpers"
import Utils from "../utils/playbackutils"

function EmbeddedSubtitles(mediaPlayer, autoStart, parentElement, mediaSources, defaultStyleOpts) {
  let currentSubtitlesElement

  let imscRenderOpts = transformStyleOptions(defaultStyleOpts)

  if (autoStart) {
    start()
    mediaPlayer.addEventCallback(this, onMediaPlayerReady)
  }

  function onMediaPlayerReady() {
    mediaPlayer.removeEventCallback(this, onMediaPlayerReady)
  }

  function removeCurrentSubtitlesElement() {
    if (currentSubtitlesElement) {
      DOMHelpers.safeRemoveElement(currentSubtitlesElement)
      currentSubtitlesElement = undefined
    }
  }

  function addCurrentSubtitlesElement() {
    removeCurrentSubtitlesElement()
    currentSubtitlesElement = document.createElement("div")
    currentSubtitlesElement.id = "bsp_subtitles"
    currentSubtitlesElement.style.position = "absolute"
    parentElement.appendChild(currentSubtitlesElement)
  }

  function start() {
    mediaPlayer.setSubtitles(true)
    customise(imscRenderOpts)
    if (!currentSubtitlesElement) {
      addCurrentSubtitlesElement()
    }
  }

  function stop() {
    mediaPlayer.setSubtitles(false)
  }

  function tearDown() {
    stop()
  }

  function customise(styleOpts) {
    const customStyleOptions = transformStyleOptions(styleOpts)
    imscRenderOpts = Utils.merge(imscRenderOpts, customStyleOptions)
    mediaPlayer.customiseSubtitles(imscRenderOpts)
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

  addCurrentSubtitlesElement()

  return {
    start,
    stop,
    customise,
    tearDown,
  }
}

export default EmbeddedSubtitles
