import { MediaPlayer } from "dashjs/index_mediaplayerOnly"
import MediaState from "../models/mediastate"
import WindowTypes from "../models/windowtypes"
import DebugTool from "../debugger/debugtool"
import MediaKinds from "../models/mediakinds"
import Plugins from "../plugins"
import ManifestModifier from "../manifest/manifestmodifier"
import LiveSupport from "../models/livesupport"
import DynamicWindowUtils from "../dynamicwindowutils"
import TimeUtils from "../utils/timeutils"
import DOMHelpers from "../domhelpers"
import Utils from "../utils/playbackutils"
import buildSourceAnchor, { TimelineZeroPoints } from "../utils/mse/build-source-anchor"
import convertTimeRangesToArray from "../utils/mse/convert-timeranges-to-array"

const DEFAULT_SETTINGS = {
  liveDelay: 0,
  seekDurationPadding: 1.1,
}

function MSEStrategy(mediaSources, windowType, mediaKind, playbackElement, isUHD, customPlayerSettings) {
  let mediaPlayer
  let mediaElement

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

  let timeCorrection = mediaSources.time()?.timeCorrectionSeconds || 0

  const seekDurationPadding = isNaN(playerSettings.streaming?.seekDurationPadding)
    ? DEFAULT_SETTINGS.seekDurationPadding
    : playerSettings.streaming?.seekDurationPadding
  const liveDelay = isNaN(playerSettings.streaming?.delay?.liveDelay)
    ? DEFAULT_SETTINGS.liveDelay
    : playerSettings.streaming?.delay?.liveDelay
  let failoverTime
  let failoverZeroPoint
  let refreshFailoverTime
  let slidingWindowPausedTime = 0
  let isEnded = false

  let dashMetrics
  let lastError

  let publishedSeekEvent = false
  let isSeeking = false

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
    DOWNLOAD_MANIFEST_ERROR_CODE: 25,
    DOWNLOAD_CONTENT_ERROR_CODE: 27,
    DOWNLOAD_INIT_SEGMENT_ERROR_CODE: 28,
    UNSUPPORTED_CODEC: 30,
    MANIFEST_VALIDITY_CHANGED: "manifestValidityChanged",
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
      if (windowType === WindowTypes.SLIDING) {
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

    const currentMpdTimeSeconds =
      windowType === WindowTypes.SLIDING
        ? mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaKind)?.time
        : mediaElement.currentTime

    // Note: Multiple consecutive CDN failover logic
    // A newly loaded video element will always report a 0 time update
    // This is slightly unhelpful if we want to continue from a later point but consult failoverTime as the source of truth.
    if (
      typeof currentMpdTimeSeconds === "number" &&
      isFinite(currentMpdTimeSeconds) &&
      parseInt(currentMpdTimeSeconds) > 0
    ) {
      failoverTime = currentMpdTimeSeconds
      failoverZeroPoint = TimelineZeroPoints.MPD
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
        event.error.code === DashJSEvents.DOWNLOAD_CONTENT_ERROR_CODE ||
        event.error.code === DashJSEvents.DOWNLOAD_INIT_SEGMENT_ERROR_CODE
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
    const error = () => publishError(mediaError)

    const failoverParams = {
      isBufferingTimeoutError: false,
      currentTime: getCurrentTime(),
      duration: getDuration(),
      code: mediaError.code,
      message: mediaError.message,
    }

    mediaSources.failover(load, error, failoverParams)
  }

  function onManifestLoaded(event) {
    DebugTool.info(`Manifest loaded. Duration is: ${event.data.mediaPresentationDuration}`)

    if (event.data) {
      const manifest = event.data
      const representationOptions = window.bigscreenPlayer.representationOptions || {}

      ManifestModifier.filter(manifest, representationOptions)
      ManifestModifier.generateBaseUrls(manifest, mediaSources.availableSources())

      emitManifestInfo(manifest)
    }
  }

  function emitManifestInfo(manifest) {
    Plugins.interface.onManifestLoaded(manifest)
  }

  function onManifestValidityChange(event) {
    DebugTool.info(`Manifest validity changed. Duration is: ${event.newDuration}`)
    if (windowType === WindowTypes.GROWING) {
      mediaPlayer.refreshManifest((manifest) => {
        DebugTool.info(`Manifest Refreshed. Duration is: ${manifest.mediaPresentationDuration}`)
      })
    }
  }

  function onStreamInitialised() {
    const setMseDuration = window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.mseDurationOverride
    if (setMseDuration && (windowType === WindowTypes.SLIDING || windowType === WindowTypes.GROWING)) {
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

  function onQualityChangeRendered(event) {
    function logBitrate(event) {
      const { mediaType, oldQuality, newQuality } = event

      const oldBitrate = isNaN(oldQuality) ? "--" : playbackBitrateForRepresentationIndex(oldQuality, mediaType)
      const newBitrate = isNaN(newQuality) ? "--" : playbackBitrateForRepresentationIndex(newQuality, mediaType)

      const oldRepresentation = isNaN(oldQuality) ? "Start" : `${oldQuality} (${oldBitrate} kbps)`
      const newRepresentation = `${newQuality} (${newBitrate} kbps)`

      DebugTool.dynamicMetric(`representation-${mediaType}`, [newQuality, newBitrate])

      DebugTool.info(
        `${mediaType} ABR Change Rendered From Representation ${oldRepresentation} To ${newRepresentation}`
      )
    }

    if (event.newQuality !== undefined) {
      logBitrate(event)
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
    mediaSources.failover(log, log, failoverInfo)
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

  function getClampedTime(time, range) {
    return Math.min(Math.max(time, range.start), range.end - Math.max(liveDelay, seekDurationPadding))
  }

  function load(mimeType, playbackTime) {
    if (mediaPlayer) {
      modifySource(refreshFailoverTime || failoverTime, failoverZeroPoint)
    } else {
      failoverTime = playbackTime
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

  function modifySource(playbackTime, zeroPoint) {
    const source = mediaSources.currentSource()
    const anchor = buildSourceAnchor(playbackTime, zeroPoint, {
      windowType,
      initialSeekableRangeStartSeconds: mediaSources.time().windowStartTime / 1000,
    })

    mediaPlayer.attachSource(`${source}${anchor}`)
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
  }

  function getSeekableRange() {
    if (mediaPlayer && mediaPlayer.isReady() && windowType !== WindowTypes.STATIC) {
      const dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaKind)
      if (dvrInfo) {
        return {
          start: dvrInfo.range.start - timeCorrection,
          end: dvrInfo.range.end - timeCorrection - liveDelay,
        }
      }
    }

    return {
      start: 0,
      end: getDuration(),
    }
  }

  function getDuration() {
    return mediaPlayer && mediaPlayer.isReady() ? mediaPlayer.duration() : 0
  }

  function getCurrentTime() {
    return mediaElement ? mediaElement.currentTime - timeCorrection : 0
  }

  function refreshManifestBeforeSeek(seekToTime) {
    refreshFailoverTime = seekToTime

    mediaPlayer.refreshManifest((manifest) => {
      const mediaPresentationDuration = manifest && manifest.mediaPresentationDuration
      if (isNaN(mediaPresentationDuration)) {
        mediaPlayer.seek(seekToTime)
      } else {
        DebugTool.info("Stream ended. Clamping seek point to end of stream")
        mediaPlayer.seek(
          getClampedTime(seekToTime, { start: getSeekableRange().start, end: mediaPresentationDuration })
        )
      }
    })
  }

  function calculateSeekOffset(time) {
    function getClampedTimeForLive(time) {
      return Math.min(Math.max(time, 0), mediaPlayer.getDVRWindowSize() - Math.max(liveDelay, seekDurationPadding))
    }

    if (windowType === WindowTypes.SLIDING) {
      const dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaKind)
      const offset = TimeUtils.calculateSlidingWindowSeekOffset(
        time,
        dvrInfo.range.start,
        timeCorrection,
        slidingWindowPausedTime
      )
      slidingWindowPausedTime = 0

      return getClampedTimeForLive(offset)
    }
    return getClampedTime(time, getSeekableRange())
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

  function startAutoResumeTimeout() {
    DynamicWindowUtils.autoResumeAtStartOfRange(
      getCurrentTime(),
      getSeekableRange(),
      addEventCallback,
      removeEventCallback,
      (event) => event !== MediaState.PAUSED,
      mediaPlayer.play
    )
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
    getSeekableRange,
    getCurrentTime,
    getDuration,
    getPlayerElement: () => mediaElement,
    tearDown: () => {
      mediaPlayer.reset()

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
      mediaPlayer.off(DashJSEvents.ERROR, onError)
      mediaPlayer.off(DashJSEvents.MANIFEST_LOADED, onManifestLoaded)
      mediaPlayer.off(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange)
      mediaPlayer.off(DashJSEvents.STREAM_INITIALIZED, onStreamInitialised)
      mediaPlayer.off(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered)
      mediaPlayer.off(DashJSEvents.METRIC_ADDED, onMetricAdded)
      mediaPlayer.off(DashJSEvents.BASE_URL_SELECTED, onBaseUrlSelected)
      mediaPlayer.off(DashJSEvents.LOG, onDebugLog)
      mediaPlayer.off(DashJSEvents.SERVICE_LOCATION_AVAILABLE, onServiceLocationAvailable)
      mediaPlayer.off(DashJSEvents.URL_RESOLUTION_FAILED, onURLResolutionFailed)
      mediaPlayer.off(DashJSEvents.GAP_JUMP, onGapJump)
      mediaPlayer.off(DashJSEvents.GAP_JUMP_TO_END, onGapJump)
      mediaPlayer.off(DashJSEvents.QUOTA_EXCEEDED, onQuotaExceeded)

      DOMHelpers.safeRemoveElement(mediaElement)

      lastError = undefined
      mediaPlayer = undefined
      mediaElement = undefined
      eventCallbacks = []
      errorCallback = undefined
      timeUpdateCallback = undefined
      timeCorrection = undefined
      failoverTime = undefined
      failoverZeroPoint = undefined
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
    },
    reset: () => {},
    isEnded: () => isEnded,
    isPaused,
    pause: (opts = {}) => {
      if (windowType === WindowTypes.SLIDING) {
        slidingWindowPausedTime = Date.now()
      }

      mediaPlayer.pause()
      if (opts.disableAutoResume !== true && windowType === WindowTypes.SLIDING) {
        startAutoResumeTimeout()
      }
    },
    play: () => mediaPlayer.play(),
    setCurrentTime: (time) => {
      publishedSeekEvent = false
      isSeeking = true
      const seekToTime = getClampedTime(time, getSeekableRange())
      if (windowType === WindowTypes.GROWING && seekToTime > getCurrentTime()) {
        refreshManifestBeforeSeek(seekToTime)
      } else {
        const seekTime = calculateSeekOffset(time)
        mediaPlayer.seek(seekTime)
      }
    },
    setPlaybackRate: (rate) => {
      mediaPlayer.setPlaybackRate(rate)
    },
    getPlaybackRate: () => mediaPlayer.getPlaybackRate(),
  }
}

MSEStrategy.getLiveSupport = () => LiveSupport.SEEKABLE

export default MSEStrategy
