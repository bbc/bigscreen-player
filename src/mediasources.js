import PlaybackUtils from './utils/playbackutils'
import WindowTypes from './models/windowtypes'
import Plugins from './plugins'
import PluginEnums from './pluginenums'
import PluginData from './plugindata'
import DebugTool from './debugger/debugtool'
import ManifestLoader from './manifest/manifestloader'
import TransferFormats from './models/transferformats'

function MediaSources () {
  let mediaSources
  let failedOverSources = []
  let failoverResetTokens = []
  let windowType
  let liveSupport
  let serverDate
  let time = {}
  let transferFormat
  let subtitlesSources
  // Default 5000 can be overridden with media.subtitlesRequestTimeout
  let subtitlesRequestTimeout = 5000
  let failoverResetTimeMs = 120000
  let failoverSort

  function init (media, newServerDate, newWindowType, newLiveSupport, callbacks) {
    if (media.urls === undefined || media.urls.length === 0) {
      throw new Error('Media Sources urls are undefined')
    }

    if (callbacks === undefined ||
      callbacks.onSuccess === undefined ||
      callbacks.onError === undefined) {
      throw new Error('Media Sources callbacks are undefined')
    }

    if (media.subtitlesRequestTimeout) {
      subtitlesRequestTimeout = media.subtitlesRequestTimeout
    }

    if (media.playerSettings && media.playerSettings.failoverResetTime) {
      failoverResetTimeMs = media.playerSettings.failoverResetTime
    }

    if (media.playerSettings && media.playerSettings.failoverSort) {
      failoverSort = media.playerSettings.failoverSort
    }

    windowType = newWindowType
    liveSupport = newLiveSupport
    serverDate = newServerDate
    mediaSources = media.urls ? PlaybackUtils.cloneArray(media.urls) : []
    subtitlesSources = media.captions ? PlaybackUtils.cloneArray(media.captions) : []

    updateDebugOutput()

    if (needToGetManifest(windowType, liveSupport)) {
      loadManifest(serverDate, callbacks)
    } else {
      callbacks.onSuccess()
    }
  }

  function failover (postFailoverAction, failoverErrorAction, failoverParams) {
    if (shouldFailover(failoverParams)) {
      emitCdnFailover(failoverParams)
      updateCdns(failoverParams.serviceLocation)
      updateDebugOutput()

      if (needToGetManifest(windowType, liveSupport)) {
        loadManifest(serverDate, { onSuccess: postFailoverAction, onError: failoverErrorAction })
      } else {
        postFailoverAction()
      }
    } else {
      failoverErrorAction()
    }
  }

  function failoverSubtitles (postFailoverAction, failoverErrorAction, statusCode) {
    if (subtitlesSources.length > 1) {
      Plugins.interface.onSubtitlesLoadError({ status: statusCode, severity: PluginEnums.STATUS.FAILOVER, cdn: getCurrentSubtitlesCdn() })
      subtitlesSources.shift()
      updateDebugOutput()
      if (postFailoverAction) { postFailoverAction() }
    } else {
      Plugins.interface.onSubtitlesLoadError({ status: statusCode, severity: PluginEnums.STATUS.FATAL, cdn: getCurrentSubtitlesCdn() })
      if (failoverErrorAction) { failoverErrorAction() }
    }
  }

  function shouldFailover (failoverParams) {
    if (isFirstManifest(failoverParams.serviceLocation)) {
      return false
    }
    const aboutToEnd = failoverParams.duration && failoverParams.currentTime > failoverParams.duration - 5
    const shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd
    const shouldLiveFailover = windowType !== WindowTypes.STATIC
    return isFailoverInfoValid(failoverParams) && hasSourcesToFailoverTo() && (shouldStaticFailover || shouldLiveFailover)
  }

  function stripQueryParamsAndHash (url) {
    return typeof (url) === 'string' ? url.split(/[?#]/)[0] : url
  }

  // we don't want to failover on the first playback
  // the serviceLocation is set to our first cdn url
  // see manifest modifier - generateBaseUrls
  function isFirstManifest (serviceLocation) {
    return doHostsMatch(serviceLocation, getCurrentUrl())
  }

  function doHostsMatch (firstUrl, secondUrl) {
    // Matches anything between *:// and / or the end of the line
    const hostRegex = /\w+?:\/\/(.*?)(?:\/|$)/

    const serviceLocNoQueryHash = stripQueryParamsAndHash(firstUrl)
    const currUrlNoQueryHash = stripQueryParamsAndHash(secondUrl)

    const serviceLocationHost = hostRegex.exec(serviceLocNoQueryHash)
    const currentUrlHost = hostRegex.exec(currUrlNoQueryHash)

    return serviceLocationHost && currentUrlHost
      ? serviceLocationHost[1] === currentUrlHost[1]
      : serviceLocNoQueryHash === currUrlNoQueryHash
  }

  function isFailoverInfoValid (failoverParams) {
    const infoValid = typeof failoverParams === 'object' &&
      typeof failoverParams.errorMessage === 'string' &&
      typeof failoverParams.isBufferingTimeoutError === 'boolean'

    if (!infoValid) {
      DebugTool.error('failoverInfo is not valid')
    }

    return infoValid
  }

  function failoverResetTime () {
    return failoverResetTimeMs
  }

  function needToGetManifest (windowType, liveSupport) {
    const requiresManifestLoad = {
      restartable: true,
      seekable: true,
      playable: false,
      none: false
    }

    const requiredTransferFormat = transferFormat === TransferFormats.HLS || transferFormat === undefined
    return requiredTransferFormat && windowType !== WindowTypes.STATIC && requiresManifestLoad[liveSupport]
  }

  function refresh (onSuccess, onError) {
    loadManifest(serverDate, { onSuccess: onSuccess, onError: onError })
  }

  function loadManifest (serverDate, callbacks) {
    const onManifestLoadSuccess = (manifestData) => {
      time = manifestData.time
      transferFormat = manifestData.transferFormat
      callbacks.onSuccess()
    }

    const failoverError = () => {
      callbacks.onError({ error: 'manifest' })
    }

    const onManifestLoadError = () => {
      failover(load, failoverError, { errorMessage: 'manifest-load', isBufferingTimeoutError: false })
    }

    function load () {
      ManifestLoader.load(
        getCurrentUrl(),
        serverDate,
        {
          onSuccess: onManifestLoadSuccess,
          onError: onManifestLoadError
        }
      )
    }

    load()
  }

  function getCurrentUrl () {
    if (mediaSources.length > 0) {
      return mediaSources[0].url.toString()
    }

    return ''
  }

  function getCurrentSubtitlesUrl () {
    if (subtitlesSources.length > 0) {
      return subtitlesSources[0].url.toString()
    }

    return ''
  }

  function getCurrentSubtitlesSegmentLength () {
    if (subtitlesSources.length > 0) {
      return subtitlesSources[0].segmentLength
    }

    return undefined
  }

  function getSubtitlesRequestTimeout () {
    return subtitlesRequestTimeout
  }

  function getCurrentSubtitlesCdn () {
    if (subtitlesSources.length > 0) {
      return subtitlesSources[0].cdn
    }

    return undefined
  }

  function availableUrls () {
    return mediaSources.map((mediaSource) => {
      return mediaSource.url
    })
  }

  function generateTime () {
    return time
  }

  function updateFailedOverSources (mediaSource) {
    failedOverSources.push(mediaSource)

    if (failoverSort) {
      mediaSources = failoverSort(mediaSources)
    }

    const failoverResetToken = setTimeout(() => {
      if (mediaSources && mediaSources.length > 0 && failedOverSources && failedOverSources.length > 0) {
        DebugTool.info(mediaSource.cdn + ' has been added back in to available CDNs')
        mediaSources.push(failedOverSources.shift())
        updateDebugOutput()
      }
    }, failoverResetTimeMs)

    failoverResetTokens.push(failoverResetToken)
  }

  function updateCdns (serviceLocation) {
    if (hasSourcesToFailoverTo()) {
      updateFailedOverSources(mediaSources.shift())
      moveMediaSourceToFront(serviceLocation)
    }
  }

  function moveMediaSourceToFront (serviceLocation) {
    if (serviceLocation) {
      let serviceLocationIdx = mediaSources.map((mediaSource) => {
        return stripQueryParamsAndHash(mediaSource.url)
      }).indexOf(stripQueryParamsAndHash(serviceLocation))

      if (serviceLocationIdx < 0) serviceLocationIdx = 0

      mediaSources.unshift(mediaSources.splice(serviceLocationIdx, 1)[0])
    }
  }

  function hasSourcesToFailoverTo () {
    return mediaSources.length > 1
  }

  function emitCdnFailover (failoverInfo) {
    const evt = new PluginData({
      status: PluginEnums.STATUS.FAILOVER,
      stateType: PluginEnums.TYPE.ERROR,
      isBufferingTimeoutError: failoverInfo.isBufferingTimeoutError,
      cdn: mediaSources[0].cdn,
      newCdn: mediaSources[1].cdn
    })
    Plugins.interface.onErrorHandled(evt)
  }

  function availableCdns () {
    return mediaSources.map((mediaSource) => {
      return mediaSource.cdn
    })
  }

  function availableSubtitlesCdns () {
    return subtitlesSources.map((subtitleSource) => subtitleSource.cdn)
  }

  function updateDebugOutput () {
    DebugTool.keyValue({ key: 'available cdns', value: availableCdns() })
    DebugTool.keyValue({ key: 'url', value: stripQueryParamsAndHash(getCurrentUrl()) })

    DebugTool.keyValue({ key: 'available subtitle cdns', value: availableSubtitlesCdns() })
    DebugTool.keyValue({ key: 'subtitles url', value: stripQueryParamsAndHash(getCurrentSubtitlesUrl()) })
  }

  function tearDown () {
    failoverResetTokens.forEach((token) => clearTimeout(token))

    windowType = undefined
    liveSupport = undefined
    serverDate = undefined
    time = {}
    transferFormat = undefined
    mediaSources = []
    failedOverSources = []
    failoverResetTokens = []
    subtitlesSources = []
  }

  return {
    init: init,
    failover: failover,
    failoverSubtitles: failoverSubtitles,
    refresh: refresh,
    currentSource: getCurrentUrl,
    currentSubtitlesSource: getCurrentSubtitlesUrl,
    currentSubtitlesSegmentLength: getCurrentSubtitlesSegmentLength,
    currentSubtitlesCdn: getCurrentSubtitlesCdn,
    subtitlesRequestTimeout: getSubtitlesRequestTimeout,
    availableSources: availableUrls,
    failoverResetTime: failoverResetTime,
    time: generateTime,
    tearDown: tearDown
  }
}

export default MediaSources
