import DebugTool from "../debugger/debugtool"
import Transformer from "./transformer"
import Plugins from "../plugins"

function Renderer(id, captionsXML, mediaPlayer) {
  const outputElement = document.createElement("div")
  const transformedSubtitles = Transformer().transformXML(captionsXML)

  let liveItems = []
  let interval = 0

  outputElement.id = id

  start()

  function render() {
    return outputElement
  }

  function start() {
    if (transformedSubtitles) {
      interval = setInterval(() => update(), 750)
      if (outputElement) {
        outputElement.setAttribute("style", transformedSubtitles.baseStyle)
        outputElement.style.cssText = transformedSubtitles.baseStyle
        outputElement.style.display = "block"
      }
    }
  }

  function stop() {
    if (outputElement) {
      outputElement.style.display = "none"
    }

    cleanOldCaptions(mediaPlayer.getDuration())
    clearInterval(interval)
  }

  function update() {
    try {
      if (!mediaPlayer) {
        stop()
      }

      const time = mediaPlayer.getCurrentTime()
      updateCaptions(time)

      confirmCaptionsRendered()
    } catch (error) {
      DebugTool.info(`Exception while rendering subtitles: ${error}`)
      Plugins.interface.onSubtitlesRenderError()
    }
  }

  function confirmCaptionsRendered() {
    if (outputElement && !outputElement.hasChildNodes() && liveItems.length > 0) {
      Plugins.interface.onSubtitlesRenderError()
    }
  }

  function updateCaptions(time) {
    cleanOldCaptions(time)
    addNewCaptions(time)
  }

  function cleanOldCaptions(time) {
    for (let idx = liveItems.length - 1; idx >= 0; idx--) {
      if (liveItems[idx].removeFromDomIfExpired(time)) {
        liveItems.splice(idx, 1)
      }
    }
  }

  function addNewCaptions(time) {
    const fresh = transformedSubtitles.subtitlesForTime(time)
    liveItems = [...liveItems, ...fresh]

    for (let idx = 0; idx < fresh.length; idx++) {
      // TODO: Probably start adding to the DOM here rather than calling through.
      fresh[idx].addToDom(outputElement)
    }
  }

  return {
    render,
    start,
    stop,
  }
}

export default Renderer
