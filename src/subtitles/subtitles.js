import Plugins from '../plugins'

function Subtitles (mediaPlayer, autoStart, playbackElement, defaultStyleOpts, mediaSources, callback) {
  const liveSubtitles = !!mediaSources.currentSubtitlesSegmentLength()
  const useLegacySubs = window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles || false

  let subtitlesEnabled = autoStart
  let subtitlesContainer

  if (useLegacySubs) {
    import('./legacysubtitles.js').then(({default: LegacySubtitles}) => {
      subtitlesContainer = LegacySubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
      callback(subtitlesEnabled)
    }).catch((e) => {
      Plugins.interface.onSubtitlesDynamicLoadError(e)
    })
  } else {
    import('./imscsubtitles.js').then(({default: IMSCSubtitles}) => {
      subtitlesContainer = IMSCSubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
      callback(subtitlesEnabled)
    }).catch((e) => {
      Plugins.interface.onSubtitlesDynamicLoadError(e)
    })
  }

  function enable () {
    subtitlesEnabled = true
  }

  function disable () {
    subtitlesEnabled = false
  }

  function show () {
    if (available() && enabled()) {
      subtitlesContainer && subtitlesContainer.start()
    }
  }

  function hide () {
    if (available()) {
      subtitlesContainer && subtitlesContainer.stop()
    }
  }

  function enabled () {
    return subtitlesEnabled
  }

  function available () {
    if (liveSubtitles && (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles)) {
      return false
    } else {
      return !!mediaSources.currentSubtitlesSource()
    }
  }

  function setPosition (position) {
    subtitlesContainer && subtitlesContainer.updatePosition(position)
  }

  function customise (styleOpts) {
    subtitlesContainer && subtitlesContainer.customise(styleOpts, subtitlesEnabled)
  }

  function renderExample (exampleXmlString, styleOpts, safePosition) {
    subtitlesContainer && subtitlesContainer.renderExample(exampleXmlString, styleOpts, safePosition)
  }

  function clearExample () {
    subtitlesContainer && subtitlesContainer.clearExample()
  }

  function tearDown () {
    subtitlesContainer && subtitlesContainer.tearDown()
  }

  return {
    enable: enable,
    disable: disable,
    show: show,
    hide: hide,
    enabled: enabled,
    available: available,
    setPosition: setPosition,
    customise: customise,
    renderExample: renderExample,
    clearExample: clearExample,
    tearDown: tearDown
  }
}

export default Subtitles
