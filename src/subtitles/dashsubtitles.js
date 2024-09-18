function DashSubtitles(mediaPlayer, autoStart, parentElement) {
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

  addCurrentSubtitlesElement()

  return {
    start,
    stop,
    customise: () => {},
    tearDown: () => {
      stop()
    },
  }
}

export default DashSubtitles
