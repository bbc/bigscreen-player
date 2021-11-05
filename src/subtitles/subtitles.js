import Plugins from '../plugins'
import DebugTool from '../debugger/debugtool'

function Subtitles (mediaPlayer, autoStart, playbackElement, defaultStyleOpts, mediaSources, callback) {
  const liveSubtitles = !!mediaSources.currentSubtitlesSegmentLength()
  const useLegacySubs = window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles || false

  let subtitlesEnabled = autoStart
  let subtitlesContainer

  DebugTool.info('Subtitles loading start')

  window.onerror = function (msg, url, lineNo, columnNo, error) {
    DebugTool.info('Window onError')
    var message = [
      'Message: ' + msg,
      'URL: ' + url,
      'Line: ' + lineNo,
      'Column: ' + columnNo,
      'Error object: ' + JSON.stringify(error)
    ].join(' - ')

    DebugTool.info(message)
  }

  if (useLegacySubs) {
    import('./legacysubtitles.js').then(({default: LegacySubtitles}) => {
      subtitlesContainer = LegacySubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
      callback(subtitlesEnabled)
    }).catch((e) => {
      Plugins.interface.onSubtitlesDynamicLoadError(e)
    })
  } else {
    try {
      import('./imscsubtitles.js').then(({default: IMSCSubtitles}) => {
        subtitlesContainer = IMSCSubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
        callback(subtitlesEnabled)
      }).catch((evt) => {
        DebugTool.info('IMSC Dynamic load error')
        DebugTool.info(evt)
        DebugTool.info(JSON.stringify(evt))
        Plugins.interface.onSubtitlesDynamicLoadError(evt)
      })
    } catch (error) {
      DebugTool.info('IMSC try catch error')
      DebugTool.info(error)
    }
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
