import DebugTool from '../debugger/debugtool'
import Transformer from './transformer'
import Plugins from '../plugins'

function Renderer (id, captionsXML, mediaPlayer) {
  var transformedSubtitles
  var liveItems = []
  var interval = 0
  var outputElement
  outputElement = document.createElement('div')
  outputElement.id = id

  transformedSubtitles = Transformer().transformXML(captionsXML)

  start()

  function render () {
    return outputElement
  }

  function start () {
    if (transformedSubtitles) {
      interval = setInterval(function () { update() }, 750)
      if (outputElement) {
        outputElement.setAttribute('style', transformedSubtitles.baseStyle)
        outputElement.style.cssText = transformedSubtitles.baseStyle
        outputElement.style.display = 'block'
      }
    }
  }

  function stop () {
    if (outputElement) {
      outputElement.style.display = 'none'
    }

    cleanOldCaptions(mediaPlayer.getDuration())
    clearInterval(interval)
  }

  function update () {
    try {
      if (!mediaPlayer) {
        stop()
      }

      var time = mediaPlayer.getCurrentTime()
      updateCaptions(time)

      confirmCaptionsRendered()
    } catch (e) {
      DebugTool.info('Exception while rendering subtitles: ' + e)
      Plugins.interface.onSubtitlesRenderError()
    }
  }

  function confirmCaptionsRendered () {
    if (outputElement && !outputElement.hasChildNodes() && liveItems.length > 0) {
      Plugins.interface.onSubtitlesRenderError()
    }
  }

  function updateCaptions (time) {
    cleanOldCaptions(time)
    addNewCaptions(time)
  }

  function cleanOldCaptions (time) {
    var live = liveItems
    for (var i = live.length - 1; i >= 0; i--) {
      if (live[i].removeFromDomIfExpired(time)) {
        live.splice(i, 1)
      }
    }
  }

  function addNewCaptions (time) {
    var live = liveItems
    var fresh = transformedSubtitles.subtitlesForTime(time)
    liveItems = live.concat(fresh)
    for (var i = 0, j = fresh.length; i < j; i++) {
      // TODO: Probably start adding to the DOM here rather than calling through.
      fresh[i].addToDom(outputElement)
    }
  }

  return {
    render: render,
    start: start,
    stop: stop
  }
}

export default Renderer
