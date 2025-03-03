import type { CaptionsConnection, Connection, MediaDescriptor } from "./types"

import PlaybackUtils from "./utils/playbackutils"
import Plugins from "./plugins"
import PluginEnums from "./pluginenums"
import PluginData from "./plugindata"
import DebugTool from "./debugger/debugtool"
import ManifestLoader from "./manifest/sourceloader"
import { TransferFormat } from "./models/transferformats"
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

export enum SourceType {
  MEDIA,
  AUDIO_DESCRIBED,
}

type Sources = { [key in SourceType]: Connection[] }

function MediaSources() {
  let failoverSort: ((sources: Connection[]) => Connection[]) | null = null

  const sources: Sources = {
    [SourceType.MEDIA]: [],
    [SourceType.AUDIO_DESCRIBED]: [],
  }

  let subtitlesSources: CaptionsConnection[] = []
  let current: SourceType = SourceType.MEDIA

  let failoverResetTokens: number[] = []
  let time: TimeInfo | null = null
  let transferFormat: TransferFormat | null = null

  // Can be overridden with media.subtitlesRequestTimeout
  let subtitlesRequestTimeout = 5000
  let failoverResetTimeMs = 120000

  function init(media: MediaDescriptor, setAudioDescribedOn?: boolean): Promise<void> {
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

      sources[SourceType.MEDIA] = PlaybackUtils.cloneArray(media.urls ?? []) as Connection[]
      sources[SourceType.AUDIO_DESCRIBED] = PlaybackUtils.cloneArray(media.audioDescribed ?? []) as Connection[]

      subtitlesSources = PlaybackUtils.cloneArray(media.captions ?? []) as CaptionsConnection[]

      if (setAudioDescribedOn) current = SourceType.AUDIO_DESCRIBED

      updateDebugOutput()

      return resolve(loadManifest())
    })
  }

  function failover(failoverParams: FailoverParams): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isFailoverInfoValid(failoverParams)) {
        return reject(new TypeError("Invalid failover params"))
      }

      if (
        time?.manifestType === ManifestType.STATIC &&
        isAboutToEnd(failoverParams.currentTime, failoverParams.duration)
      ) {
        return reject(new Error("Current time too close to end"))
      }

      if (!hasSourcesToFailoverTo()) {
        return reject(new Error("Exhaused all sources"))
      }

      if (isFirstManifest(failoverParams.serviceLocation)) {
        return resolve()
      }

      emitCdnFailover(failoverParams)
      updateCdns(failoverParams.serviceLocation)
      updateDebugOutput()

      return needToGetManifest() ? resolve(loadManifest()) : resolve()
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

        return reject(new Error("Exhaused all subtitle sources"))
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

  function isAboutToEnd(currentTime: number | undefined, duration: number | undefined) {
    return typeof currentTime === "number" && typeof duration === "number" && duration > 0 && currentTime > duration - 5
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

  function needToGetManifest(): boolean {
    const hasManifestBeenLoaded = transferFormat != null

    return (
      !hasManifestBeenLoaded || (transferFormat === TransferFormat.HLS && time?.manifestType === ManifestType.DYNAMIC)
    )
  }

  function refresh(): Promise<void> {
    return new Promise((resolve) => resolve(loadManifest()))
  }

  function isAudioDescribedAvailable(): boolean {
    return sources[SourceType.AUDIO_DESCRIBED].length > 0
  }

  function isAudioDescribedEnabled(): boolean {
    return current === SourceType.AUDIO_DESCRIBED
  }

  function setAudioDescribed(to: boolean): Promise<void> {
    current = to ? SourceType.AUDIO_DESCRIBED : SourceType.MEDIA

    updateDebugOutput()

    return new Promise((resolve) => (needToGetManifest() ? resolve(loadManifest()) : resolve()))
  }

  function loadManifest(): Promise<void> {
    return ManifestLoader.load(getCurrentUrl())
      .then(({ time: newTime, transferFormat: newTransferFormat }) => {
        time = newTime
        transferFormat = newTransferFormat

        DebugTool.sourceLoaded({ ...time, transferFormat })
      })
      .catch((reason) => {
        DebugTool.error(`Failed to load manifest: ${isError(reason) ? reason.message : "cause n/a"}`)

        return failover({
          isBufferingTimeoutError: false,
          code: PluginEnums.ERROR_CODES.MANIFEST_LOAD,
          message: PluginEnums.ERROR_MESSAGES.MANIFEST,
        })
      })
      .catch((reason: unknown) => {
        const error = new Error(isError(reason) ? reason.message : undefined)

        error.name = "ManifestLoadError"

        throw error
      })
  }

  function getCurrentUrl(): string {
    return sources[current].length > 0 ? sources[current][0].url.toString() : ""
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
    return sources[SourceType.MEDIA].map((mediaSource) => mediaSource.url)
  }

  function generateTime(): TimeInfo | null {
    return time
  }

  function getCurrentTransferFormat() {
    return transferFormat
  }

  function updateFailedOverSources(mediaSource: Connection, currentSources: SourceType) {
    if (failoverSort) {
      sources[currentSources] = failoverSort(sources[currentSources])
    }

    const failoverResetToken = setTimeout(() => {
      if (mediaSource == null || sources[currentSources].length === 0) return

      DebugTool.info(`${mediaSource.cdn} has been added back in to available CDNs`)
      sources[currentSources].push(mediaSource)
      updateDebugOutput()
    }, failoverResetTimeMs)

    failoverResetTokens.push(failoverResetToken as unknown as number)
  }

  function updateCdns(serviceLocation: string | undefined): void {
    const currentSources = current

    const source = sources[currentSources].shift()

    if (source == null) return
    updateFailedOverSources(source, currentSources)

    if (serviceLocation == null) return
    moveMediaSourceToFront(serviceLocation)
  }

  function moveMediaSourceToFront(serviceLocation: string): void {
    const currentSources = current

    let serviceLocationIdx = sources[currentSources]
      .map((mediaSource) => stripQueryParamsAndHash(mediaSource.url))
      .indexOf(stripQueryParamsAndHash(serviceLocation))

    if (serviceLocationIdx < 0) serviceLocationIdx = 0

    sources[currentSources].unshift(sources[currentSources].splice(serviceLocationIdx, 1)[0])
  }

  function hasSourcesToFailoverTo(): boolean {
    return sources[current].length > 1
  }

  function emitCdnFailover(failoverInfo: FailoverParams) {
    const currentSources = current

    const evt = new PluginData({
      status: PluginEnums.STATUS.FAILOVER,
      stateType: PluginEnums.TYPE.ERROR,
      isBufferingTimeoutError: failoverInfo.isBufferingTimeoutError,
      cdn: sources[currentSources][0]?.cdn,
      newCdn: sources[currentSources][1]?.cdn,
      code: failoverInfo.code,
      message: failoverInfo.message,
    })

    Plugins.interface.onErrorHandled(evt)
  }

  function availableCdns(): string[] {
    return sources[current].map((mediaSource) => mediaSource.cdn)
  }

  function availableSubtitlesCdns(): string[] {
    return subtitlesSources.map((subtitleSource) => subtitleSource.cdn)
  }

  function updateDebugOutput() {
    DebugTool.dynamicMetric(`${isAudioDescribedEnabled() ? "audio-described-" : ""}cdns-available`, availableCdns())
    DebugTool.dynamicMetric("current-url", stripQueryParamsAndHash(getCurrentUrl()))

    DebugTool.dynamicMetric("subtitle-cdns-available", availableSubtitlesCdns())
    DebugTool.dynamicMetric("subtitle-current-url", stripQueryParamsAndHash(getCurrentSubtitlesUrl()))
  }

  function tearDown() {
    failoverResetTokens.forEach((token) => clearTimeout(token))

    time = null
    transferFormat = null

    sources[SourceType.MEDIA] = []
    sources[SourceType.AUDIO_DESCRIBED] = []

    failoverResetTokens = []
    subtitlesSources = []
  }

  return {
    init,
    failover,
    failoverSubtitles,
    refresh,
    isAudioDescribedAvailable,
    isAudioDescribedEnabled,
    setAudioDescribed,
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
export type MediaSources = typeof MediaSources
