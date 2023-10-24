import Plugins from "../plugins"
import DebugTool from "../debugger/debugtool"
import findSegmentTemplate from "../utils/findtemplate"
import pickSubtitleStrategy from "./pick-subtitles-strategy"

function Subtitles(mediaPlayer, autoStart, playbackElement, defaultStyleOpts, mediaSources, callback) {
  const useLegacySubs = window.bigscreenPlayer?.overrides?.legacySubtitles ?? false
  const isSeekableLiveSupport =
    window.bigscreenPlayer.liveSupport == null || window.bigscreenPlayer.liveSupport === "seekable"

  let subtitlesEnabled = autoStart
  let subtitlesContainer

  DebugTool.info(`Subtitles are ${available() ? "available" : "unavailable."}`)

  if (available()) {
    pickSubtitleStrategy()
      .then((SubtitlesStrategy) => {
        subtitlesContainer = SubtitlesStrategy(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)

        callback(subtitlesEnabled)
      })
      .catch((error) => {
        DebugTool.info("Failed to load subtitles strategy")
        DebugTool.error(error)

        Plugins.interface.onSubtitlesDynamicLoadError()
      })
  } else {
    /* This is needed to deal with a race condition wherein the Subtitles Callback runs before the Subtitles object
     * has finished construction. This is leveraging a feature of the Javascript Event Loop, specifically how it interacts
     * with Promises, called Microtasks.
     *
     * For more information, please see:
     * https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
     */
    Promise.resolve().then(() => {
      DebugTool.info("Won't load unavailable subtitles")

      callback(subtitlesEnabled)
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

    return isWhole || (!useLegacySubs && isSeekableLiveSupport)
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
