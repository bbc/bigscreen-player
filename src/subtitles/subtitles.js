import Plugins from "../plugins"
import findSegmentTemplate from "../utils/findtemplate"

function Subtitles(mediaPlayer, autoStart, playbackElement, defaultStyleOpts, mediaSources, callback) {
  const useLegacySubs = window.bigscreenPlayer?.overrides?.legacySubtitles ?? false

  let subtitlesEnabled = autoStart
  let subtitlesContainer

  if (useLegacySubs) {
    import("./legacysubtitles.js")
      .then(({ default: LegacySubtitles }) => {
        subtitlesContainer = LegacySubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
        callback(subtitlesEnabled)
      })
      .catch(() => {
        Plugins.interface.onSubtitlesDynamicLoadError()
      })
  } else {
    import("./imscsubtitles.js")
      .then(({ default: IMSCSubtitles }) => {
        subtitlesContainer = IMSCSubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
        callback(subtitlesEnabled)
      })
      .catch(() => {
        Plugins.interface.onSubtitlesDynamicLoadError()
      })
  }

  function enable() {
    subtitlesEnabled = true
  }

  function disable() {
    subtitlesEnabled = false
  }

  function show() {
    if (available() && enabled()) {
      subtitlesContainer?.start()
    }
  }

  function hide() {
    if (available()) {
      subtitlesContainer?.stop()
    }
  }

  function enabled() {
    return subtitlesEnabled
  }

  function available() {
    const url = mediaSources.currentSubtitlesSource()

    if (!(typeof url === "string" && url !== "")) {
      return false
    }

    const isWhole = findSegmentTemplate(url) == null

    return isWhole || !useLegacySubs
  }

  function setPosition(position) {
    subtitlesContainer?.updatePosition(position)
  }

  function customise(styleOpts) {
    subtitlesContainer?.customise(styleOpts, subtitlesEnabled)
  }

  function renderExample(exampleXmlString, styleOpts, safePosition) {
    subtitlesContainer?.renderExample(exampleXmlString, styleOpts, safePosition)
  }

  function clearExample() {
    subtitlesContainer?.clearExample()
  }

  function tearDown() {
    subtitlesContainer?.tearDown()
  }

  return {
    enable,
    disable,
    show,
    hide,
    enabled,
    available,
    setPosition,
    customise,
    renderExample,
    clearExample,
    tearDown,
  }
}

export default Subtitles
