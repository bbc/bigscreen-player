import DOMHelpers from "../domhelpers"

function EmbeddedSubtitles(mediaPlayer, autoStart, parentElement) {
  let currentSubtitlesElement

  if (autoStart) {
    start()
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

  addCurrentSubtitlesElement()

  return {
    start,
    stop,
    customise: () => {},
    tearDown,
  }
}

export default EmbeddedSubtitles
