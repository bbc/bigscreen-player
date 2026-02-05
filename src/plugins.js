import PlaybackUtils from "./utils/playbackutils"
import CallCallbacks from "./utils/callcallbacks"

let plugins = []
const pluginContext = {}

function callOnAllPlugins(funcKey, evt) {
  const clonedEvent = PlaybackUtils.deepClone(evt)
  const selectedPlugins = plugins
    .filter((plugin) => plugin[funcKey] && typeof plugin[funcKey] === "function")
    .map((plugin) => plugin[funcKey].bind(plugin))

  CallCallbacks(selectedPlugins, clonedEvent)
}

export default {
  /**
   * @param {function (*): *} updater - a function which accepts the current context, and returns a new context
   */
  updateContext: (updater) => {
    const newContext = updater(PlaybackUtils.deepClone(pluginContext))

    if (typeof newContext !== "object") {
      throw new TypeError("context must be an object")
    }

    // update object (preserving reference)
    for (const prop of Object.keys(pluginContext)) {
      delete pluginContext[prop]
    }

    Object.assign(pluginContext, newContext)

    // call context update handlers
    for (const plugin of plugins) {
      plugin.onContextUpdated?.(pluginContext)
    }
  },

  /**
   * @param {*} plugin - an object
   */
  registerPlugin: (plugin) => {
    plugins.push(plugin)

    // provide initial context
    plugin.onContextUpdated?.(pluginContext)
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
    onPlaybackQualityChange: (evt) => callOnAllPlugins("onPlaybackQualityChange", evt),
    onPlaybackRateChanged: (evt) => callOnAllPlugins("onPlaybackRateChanged", evt),
  },
}
