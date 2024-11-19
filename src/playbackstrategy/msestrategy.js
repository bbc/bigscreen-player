import { MediaPlayer } from "dashjs/index_mediaplayerOnly"
import MediaState from "../models/mediastate"
import DebugTool from "../debugger/debugtool"
import MediaKinds from "../models/mediakinds"
import Plugins from "../plugins"
import ManifestModifier from "../manifest/manifestmodifier"
import LiveSupport from "../models/livesupport"
import DynamicWindowUtils from "../dynamicwindowutils"
import DOMHelpers from "../domhelpers"
import Utils from "../utils/playbackutils"
import convertTimeRangesToArray from "../utils/mse/convert-timeranges-to-array"
import { ManifestType } from "../models/manifesttypes"

const DEFAULT_SETTINGS = {
  liveDelay: 0,
  seekDurationPadding: 1.1,
}

function MSEStrategy(mediaSources, mediaKind, playbackElement, _isUHD = false, customPlayerSettings = {}) {
  let mediaPlayer
  let mediaElement
  const manifestType = mediaSources.time().manifestType

  const playerSettings = Utils.merge(
    {
      debug: {
        logLevel: 2,
      },
      streaming: {
        blacklistExpiryTime: mediaSources.failoverResetTime(),
        buffer: {
          bufferToKeep: 4,
          bufferTimeAtTopQuality: 12,
          bufferTimeAtTopQualityLongForm: 15,
        },
      },
    },
    customPlayerSettings
  )

  let eventCallbacks = []
  let errorCallback
  let timeUpdateCallback

  const seekDurationPadding = isNaN(playerSettings.streaming?.seekDurationPadding)
    ? DEFAULT_SETTINGS.seekDurationPadding
    : playerSettings.streaming?.seekDurationPadding
  const liveDelay = isNaN(playerSettings.streaming?.delay?.liveDelay)
    ? DEFAULT_SETTINGS.liveDelay
    : playerSettings.streaming?.delay?.liveDelay
  let failoverPresentationTimeInSeconds
  let refreshFailoverPresentationTimeInSeconds
  let isEnded = false

  let dashMetrics
  let lastError

  let publishedSeekEvent = false
  let isSeeking = false
  let manifestRequestTime
  let manifestLoadCount = 0

  let playerMetadata = {
    playbackBitrate: undefined,
    bufferLength: undefined,
    fragmentInfo: {
      requestTime: undefined,
      numDownloaded: undefined,
    },
  }

  const DashJSEvents = {
    LOG: "log",
    ERROR: "error",
    GAP_JUMP: "gapCausedInternalSeek",
    GAP_JUMP_TO_END: "gapCausedSeekToPeriodEnd",
    MANIFEST_LOADED: "manifestLoaded",
    MANIFEST_LOADING_FINISHED: "manifestLoadingFinished",
    DOWNLOAD_MANIFEST_ERROR_CODE: 25,
    DOWNLOAD_CONTENT_ERROR_CODE: 27,
    DOWNLOAD_INIT_SEGMENT_ERROR_CODE: 28,
    UNSUPPORTED_CODEC: 30,
    MANIFEST_VALIDITY_CHANGED: "manifestValidityChanged",
    QUALITY_CHANGE_REQUESTED: "qualityChangeRequested",
    QUALITY_CHANGE_RENDERED: "qualityChangeRendered",
    BASE_URL_SELECTED: "baseUrlSelected",
    SERVICE_LOCATION_AVAILABLE: "serviceLocationUnblacklisted",
    URL_RESOLUTION_FAILED: "urlResolutionFailed",
    METRIC_ADDED: "metricAdded",
    METRIC_CHANGED: "metricChanged",
    STREAM_INITIALIZED: "streamInitialized",
    FRAGMENT_CONTENT_LENGTH_MISMATCH: "fragmentContentLengthMismatch",
    QUOTA_EXCEEDED: "quotaExceeded",
  }

  function onLoadedMetaData() {
    DebugTool.event("loadedmetadata", "MediaElement")
    DebugTool.dynamicMetric("ready-state", mediaElement.readyState)
  }

  function onLoadedData() {
    DebugTool.event("loadeddata", "MediaElement")
    DebugTool.dynamicMetric("ready-state", mediaElement.readyState)
  }

  function onPlay() {
    DebugTool.event("play", "MediaElement")
    DebugTool.dynamicMetric("paused", mediaElement.paused)
  }

  function onPlaying() {
    DebugTool.event("playing", "MediaElement")
    DebugTool.dynamicMetric("ready-state", mediaElement.readyState)

    getBufferedRanges().map(({ kind, buffered }) => DebugTool.buffered(kind, buffered))

    isEnded = false

    publishMediaState(MediaState.PLAYING)
  }

  function onPaused() {
    DebugTool.event("paused", "MediaElement")
    DebugTool.dynamicMetric("paused", mediaElement.paused)

    publishMediaState(MediaState.PAUSED)
  }

  function onBuffering() {
    isEnded = false

    if (!isSeeking || !publishedSeekEvent) {
      publishMediaState(MediaState.WAITING)
      publishedSeekEvent = true
    }
  }

  function onSeeked() {
    DebugTool.event("seeked", "MediaElement")
    DebugTool.dynamicMetric("seeking", mediaElement.seeking)

    isSeeking = false

    if (isPaused()) {
      if (manifestType === ManifestType.DYNAMIC && isSliding()) {
        startAutoResumeTimeout()
      }
      publishMediaState(MediaState.PAUSED)
    } else {
      publishMediaState(MediaState.PLAYING)
    }
  }

  function onSeeking() {
    DebugTool.event("seeking", "MediaElement")
    DebugTool.dynamicMetric("seeking", mediaElement.seeking)

    onBuffering()
  }

  function onWaiting() {
    DebugTool.event("waiting", "MediaElement")
    DebugTool.dynamicMetric("ready-state", mediaElement.readyState)

    getBufferedRanges().map(({ kind, buffered }) => DebugTool.buffered(kind, buffered))

    onBuffering()
  }

  function onEnded() {
    DebugTool.event("ended", "MediaElement")
    DebugTool.dynamicMetric("ended", mediaElement.ended)

    isEnded = true

    publishMediaState(MediaState.ENDED)
  }

  function onRateChange() {
    DebugTool.dynamicMetric("playback-rate", mediaElement.playbackRate)
  }

  function onTimeUpdate() {
    DebugTool.updateElementTime(mediaElement.currentTime)

    const currentPresentationTimeInSeconds = mediaElement.currentTime

    // Note: Multiple consecutive CDN failover logic
    // A newly loaded video element will always report a 0 time update
    // This is slightly unhelpful if we want to continue from a later point but consult failoverTime as the source of truth.
    if (
      typeof currentPresentationTimeInSeconds === "number" &&
      isFinite(currentPresentationTimeInSeconds) &&
      parseInt(currentPresentationTimeInSeconds) > 0
    ) {
      failoverPresentationTimeInSeconds = currentPresentationTimeInSeconds
    }

    publishTimeUpdate()
  }

  function onError(event) {
    if (event.error && event.error.data) {
      delete event.error.data
    }

    if (event.error && event.error.message) {
      DebugTool.error(`${event.error.message} (code: ${event.error.code})`)

      lastError = event.error

      // Don't raise an error on fragment download error
      if (
        (event.error.code === DashJSEvents.DOWNLOAD_CONTENT_ERROR_CODE ||
          event.error.code === DashJSEvents.DOWNLOAD_INIT_SEGMENT_ERROR_CODE) &&
        mediaSources.availableSources().length > 1
      ) {
        return
      }

      if (event.error.code === DashJSEvents.DOWNLOAD_MANIFEST_ERROR_CODE) {
        manifestDownloadError(event.error)
        return
      }

      // It is possible audio could play back even if the video codec is not supported. Resetting here prevents this.
      if (event.error.code === DashJSEvents.UNSUPPORTED_CODEC) {
        mediaPlayer.reset()
      }
    }

    publishError(event.error)
  }

  function onGapJump({ seekTime, duration }) {
    DebugTool.gap(seekTime - duration, seekTime)
  }

  function onQuotaExceeded(event) {
    // Note: criticalBufferLevel (Total buffered ranges * 0.8) is set BEFORE this event is triggered,
    // therefore it should actually be `criticalBufferLevel * 1.25` to see what the buffer size was on the device when this happened.
    const bufferLevel = event.criticalBufferLevel * 1.25
    DebugTool.quotaExceeded(bufferLevel, event.quotaExceededTime)
    Plugins.interface.onQuotaExceeded({ criticalBufferLevel: bufferLevel, quotaExceededTime: event.quotaExceededTime })
  }

  function manifestDownloadError(mediaError) {
    const failoverParams = {
      isBufferingTimeoutError: false,
      currentTime: getCurrentTime(),
      duration: getDuration(),
      code: mediaError.code,
      message: mediaError.message,
    }

    mediaSources
      .failover(failoverParams)
      .then(() => load())
      .catch(() => publishError(mediaError))
  }

  function onManifestLoaded(event) {
    if (event.data) {
      DebugTool.info(`Manifest loaded. Duration is: ${event.data.mediaPresentationDuration}`)
      let manifest = event.data
      const representationOptions = window.bigscreenPlayer.representationOptions || {}

      ManifestModifier.filter(manifest, representationOptions)
      ManifestModifier.generateBaseUrls(manifest, mediaSources.availableSources())

      manifest = { ...manifest, manifestLoadCount, manifestRequestTime }
      manifestLoadCount = 0

      emitManifestInfo(manifest)
    }
  }

  function emitManifestInfo(manifest) {
    Plugins.interface.onManifestLoaded(manifest)
  }

  function onManifestValidityChange(event) {
    DebugTool.info(`Manifest validity changed. Duration is: ${event.newDuration}`)

    if (manifestType === ManifestType.DYNAMIC) {
      mediaPlayer.refreshManifest((manifest) => {
        DebugTool.info(`Manifest Refreshed. Duration is: ${manifest.mediaPresentationDuration}`)
      })
    }
  }

  function onStreamInitialised() {
    if (window.bigscreenPlayer?.overrides?.mseDurationOverride && manifestType === ManifestType.DYNAMIC) {
      // Workaround for no setLiveSeekableRange/clearLiveSeekableRange
      mediaPlayer.setMediaDuration(Number.MAX_SAFE_INTEGER)
    }

    emitPlayerInfo()
  }

  function emitPlayerInfo() {
    playerMetadata.playbackBitrate =
      mediaKind === MediaKinds.VIDEO
        ? currentPlaybackBitrate(MediaKinds.VIDEO) + currentPlaybackBitrate(MediaKinds.AUDIO)
        : currentPlaybackBitrate(MediaKinds.AUDIO)

    DebugTool.dynamicMetric("bitrate", playerMetadata.playbackBitrate)

    Plugins.interface.onPlayerInfoUpdated({
      bufferLength: playerMetadata.bufferLength,
      playbackBitrate: playerMetadata.playbackBitrate,
    })
  }

  function getBufferedRanges() {
    if (mediaPlayer == null) {
      return []
    }

    return mediaPlayer
      .getActiveStream()
      .getProcessors()
      .filter((processor) => processor.getType() === "audio" || processor.getType() === "video")
      .map((processor) => ({
        kind: processor.getType(),
        buffered: convertTimeRangesToArray(processor.getBuffer().getAllBufferRanges()),
      }))
  }

  function currentPlaybackBitrate(mediaKind) {
    const representationSwitch = mediaPlayer.getDashMetrics().getCurrentRepresentationSwitch(mediaKind)
    const representation = representationSwitch ? representationSwitch.to : ""
    return playbackBitrateForRepresentation(representation, mediaKind)
  }

  function playbackBitrateForRepresentation(representation, mediaKind) {
    const repIdx = mediaPlayer.getDashAdapter().getIndexForRepresentation(representation, 0)
    return playbackBitrateForRepresentationIndex(repIdx, mediaKind)
  }

  function playbackBitrateForRepresentationIndex(index, mediaKind) {
    if (index === -1) return ""

    const bitrateInfoList = mediaPlayer.getBitrateInfoListFor(mediaKind)
    return parseInt(bitrateInfoList[index].bitrate / 1000)
  }

  function logBitrate(abrType, { mediaType, oldQuality, newQuality }) {
    const oldBitrate = isNaN(oldQuality) ? "--" : playbackBitrateForRepresentationIndex(oldQuality, mediaType)
    const newBitrate = isNaN(newQuality) ? "--" : playbackBitrateForRepresentationIndex(newQuality, mediaType)

    const oldRepresentation = isNaN(oldQuality) ? "Start" : `${oldQuality} (${oldBitrate} kbps)`
    const newRepresentation = `${newQuality} (${newBitrate} kbps)`

    DebugTool.info(
      `${mediaType} ABR Change ${abrType} From Representation ${oldRepresentation} to ${newRepresentation}`
    )
  }

  function onQualityChangeRequested(event) {
    if (event.newQuality !== undefined) {
      logBitrate("Requested", event)
    }

    event.throughput = mediaPlayer.getAverageThroughput(mediaKind)

    Plugins.interface.onQualityChangeRequested(event)
  }

  function onQualityChangeRendered(event) {
    if (event.newQuality !== undefined) {
      logBitrate("Rendered", event)
    }

    emitPlayerInfo()
    Plugins.interface.onQualityChangedRendered(event)
  }

  /**
   * Base url selected events are fired from dash.js whenever a priority weighted url is selected from a manifest
   * Note: we ignore the initial selection as it isn't a failover.
   * @param {*} event
   */
  function onBaseUrlSelected(event) {
    const failoverInfo = {
      isBufferingTimeoutError: false,
      code: lastError && lastError.code,
      message: lastError && lastError.message,
    }

    function log() {
      DebugTool.info(`BaseUrl selected: ${event.baseUrl.url}`)
      lastError = undefined
    }

    failoverInfo.serviceLocation = event.baseUrl.serviceLocation

    mediaSources.failover(failoverInfo).then(
      () => log(),
      () => log()
    )
  }

  function onServiceLocationAvailable(event) {
    DebugTool.info(`Service Location available: ${event.entry}`)
  }

  function onURLResolutionFailed() {
    DebugTool.info("URL Resolution failed")
  }

  function onMetricAdded(event) {
    if (event.mediaType === "video" && event.metric === "DroppedFrames") {
      DebugTool.staticMetric("frames-dropped", event.value.droppedFrames)
    }
    if (event.mediaType === mediaKind && event.metric === "BufferLevel") {
      dashMetrics = mediaPlayer.getDashMetrics()

      if (dashMetrics) {
        playerMetadata.bufferLength = dashMetrics.getCurrentBufferLevel(event.mediaType)
        DebugTool.staticMetric("buffer-length", playerMetadata.bufferLength)
        Plugins.interface.onPlayerInfoUpdated({
          bufferLength: playerMetadata.bufferLength,
          playbackBitrate: playerMetadata.playbackBitrate,
        })
      }
    }
  }

  function onDebugLog(event) {
    DebugTool.debug(event.message)
  }

  function onFragmentContentLengthMismatch(event) {
    DebugTool.info(`Fragment Content Length Mismatch: ${event.responseUrl} (${event.mediaType})`)
    DebugTool.info(`Header Length ${event.headerLength}`)
    DebugTool.info(`Body Length ${event.bodyLength})`)
    Plugins.interface.onFragmentContentLengthMismatch(event)
  }

  function publishMediaState(mediaState) {
    for (let index = 0; index < eventCallbacks.length; index++) {
      eventCallbacks[index](mediaState)
    }
  }

  function publishTimeUpdate() {
    if (timeUpdateCallback) {
      timeUpdateCallback()
    }
  }

  function publishError(mediaError) {
    if (errorCallback) {
      errorCallback(mediaError)
    }
  }

  function isPaused() {
    return mediaPlayer && mediaPlayer.isReady() ? mediaPlayer.isPaused() : undefined
  }

  function load(mimeType, playbackTime) {
    if (mediaPlayer) {
      modifySource(refreshFailoverPresentationTimeInSeconds || failoverPresentationTimeInSeconds)
    } else {
      failoverPresentationTimeInSeconds = playbackTime
      setUpMediaElement(playbackElement)
      setUpMediaPlayer(playbackTime)
      setUpMediaListeners()
    }
  }

  function setUpMediaElement(playbackElement) {
    mediaElement = mediaKind === MediaKinds.AUDIO ? document.createElement("audio") : document.createElement("video")

    mediaElement.style.position = "absolute"
    mediaElement.style.width = "100%"
    mediaElement.style.height = "100%"

    playbackElement.insertBefore(mediaElement, playbackElement.firstChild)
  }

  function getDashSettings(playerSettings) {
    const settings = Utils.deepClone(playerSettings)

    // BSP Specific Settings
    delete settings.failoverResetTime
    delete settings.failoverSort
    delete settings.streaming?.seekDurationPadding

    return settings
  }

  function setUpMediaPlayer(playbackTime) {
    const dashSettings = getDashSettings(playerSettings)

    mediaPlayer = MediaPlayer().create()
    mediaPlayer.updateSettings(dashSettings)
    mediaPlayer.initialize(mediaElement, null, true)
    modifySource(playbackTime)
  }

  function modifySource(playbackTime) {
    const source = mediaSources.currentSource()
    const anchor = buildSourceAnchor(playbackTime)

    mediaPlayer.attachSource(`${source}${anchor}`)
  }

  /**
   * Calculate time anchor tag for playback within dashjs
   *
   * Anchor tags applied to the MPD source for playback:
   *
   * #t=<time> - Seeks MPD timeline. By itself it means time since the beginning of the first period defined in the DASH manifest
   *
   * @param {number} presentationTimeInSeconds
   * @returns {string}
   */
  function buildSourceAnchor(presentationTimeInSeconds) {
    if (typeof presentationTimeInSeconds !== "number" || !isFinite(presentationTimeInSeconds)) {
      return ""
    }

    const wholeSeconds = parseInt(presentationTimeInSeconds)

    return wholeSeconds === 0 ? "" : `#t=${wholeSeconds}`
  }

  function setUpMediaListeners() {
    DebugTool.dynamicMetric("ended", mediaElement.ended)
    DebugTool.dynamicMetric("paused", mediaElement.paused)
    DebugTool.dynamicMetric("playback-rate", mediaElement.playbackRate)
    DebugTool.dynamicMetric("ready-state", mediaElement.readyState)
    DebugTool.dynamicMetric("seeking", mediaElement.seeking)

    mediaElement.addEventListener("timeupdate", onTimeUpdate)
    mediaElement.addEventListener("loadedmetadata", onLoadedMetaData)
    mediaElement.addEventListener("loadeddata", onLoadedData)
    mediaElement.addEventListener("play", onPlay)
    mediaElement.addEventListener("playing", onPlaying)
    mediaElement.addEventListener("pause", onPaused)
    mediaElement.addEventListener("waiting", onWaiting)
    mediaElement.addEventListener("seeking", onSeeking)
    mediaElement.addEventListener("seeked", onSeeked)
    mediaElement.addEventListener("ended", onEnded)
    mediaElement.addEventListener("ratechange", onRateChange)
    mediaPlayer.on(DashJSEvents.ERROR, onError)
    mediaPlayer.on(DashJSEvents.MANIFEST_LOADED, onManifestLoaded)
    mediaPlayer.on(DashJSEvents.STREAM_INITIALIZED, onStreamInitialised)
    mediaPlayer.on(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange)
    mediaPlayer.on(DashJSEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested)
    mediaPlayer.on(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered)
    mediaPlayer.on(DashJSEvents.BASE_URL_SELECTED, onBaseUrlSelected)
    mediaPlayer.on(DashJSEvents.METRIC_ADDED, onMetricAdded)
    mediaPlayer.on(DashJSEvents.LOG, onDebugLog)
    mediaPlayer.on(DashJSEvents.SERVICE_LOCATION_AVAILABLE, onServiceLocationAvailable)
    mediaPlayer.on(DashJSEvents.URL_RESOLUTION_FAILED, onURLResolutionFailed)
    mediaPlayer.on(DashJSEvents.FRAGMENT_CONTENT_LENGTH_MISMATCH, onFragmentContentLengthMismatch)
    mediaPlayer.on(DashJSEvents.GAP_JUMP, onGapJump)
    mediaPlayer.on(DashJSEvents.GAP_JUMP_TO_END, onGapJump)
    mediaPlayer.on(DashJSEvents.QUOTA_EXCEEDED, onQuotaExceeded)
    mediaPlayer.on(DashJSEvents.MANIFEST_LOADING_FINISHED, manifestLoadingFinished)
  }

  function manifestLoadingFinished(event) {
    manifestLoadCount++
    manifestRequestTime = event.request.requestEndDate.getTime() - event.request.requestStartDate.getTime()
  }

  function getSeekableRangeInPresentationTime() {
    if (manifestType === ManifestType.DYNAMIC && mediaPlayer?.isReady()) {
      const dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaKind)

      // FIX: Dash.js briefly returns `null` on a failover for the first time update
      if (dvrInfo) {
        return { start: dvrInfo.range.start, end: dvrInfo.range.end - liveDelay }
      }
    }

    return { start: 0, end: getDuration() }
  }

  function getDuration() {
    return mediaPlayer && mediaPlayer.isReady() ? mediaPlayer.duration() : 0
  }

  function getCurrentTime() {
    return mediaElement?.currentTime ?? 0
  }

  function refreshManifestBeforeSeek(presentationTimeInSeconds) {
    refreshFailoverPresentationTimeInSeconds = presentationTimeInSeconds

    mediaPlayer.refreshManifest((manifest) => {
      const mediaPresentationDuration = manifest?.mediaPresentationDuration

      if (typeof mediaPresentationDuration === "number" && isFinite(mediaPresentationDuration)) {
        DebugTool.info(`Stream ended`)
      }

      const dvrTimeInSeconds = convertPresentationTimeToDVRTime(
        presentationTimeInSeconds > mediaPresentationDuration
          ? clampPresentationTimeToSafeRange(mediaPresentationDuration)
          : presentationTimeInSeconds
      )

      mediaPlayer.seek(dvrTimeInSeconds)
    })
  }

  function addEventCallback(thisArg, newCallback) {
    const eventCallback = (event) => newCallback.call(thisArg, event)
    eventCallbacks.push(eventCallback)
  }

  function removeEventCallback(callback) {
    const index = eventCallbacks.indexOf(callback)
    if (index !== -1) {
      eventCallbacks.splice(index, 1)
    }
  }

  function isSliding() {
    const { timeShiftBufferDepthInMilliseconds } = mediaSources.time()

    return (
      typeof timeShiftBufferDepthInMilliseconds === "number" &&
      isFinite(timeShiftBufferDepthInMilliseconds) &&
      timeShiftBufferDepthInMilliseconds > 0
    )
  }

  function startAutoResumeTimeout() {
    DynamicWindowUtils.autoResumeAtStartOfRange(
      getCurrentTime(),
      getSeekableRangeInPresentationTime(),
      addEventCallback,
      removeEventCallback,
      (event) => event !== MediaState.PAUSED,
      mediaPlayer.play
    )
  }

  function cleanUpMediaPlayer() {
    if (mediaPlayer) {
      mediaPlayer.destroy()

      mediaPlayer.off(DashJSEvents.ERROR, onError)
      mediaPlayer.off(DashJSEvents.MANIFEST_LOADED, onManifestLoaded)
      mediaPlayer.off(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange)
      mediaPlayer.off(DashJSEvents.STREAM_INITIALIZED, onStreamInitialised)
      mediaPlayer.off(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered)
      mediaPlayer.off(DashJSEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested)
      mediaPlayer.off(DashJSEvents.METRIC_ADDED, onMetricAdded)
      mediaPlayer.off(DashJSEvents.BASE_URL_SELECTED, onBaseUrlSelected)
      mediaPlayer.off(DashJSEvents.LOG, onDebugLog)
      mediaPlayer.off(DashJSEvents.SERVICE_LOCATION_AVAILABLE, onServiceLocationAvailable)
      mediaPlayer.off(DashJSEvents.URL_RESOLUTION_FAILED, onURLResolutionFailed)
      mediaPlayer.off(DashJSEvents.GAP_JUMP, onGapJump)
      mediaPlayer.off(DashJSEvents.GAP_JUMP_TO_END, onGapJump)
      mediaPlayer.off(DashJSEvents.QUOTA_EXCEEDED, onQuotaExceeded)

      mediaPlayer = undefined
    }

    if (mediaElement) {
      mediaElement.removeEventListener("timeupdate", onTimeUpdate)
      mediaElement.removeEventListener("loadedmetadata", onLoadedMetaData)
      mediaElement.removeEventListener("loadeddata", onLoadedData)
      mediaElement.removeEventListener("play", onPlay)
      mediaElement.removeEventListener("playing", onPlaying)
      mediaElement.removeEventListener("pause", onPaused)
      mediaElement.removeEventListener("waiting", onWaiting)
      mediaElement.removeEventListener("seeking", onSeeking)
      mediaElement.removeEventListener("seeked", onSeeked)
      mediaElement.removeEventListener("ended", onEnded)
      mediaElement.removeEventListener("ratechange", onRateChange)

      DOMHelpers.safeRemoveElement(mediaElement)

      mediaElement = undefined
    }
  }

  function getSafelySeekableRangeInPresentationTime() {
    if (manifestType === ManifestType.DYNAMIC && mediaPlayer?.isReady()) {
      const { range } = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaKind)

      return { start: range.start, end: range.end - seekDurationPadding }
    }

    return { start: 0, end: getDuration() - seekDurationPadding }
  }

  function clampPresentationTimeToSafeRange(presentationTimeInSeconds) {
    const { start, end } = getSafelySeekableRangeInPresentationTime()

    return Math.min(Math.max(presentationTimeInSeconds, start), end)
  }

  function convertPresentationTimeToDVRTime(presentationTimeInSeconds) {
    const { start } = getSafelySeekableRangeInPresentationTime()

    return presentationTimeInSeconds - start
  }

  function setCurrentTime(presentationTimeInSeconds) {
    publishedSeekEvent = false
    isSeeking = true

    const safePresentationTime = clampPresentationTimeToSafeRange(presentationTimeInSeconds)

    if (manifestType === ManifestType.DYNAMIC && safePresentationTime > mediaElement.currentTime) {
      refreshManifestBeforeSeek(safePresentationTime)
    } else {
      const dvrTimeInSeconds = convertPresentationTimeToDVRTime(safePresentationTime)
      mediaPlayer.seek(dvrTimeInSeconds)
    }
  }

  function pause(opts = {}) {
    mediaPlayer.pause()
    if (!opts.disableAutoResume && manifestType === ManifestType.DYNAMIC && isSliding()) {
      startAutoResumeTimeout()
    }
  }

  function tearDown() {
    cleanUpMediaPlayer()

    lastError = undefined
    eventCallbacks = []
    errorCallback = undefined
    timeUpdateCallback = undefined
    failoverPresentationTimeInSeconds = undefined
    isEnded = undefined
    dashMetrics = undefined
    playerMetadata = {
      playbackBitrate: undefined,
      bufferLength: undefined,
      fragmentInfo: {
        requestTime: undefined,
        numDownloaded: undefined,
      },
    }
  }

  return {
    transitions: {
      canBePaused: () => true,
      canBeginSeek: () => true,
    },
    addEventCallback,
    removeEventCallback,
    addErrorCallback: (thisArg, newErrorCallback) => {
      errorCallback = (event) => newErrorCallback.call(thisArg, event)
    },
    addTimeUpdateCallback: (thisArg, newTimeUpdateCallback) => {
      timeUpdateCallback = () => newTimeUpdateCallback.call(thisArg)
    },
    load,
    getSeekableRange: getSeekableRangeInPresentationTime,
    getCurrentTime,
    getDuration,
    getPlayerElement: () => mediaElement,
    tearDown,
    reset: () => {
      if (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.resetMSEPlayer) {
        cleanUpMediaPlayer()
      }
    },
    isEnded: () => isEnded,
    isPaused,
    pause,
    play: () => mediaPlayer.play(),
    setCurrentTime,
    setPlaybackRate: (rate) => mediaPlayer.setPlaybackRate(rate),
    getPlaybackRate: () => mediaPlayer.getPlaybackRate(),
  }
}

MSEStrategy.getLiveSupport = () => LiveSupport.SEEKABLE

export default MSEStrategy
