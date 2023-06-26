import PlaybackUtils from "./utils/playbackutils"

let plugins = []

function callOnAllPlugins(funcKey, evt) {
  const clonedEvent = PlaybackUtils.deepClone(evt)

  for (const i in plugins) {
    if (plugins[i][funcKey]) {
      plugins[i][funcKey](clonedEvent)
    }
  }
}

export default {
  registerPlugin: (plugin) => {
    console.log('registering:' + plugin)
    plugins.push(plugin)
  },

  unregisterPlugin: (plugin) => {
    if (!plugin && plugins.length > 0) {
      plugins = []
    } else {
      for (let i = plugins.length - 1; i >= 0; i--) {
        if (plugins[i] === plugin) {
          plugins.splice(i, 1)
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
    onQualityChangedRendered: (evt) => callOnAllPlugins("onQualityChangedRendered", evt),
    onSubtitlesLoadError: (evt) => callOnAllPlugins("onSubtitlesLoadError", evt),
    onSubtitlesTimeout: (evt) => callOnAllPlugins("onSubtitlesTimeout", evt),
    onSubtitlesXMLError: (evt) => callOnAllPlugins("onSubtitlesXMLError", evt),
    onSubtitlesTransformError: (evt) => callOnAllPlugins("onSubtitlesTransformError", evt),
    onSubtitlesRenderError: (evt) => callOnAllPlugins("onSubtitlesRenderError", evt),
    onSubtitlesDynamicLoadError: (evt) => callOnAllPlugins("onSubtitlesDynamicLoadError", evt),
  },
}
