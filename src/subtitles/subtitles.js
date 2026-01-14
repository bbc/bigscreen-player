import Plugins from "../plugins"
import findSegmentTemplate from "../utils/findtemplate"

function Subtitles(
  mediaPlayer,
  playbackElement,
  mediaSources,
  callback,
  { alwaysOnTop, autoStart, defaultStyleOpts } = {}
) {
  const useLegacySubs = window.bigscreenPlayer?.overrides?.legacySubtitles ?? false
  const embeddedSubs = window.bigscreenPlayer?.overrides?.embeddedSubtitles ?? false

  const isSeekableLiveSupport =
    window.bigscreenPlayer.liveSupport == null || window.bigscreenPlayer.liveSupport === "seekable"

  let subtitlesEnabled = autoStart
  let subtitlesContainer

  if (available()) {
    if (useLegacySubs) {
      import("./legacysubtitles.js")
        .then(({ default: LegacySubtitles }) => {
          subtitlesContainer = LegacySubtitles(mediaPlayer, playbackElement, mediaSources, {
            alwaysOnTop,
            autoStart,
            defaultStyleOpts,
          })

          callback(subtitlesEnabled)
        })
        .catch(() => {
          Plugins.interface.onSubtitlesDynamicLoadError()
        })
    } else if (embeddedSubs) {
      import("./embeddedsubtitles.js")
        .then(({ default: EmbeddedSubtitles }) => {
          subtitlesContainer = EmbeddedSubtitles(mediaPlayer, playbackElement, {
            autoStart,
            defaultStyleOpts,
          })

          callback(subtitlesEnabled)
        })
        .catch(() => {
          Plugins.interface.onSubtitlesDynamicLoadError()
        })
    } else {
      import("./imscsubtitles.js")
        .then(({ default: IMSCSubtitles }) => {
          subtitlesContainer = IMSCSubtitles(mediaPlayer, playbackElement, mediaSources, {
            alwaysOnTop,
            autoStart,
            defaultStyleOpts,
          })

          callback(subtitlesEnabled)
        })
        .catch(() => {
          Plugins.interface.onSubtitlesDynamicLoadError()
        })
    }
  } else {
    /* This is needed to deal with a race condition wherein the Subtitles Callback runs before the Subtitles object
     * has finished construction. This is leveraging a feature of the Javascript Event Loop, specifically how it interacts
     * with Promises, called Microtasks.
     *
     * For more information, please see:
     * https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
     */
    Promise.resolve().then(() => {
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
    if (embeddedSubs) {
      return mediaPlayer && mediaPlayer.isSubtitlesAvailable()
    }

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

  function attemptSubtitleCdnFailover(opts) {
    hide()
    mediaSources
      .failoverSubtitles(opts)
      .then(() => show())
      .catch(() => DebugTool.info("No more CDNs available for subtitle failover"))
  }

  Plugins.updateContext((context) => ({ ...context, attemptSubtitleCdnFailover }))

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
