import PlaybackUtils from "./utils/playbackutils"
import Plugins from "./plugins"
import PluginEnums from "./pluginenums"
import PluginData from "./plugindata"
import DebugTool from "./debugger/debugtool"
import ManifestLoader from "./manifest/manifestloader"
import TransferFormat from "./models/transferformats"
import findSegmentTemplate from "./utils/findtemplate"
import ManifestType from "./models/manifesttypes"
import LiveSupport from "./models/livesupport"
import { CaptionsConnection, Connection, MediaDescriptor, ServerDate } from "./types"
import isError from "./utils/is-error"
import { TimeInfo } from "./manifest/manifestparser"

type MediaSourceCallbacks = {
  onSuccess: () => void
  onError: () => void
}

type FailoverParams = {
  isBufferingTimeoutError: boolean
  code: number
  message: string
  duration?: number
  currentTime?: number
  serviceLocation?: string
}

function MediaSources() {
  let mediaSources: Connection[] = []
  let failedOverSources: Connection[] = []
  let failoverResetTokens: number[] = []
  let liveSupport: LiveSupport | null = null
  let initialWallclockTime: number | null = null
  let time: TimeInfo | null = null
  let transferFormat: TransferFormat | null = null
  let subtitlesSources: CaptionsConnection[] = []
  // Default 5000 can be overridden with media.subtitlesRequestTimeout
  let subtitlesRequestTimeout = 5000
  let failoverResetTimeMs = 120000
  let failoverSort: ((sources: Connection[]) => Connection[]) | null = null
  let hlsFakeTimeShift = false

  function init(
    media: MediaDescriptor,
    newServerDate: ServerDate,
    newLiveSupport: LiveSupport,
    callbacks: MediaSourceCallbacks
  ) {
    if (!media.urls?.length) {
      throw new Error("Media Sources urls are undefined")
    }

    if (callbacks?.onSuccess == null || callbacks?.onError == null) {
      throw new Error("Media Sources callbacks are undefined")
    }

    if (typeof media.subtitlesRequestTimeout === "number") {
      subtitlesRequestTimeout = media.subtitlesRequestTimeout
    }

    if (typeof media.playerSettings?.failoverResetTime === "number") {
      failoverResetTimeMs = media.playerSettings.failoverResetTime
    }

    if (typeof media.playerSettings?.failoverSort === "function") {
      failoverSort = media.playerSettings.failoverSort
    }

    if (media.playerSettings?.streaming?.hlsFakeTimeShift != null) {
      hlsFakeTimeShift = media.playerSettings?.streaming?.hlsFakeTimeShift
    }

    liveSupport = newLiveSupport
    initialWallclockTime = newServerDate
    mediaSources = media.urls ? (PlaybackUtils.cloneArray(media.urls) as Connection[]) : []
    subtitlesSources = media.captions ? (PlaybackUtils.cloneArray(media.captions) as CaptionsConnection[]) : []

    updateDebugOutput()

    loadManifest(callbacks, { initialWallclockTime })
  }

  function failover(onFailoverSuccess: () => void, onFailoverError: () => void, failoverParams: FailoverParams): void {
    if (shouldFailover(failoverParams)) {
      emitCdnFailover(failoverParams)
      updateCdns(failoverParams.serviceLocation)
      updateDebugOutput()

      if (liveSupport && needToGetManifest(liveSupport)) {
        loadManifest({ onSuccess: onFailoverSuccess, onError: onFailoverError }, {})
      } else {
        onFailoverSuccess()
      }
    } else {
      onFailoverError()
    }
  }

  function failoverSubtitles(
    postFailoverAction: () => void,
    failoverErrorAction?: () => void,
    { statusCode, ...rest }: Partial<{ statusCode: number }> = {}
  ): void {
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

  function shouldFailover(failoverParams: FailoverParams): boolean {
    const { currentTime, duration, serviceLocation } = failoverParams

    const aboutToEnd =
      typeof currentTime === "number" && typeof duration === "number" && duration > 0 && currentTime > duration - 5

    const shouldStaticFailover = time?.type === ManifestType.STATIC && !aboutToEnd

    const shouldLiveFailover = time?.type === ManifestType.DYNAMIC

    return (
      !isFirstManifest(serviceLocation) &&
      isFailoverInfoValid(failoverParams) &&
      hasSourcesToFailoverTo() &&
      (shouldStaticFailover || shouldLiveFailover)
    )
  }

  function stripQueryParamsAndHash(url: string): string {
    return url.replace(/[#?].*/, "")
  }

  // we don't want to failover on the first playback
  // the serviceLocation is set to our first cdn url
  // see manifest modifier - generateBaseUrls
  function isFirstManifest(serviceLocation: string | undefined): boolean {
    return typeof serviceLocation === "string" && doHostsMatch(serviceLocation, getCurrentUrl())
  }

  function doHostsMatch(firstUrl: string, secondUrl: string): boolean {
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

  function isFailoverInfoValid(failoverParams: FailoverParams): boolean {
    const infoValid = typeof failoverParams === "object" && typeof failoverParams.isBufferingTimeoutError === "boolean"

    if (!infoValid) {
      DebugTool.error("failoverInfo is not valid")
    }

    return infoValid
  }

  function failoverResetTime(): number {
    return failoverResetTimeMs
  }

  function hasSegmentedSubtitles(): boolean {
    const url = getCurrentSubtitlesUrl()

    if (typeof url !== "string" || url === "") {
      return false
    }

    return findSegmentTemplate(url) != null
  }

  function needToGetManifest(liveSupport: LiveSupport): boolean {
    const isStartTimeAccurate = {
      restartable: true,
      seekable: true,
      playable: false,
      none: false,
    }

    const hasManifestBeenLoaded = transferFormat !== undefined

    return (
      (!hasManifestBeenLoaded || transferFormat === TransferFormat.HLS) &&
      (time?.type === ManifestType.DYNAMIC || hasSegmentedSubtitles()) &&
      isStartTimeAccurate[liveSupport]
    )
  }

  function refresh(onSuccess: () => void, onError: () => void) {
    loadManifest({ onSuccess, onError }, {})
  }

  // [tag:ServerDate]
  function loadManifest(
    callbacks: { onSuccess: () => void; onError: (info: { error: string }) => void },
    { initialWallclockTime }: Partial<{ initialWallclockTime: number }> = {}
  ): void {
    ManifestLoader.load(getCurrentUrl(), { initialWallclockTime, hlsFakeTimeShift })
      .then(({ time: newTime, transferFormat: newTransferFormat }) => {
        time = newTime
        transferFormat = newTransferFormat

        logManifestLoaded(transferFormat, time)
        callbacks.onSuccess()
      })
      .catch((reason: unknown) => {
        DebugTool.error(`Failed to load manifest: ${isError(reason) ? reason.message : "cause n/a"}`)

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

  function getCurrentUrl(): string {
    return mediaSources.length > 0 ? mediaSources[0].url.toString() : ""
  }

  function getCurrentSubtitlesUrl(): string {
    return subtitlesSources.length > 0 ? subtitlesSources[0].url.toString() : ""
  }

  function getCurrentSubtitlesSegmentLength(): number | undefined {
    return subtitlesSources.length > 0 ? subtitlesSources[0].segmentLength : undefined
  }

  function getSubtitlesRequestTimeout(): number {
    return subtitlesRequestTimeout
  }

  function getCurrentSubtitlesCdn(): string | undefined {
    return subtitlesSources.length > 0 ? subtitlesSources[0].cdn : undefined
  }

  function availableUrls(): string[] {
    return mediaSources.map((mediaSource) => mediaSource.url)
  }

  function generateTime() {
    return time
  }

  function getCurrentTransferFormat() {
    return transferFormat
  }

  function updateFailedOverSources(mediaSource: Connection) {
    failedOverSources.push(mediaSource)

    if (failoverSort) {
      mediaSources = failoverSort(mediaSources)
    }

    const failoverResetToken = setTimeout(() => {
      const source = failedOverSources.shift()

      if (source == null || mediaSources.length === 0) {
        return
      }

      DebugTool.info(`${mediaSource.cdn} has been added back in to available CDNs`)
      mediaSources.push(source)
      updateDebugOutput()
    }, failoverResetTimeMs)

    failoverResetTokens.push(failoverResetToken as unknown as number)
  }

  function updateCdns(serviceLocation: string | undefined): void {
    if (hasSourcesToFailoverTo()) {
      return
    }

    const source = mediaSources.shift()

    if (source == null) {
      return
    }

    updateFailedOverSources(source)

    if (serviceLocation == null) {
      return
    }

    moveMediaSourceToFront(serviceLocation)
  }

  function moveMediaSourceToFront(serviceLocation: string): void {
    let serviceLocationIdx = mediaSources
      .map((mediaSource) => stripQueryParamsAndHash(mediaSource.url))
      .indexOf(stripQueryParamsAndHash(serviceLocation))

    if (serviceLocationIdx < 0) serviceLocationIdx = 0

    mediaSources.unshift(mediaSources.splice(serviceLocationIdx, 1)[0])
  }

  function hasSourcesToFailoverTo(): boolean {
    return mediaSources.length > 1
  }

  function emitCdnFailover(failoverInfo: FailoverParams) {
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

  function availableCdns(): string[] {
    return mediaSources.map((mediaSource) => mediaSource.cdn)
  }

  function availableSubtitlesCdns(): string[] {
    return subtitlesSources.map((subtitleSource) => subtitleSource.cdn)
  }

  function logManifestLoaded(transferFormat: TransferFormat, time: TimeInfo) {
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

    liveSupport = null
    initialWallclockTime = null
    time = null
    transferFormat = null
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
    transferFormat: getCurrentTransferFormat,
    tearDown,
  }
}

export default MediaSources
