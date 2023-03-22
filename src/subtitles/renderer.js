import DebugTool from "../debugger/debugtool"
import Transformer from "./transformer"
import Plugins from "../plugins"

function Renderer(id, captionsXML, mediaPlayer) {
  let transformedSubtitles
  let liveItems = []
  let interval = 0
  let outputElement

  outputElement = document.createElement("div")
  outputElement.id = id

  transformedSubtitles = Transformer().transformXML(captionsXML)

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
    } catch (e) {
      DebugTool.info("Exception while rendering subtitles: " + e)
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
    const live = liveItems
    for (let i = live.length - 1; i >= 0; i--) {
      if (live[i].removeFromDomIfExpired(time)) {
        live.splice(i, 1)
      }
    }
  }

  function addNewCaptions(time) {
    const live = liveItems
    const fresh = transformedSubtitles.subtitlesForTime(time)
    liveItems = live.concat(fresh)
    for (let i = 0, j = fresh.length; i < j; i++) {
      // TODO: Probably start adding to the DOM here rather than calling through.
      fresh[i].addToDom(outputElement)
    }
  }

  return {
    render: render,
    start: start,
    stop: stop,
  }
}

export default Renderer
