import PlaybackUtils from "./utils/playbackutils"
import Plugins from "./plugins"
import PluginEnums from "./pluginenums"
import PluginData from "./plugindata"
import DebugTool from "./debugger/debugtool"
import ManifestLoader from "./manifest/manifestloader"
import { TransferFormat, HLS } from "./models/transferformats"
import findSegmentTemplate from "./utils/findtemplate"
import { CaptionsConnection, Connection, MediaDescriptor } from "./types"
import { LiveSupport } from "./models/livesupport"
import { TimeInfo } from "./manifest/manifestparser"
import isError from "./utils/iserror"
import { ManifestType } from "./models/manifesttypes"

type FailoverParams = {
  isBufferingTimeoutError: boolean
  code: number
  message: string
  duration?: number
  currentTime?: number
  serviceLocation?: string
}

type MediaSourcesOptions = {
  liveSupport: LiveSupport
}

function MediaSources() {
  let mediaSources: Connection[] = []
  let failedOverSources: Connection[] = []
  let failoverResetTokens: number[] = []
  let currentLiveSupport: LiveSupport | null = null
  let time: TimeInfo | null = null
  let transferFormat: TransferFormat | null = null
  let subtitlesSources: CaptionsConnection[] = []
  // Default 5000 can be overridden with media.subtitlesRequestTimeout
  let subtitlesRequestTimeout = 5000
  let failoverResetTimeMs = 120000
  let failoverSort: ((sources: Connection[]) => Connection[]) | null = null

  function init(media: MediaDescriptor, { liveSupport }: MediaSourcesOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!media.urls?.length) {
        return reject(new Error("Media Sources urls are undefined"))
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

      currentLiveSupport = liveSupport
      mediaSources = media.urls ? (PlaybackUtils.cloneArray(media.urls) as Connection[]) : []
      subtitlesSources = media.captions ? (PlaybackUtils.cloneArray(media.captions) as CaptionsConnection[]) : []

      updateDebugOutput()

      return resolve(loadManifest())
    })
  }

  function failover(failoverParams: FailoverParams): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!shouldFailover(failoverParams)) {
        return reject()
      }

      emitCdnFailover(failoverParams)
      updateCdns(failoverParams.serviceLocation)
      updateDebugOutput()

      if (currentLiveSupport == null || !needToGetManifest(currentLiveSupport)) {
        return resolve()
      }

      return resolve(loadManifest())
    })
  }

  function failoverSubtitles({ statusCode, ...rest }: Partial<{ statusCode: number }> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (subtitlesSources.length <= 1) {
        Plugins.interface.onSubtitlesLoadError({
          status: statusCode,
          severity: PluginEnums.STATUS.FATAL,
          cdn: getCurrentSubtitlesCdn(),
          subtitlesSources: subtitlesSources.length,
          ...rest,
        })

        return reject()
      }

      Plugins.interface.onSubtitlesLoadError({
        status: statusCode,
        severity: PluginEnums.STATUS.FAILOVER,
        cdn: getCurrentSubtitlesCdn(),
        subtitlesSources: subtitlesSources.length,
        ...rest,
      })

      subtitlesSources.shift()

      updateDebugOutput()

      return resolve()
    })
  }

  function shouldFailover(failoverParams: FailoverParams): boolean {
    const { currentTime, duration, serviceLocation } = failoverParams

    const aboutToEnd =
      typeof currentTime === "number" && typeof duration === "number" && duration > 0 && currentTime > duration - 5

    const shouldStaticFailover = time?.manifestType === ManifestType.STATIC && !aboutToEnd

    const shouldLiveFailover = time?.manifestType === ManifestType.DYNAMIC

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
      (!hasManifestBeenLoaded || transferFormat === HLS) &&
      (time?.manifestType === ManifestType.DYNAMIC || hasSegmentedSubtitles()) &&
      isStartTimeAccurate[liveSupport]
    )
  }

  function refresh(onSuccess: () => void, onError: (reason?: unknown) => void) {
    loadManifest().then(
      () => onSuccess,
      (reason) => onError(reason)
    )
  }

  // [tag:ServerDate]
  function loadManifest(): Promise<void> {
    return ManifestLoader.load(getCurrentUrl())
      .then(({ time: newTime, transferFormat: newTransferFormat }) => {
        time = newTime
        transferFormat = newTransferFormat

        logManifestLoaded(transferFormat, time)
      })
      .catch((reason) => {
        DebugTool.error(`Failed to load manifest: ${isError(reason) ? reason.message : "cause n/a"}`)

        return failover({
          isBufferingTimeoutError: false,
          code: PluginEnums.ERROR_CODES.MANIFEST_LOAD,
          message: PluginEnums.ERROR_MESSAGES.MANIFEST,
        }).catch((reason: unknown) => {
          const error = new Error(isError(reason) ? reason.message : undefined)

          error.name = "ManifestLoadError"

          throw error
        })
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

  function generateTime(): TimeInfo | null {
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
    const {
      manifestType,
      availabilityStartTimeInMilliseconds,
      presentationTimeOffsetInMilliseconds,
      timeShiftBufferDepthInMilliseconds,
    } = time

    let logMessage = `Loaded ${manifestType} ${transferFormat} manifest.`

    if (availabilityStartTimeInMilliseconds > 0) {
      logMessage += ` AST: ${new Date(availabilityStartTimeInMilliseconds).toString()}`
    }

    if (timeShiftBufferDepthInMilliseconds > 0) {
      logMessage += ` Time shift [s]: ${timeShiftBufferDepthInMilliseconds / 1000}`
    }

    if (presentationTimeOffsetInMilliseconds > 0) {
      logMessage += ` PTO [s]: ${presentationTimeOffsetInMilliseconds / 1000}.`
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

    currentLiveSupport = null
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
