import PlaybackUtils from "./utils/playbackutils"
import Plugins from "./plugins"
import PluginEnums from "./pluginenums"
import PluginData from "./plugindata"
import DebugTool from "./debugger/debugtool"
import ManifestLoader from "./manifest/manifestloader"
import TransferFormats from "./models/transferformats"
import findSegmentTemplate from "./utils/findtemplate"
import ManifestType from "./models/manifesttypes"

function MediaSources() {
  let mediaSources
  let failedOverSources = []
  let failoverResetTokens = []
  let liveSupport
  let initialWallclockTime
  let time = {
    type: ManifestType.STATIC,
  }
  let transferFormat
  let subtitlesSources
  // Default 5000 can be overridden with media.subtitlesRequestTimeout
  let subtitlesRequestTimeout = 5000
  let failoverResetTimeMs = 120000
  let failoverSort

  function init(media, newServerDate, newLiveSupport, callbacks) {
    if (!media.urls?.length) {
      throw new Error("Media Sources urls are undefined")
    }

    if (callbacks?.onSuccess == null || callbacks?.onError == null) {
      throw new Error("Media Sources callbacks are undefined")
    }

    if (media.subtitlesRequestTimeout) {
      subtitlesRequestTimeout = media.subtitlesRequestTimeout
    }

    if (media.playerSettings?.failoverResetTime) {
      failoverResetTimeMs = media.playerSettings.failoverResetTime
    }

    if (media.playerSettings?.failoverSort) {
      failoverSort = media.playerSettings.failoverSort
    }

    liveSupport = newLiveSupport
    initialWallclockTime = newServerDate
    mediaSources = media.urls ? PlaybackUtils.cloneArray(media.urls) : []
    subtitlesSources = media.captions ? PlaybackUtils.cloneArray(media.captions) : []

    updateDebugOutput()

    loadManifest(callbacks, { initialWallclockTime })
  }

  function failover(onFailoverSuccess, onFailoverError, failoverParams) {
    if (shouldFailover(failoverParams)) {
      emitCdnFailover(failoverParams)
      updateCdns(failoverParams.serviceLocation)
      updateDebugOutput()

      if (needToGetManifest(liveSupport)) {
        loadManifest({ onSuccess: onFailoverSuccess, onError: onFailoverError }, {})
      } else {
        onFailoverSuccess()
      }
    } else {
      onFailoverError()
    }
  }

  function failoverSubtitles(postFailoverAction, failoverErrorAction, { statusCode, ...rest } = {}) {
    if (subtitlesSources.length > 1) {
      Plugins.interface.onSubtitlesLoadError({
        status: statusCode,
        severity: PluginEnums.STATUS.FAILOVER,
        cdn: getCurrentSubtitlesCdn(),
        subtitlesSources: subtitlesSources.length,
        ...rest,
      })
      subtitlesSources.shift()
      updateDebugOutput()
      if (postFailoverAction) {
        postFailoverAction()
      }
    } else {
      Plugins.interface.onSubtitlesLoadError({
        status: statusCode,
        severity: PluginEnums.STATUS.FATAL,
        cdn: getCurrentSubtitlesCdn(),
        subtitlesSources: subtitlesSources.length,
        ...rest,
      })
      if (failoverErrorAction) {
        failoverErrorAction()
      }
    }
  }

  function shouldFailover(failoverParams) {
    if (isFirstManifest(failoverParams.serviceLocation)) {
      return false
    }
    const aboutToEnd = failoverParams.duration && failoverParams.currentTime > failoverParams.duration - 5
    const shouldStaticFailover = time.type === ManifestType.STATIC && !aboutToEnd
    const shouldLiveFailover = time.type === ManifestType.DYNAMIC
    return (
      isFailoverInfoValid(failoverParams) && hasSourcesToFailoverTo() && (shouldStaticFailover || shouldLiveFailover)
    )
  }

  function stripQueryParamsAndHash(url) {
    return typeof url === "string" ? url.split(/[#?]/)[0] : url
  }

  // we don't want to failover on the first playback
  // the serviceLocation is set to our first cdn url
  // see manifest modifier - generateBaseUrls
  function isFirstManifest(serviceLocation) {
    return doHostsMatch(serviceLocation, getCurrentUrl())
  }

  function doHostsMatch(firstUrl, secondUrl) {
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

  function isFailoverInfoValid(failoverParams) {
    const infoValid = typeof failoverParams === "object" && typeof failoverParams.isBufferingTimeoutError === "boolean"

    if (!infoValid) {
      DebugTool.error("failoverInfo is not valid")
    }

    return infoValid
  }

  function failoverResetTime() {
    return failoverResetTimeMs
  }

  function hasSegmentedSubtitles() {
    const url = getCurrentSubtitlesUrl()

    if (typeof url !== "string" || url === "") {
      return false
    }

    return findSegmentTemplate(url) != null
  }

  function needToGetManifest(liveSupport) {
    const isStartTimeAccurate = {
      restartable: true,
      seekable: true,
      playable: false,
      none: false,
    }

    const hasManifestBeenLoaded = transferFormat !== undefined

    return (
      (!hasManifestBeenLoaded || transferFormat === TransferFormats.HLS) &&
      (time.type === ManifestType.DYNAMIC || hasSegmentedSubtitles()) &&
      isStartTimeAccurate[liveSupport]
    )
  }

  function refresh(onSuccess, onError) {
    loadManifest({ onSuccess, onError }, {})
  }

  // [tag:ServerDate]
  function loadManifest(callbacks, { initialWallclockTime } = {}) {
    return ManifestLoader.load(getCurrentUrl(), { initialWallclockTime })
      .then(({ time: newTime, transferFormat: newTransferFormat } = {}) => {
        time = newTime
        transferFormat = newTransferFormat

        logManifestLoaded(transferFormat, time)
        callbacks.onSuccess()
      })
      .catch((error) => {
        DebugTool.error(`Failed to load manifest: ${error?.message ?? "cause n/a"}`)

        failover(
          () => callbacks.onSuccess(),
          () => callbacks.onError({ error: "manifest" }),
          {
            isBufferingTimeoutError: false,
            code: PluginEnums.ERROR_CODES.MANIFEST_LOAD,
            message: PluginEnums.ERROR_MESSAGES.MANIFEST,
          }
        )
      })
  }

  function getCurrentUrl() {
    if (mediaSources.length > 0) {
      return mediaSources[0].url.toString()
    }

    return ""
  }

  function getCurrentSubtitlesUrl() {
    if (subtitlesSources.length > 0) {
      return subtitlesSources[0].url.toString()
    }

    return ""
  }

  function getCurrentSubtitlesSegmentLength() {
    if (subtitlesSources.length > 0) {
      return subtitlesSources[0].segmentLength
    }
  }

  function getSubtitlesRequestTimeout() {
    return subtitlesRequestTimeout
  }

  function getCurrentSubtitlesCdn() {
    if (subtitlesSources.length > 0) {
      return subtitlesSources[0].cdn
    }
  }

  function availableUrls() {
    return mediaSources.map((mediaSource) => mediaSource.url)
  }

  function generateTime() {
    return time
  }

  function updateFailedOverSources(mediaSource) {
    failedOverSources.push(mediaSource)

    if (failoverSort) {
      mediaSources = failoverSort(mediaSources)
    }

    const failoverResetToken = setTimeout(() => {
      if (mediaSources?.length > 0 && failedOverSources?.length > 0) {
        DebugTool.info(`${mediaSource.cdn} has been added back in to available CDNs`)
        mediaSources.push(failedOverSources.shift())
        updateDebugOutput()
      }
    }, failoverResetTimeMs)

    failoverResetTokens.push(failoverResetToken)
  }

  function updateCdns(serviceLocation) {
    if (hasSourcesToFailoverTo()) {
      updateFailedOverSources(mediaSources.shift())
      moveMediaSourceToFront(serviceLocation)
    }
  }

  function moveMediaSourceToFront(serviceLocation) {
    if (serviceLocation) {
      let serviceLocationIdx = mediaSources
        .map((mediaSource) => stripQueryParamsAndHash(mediaSource.url))
        .indexOf(stripQueryParamsAndHash(serviceLocation))

      if (serviceLocationIdx < 0) serviceLocationIdx = 0

      mediaSources.unshift(mediaSources.splice(serviceLocationIdx, 1)[0])
    }
  }

  function hasSourcesToFailoverTo() {
    return mediaSources.length > 1
  }

  function emitCdnFailover(failoverInfo) {
    const evt = new PluginData({
      status: PluginEnums.STATUS.FAILOVER,
      stateType: PluginEnums.TYPE.ERROR,
      isBufferingTimeoutError: failoverInfo.isBufferingTimeoutError,
      cdn: mediaSources[0].cdn,
      newCdn: mediaSources[1].cdn,
      code: failoverInfo.code,
      message: failoverInfo.message,
    })
    Plugins.interface.onErrorHandled(evt)
  }

  function availableCdns() {
    return mediaSources.map((mediaSource) => mediaSource.cdn)
  }

  function availableSubtitlesCdns() {
    return subtitlesSources.map((subtitleSource) => subtitleSource.cdn)
  }

  function logManifestLoaded(transferFormat, time) {
    let logMessage = `Loaded ${transferFormat} manifest.`

    const { presentationTimeOffsetInSeconds, windowStartTime, windowEndTime } = time

    if (!isNaN(windowStartTime)) {
      logMessage += ` Window start time [ms]: ${windowStartTime}.`
    }

    if (!isNaN(windowEndTime)) {
      logMessage += ` Window end time [ms]: ${windowEndTime}.`
    }

    if (!isNaN(presentationTimeOffsetInSeconds)) {
      logMessage += ` Offset [s]: ${presentationTimeOffsetInSeconds}.`
    }

    DebugTool.info(logMessage)
  }

  function updateDebugOutput() {
    DebugTool.dynamicMetric("cdns-available", availableCdns())
    DebugTool.dynamicMetric("current-url", stripQueryParamsAndHash(getCurrentUrl()))

    DebugTool.dynamicMetric("subtitle-cdns-available", availableSubtitlesCdns())
    DebugTool.dynamicMetric("subtitle-current-url", stripQueryParamsAndHash(getCurrentSubtitlesUrl()))
  }

  function tearDown() {
    failoverResetTokens.forEach((token) => clearTimeout(token))

    liveSupport = undefined
    initialWallclockTime = undefined
    time = {}
    transferFormat = undefined
    mediaSources = []
    failedOverSources = []
    failoverResetTokens = []
    subtitlesSources = []
  }

  return {
    init,
    failover,
    failoverSubtitles,
    refresh,
    currentSource: getCurrentUrl,
    currentSubtitlesSource: getCurrentSubtitlesUrl,
    currentSubtitlesSegmentLength: getCurrentSubtitlesSegmentLength,
    currentSubtitlesCdn: getCurrentSubtitlesCdn,
    subtitlesRequestTimeout: getSubtitlesRequestTimeout,
    availableSources: availableUrls,
    failoverResetTime,
    time: generateTime,
    tearDown,
  }
}

export default MediaSources
