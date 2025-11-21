import PlaybackUtils from "./utils/playbackutils"
import CallCallbacks from "./utils/callcallbacks"

let plugins = []

function callOnAllPlugins(funcKey, evt) {
  const clonedEvent = PlaybackUtils.deepClone(evt)
  const selectedPlugins = plugins
    .filter((plugin) => plugin[funcKey] && typeof plugin[funcKey] === "function")
    .map((plugin) => plugin[funcKey].bind(plugin))

  CallCallbacks(selectedPlugins, clonedEvent)
}

export default {
  registerPlugin: (plugin) => {
    plugins.push(plugin)
  },

  unregisterPlugin: (plugin) => {
    if (!plugin && plugins.length > 0) {
      plugins = []
    } else {
      for (let pluginsIndex = plugins.length - 1; pluginsIndex >= 0; pluginsIndex--) {
        if (plugins[pluginsIndex] === plugin) {
          plugins.splice(pluginsIndex, 1)
        }
      }
    }
  },

  interface: {
    onError: (evt) => callOnAllPlugins("onError", evt),
    onFatalError: (evt) => callOnAllPlugins("onFatalError", evt),
    onErrorCleared: (evt) => callOnAllPlugins("onErrorCleared", evt),
    onErrorHandled: (evt) => callOnAllPlugins("onErrorHandled", evt),
    onBuffering: (evt) => callOnAllPlugins("onBuffering", evt),
    onBufferingCleared: (evt) => callOnAllPlugins("onBufferingCleared", evt),
    onScreenCapabilityDetermined: (tvInfo) => callOnAllPlugins("onScreenCapabilityDetermined", tvInfo),
    onPlayerInfoUpdated: (evt) => callOnAllPlugins("onPlayerInfoUpdated", evt),
    onManifestLoaded: (manifest) => callOnAllPlugins("onManifestLoaded", manifest),
    onManifestParseError: (evt) => callOnAllPlugins("onManifestParseError", evt),
    onDownloadQualityChange: (evt) => callOnAllPlugins("onDownloadQualityChange", evt),
    onQualityChangeRequested: (evt) => callOnAllPlugins("onQualityChangeRequested", evt),
    onQualityChangeRendered: (evt) => callOnAllPlugins("onQualityChangeRendered", evt),
    onSubtitlesLoadError: (evt) => callOnAllPlugins("onSubtitlesLoadError", evt),
    onSubtitlesTimeout: (evt) => callOnAllPlugins("onSubtitlesTimeout", evt),
    onSubtitlesXMLError: (evt) => callOnAllPlugins("onSubtitlesXMLError", evt),
    onSubtitlesTransformError: (evt) => callOnAllPlugins("onSubtitlesTransformError", evt),
    onSubtitlesRenderError: (evt) => callOnAllPlugins("onSubtitlesRenderError", evt),
    onSubtitlesDynamicLoadError: (evt) => callOnAllPlugins("onSubtitlesDynamicLoadError", evt),
    onFragmentContentLengthMismatch: (evt) => callOnAllPlugins("onFragmentContentLengthMismatch", evt),
    onQuotaExceeded: (evt) => callOnAllPlugins("onQuotaExceeded", evt),
    onPlaybackRateChanged: (evt) => callOnAllPlugins("onPlaybackRateChanged", evt),
    onPlaybackFrozen: (evt) => callOnAllPlugins("onPlaybackFrozen", evt),
  },
}
