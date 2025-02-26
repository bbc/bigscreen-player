/* eslint-disable no-use-before-define */
import MediaState from "./models/mediastate"
import PauseTriggers from "./models/pausetriggers"
import PlaybackUtils from "./utils/playbackutils"
import callCallbacks from "./utils/callcallbacks"
import Plugins from "./plugins"
import PluginData from "./plugindata"
import PluginEnums from "./pluginenums"
import Version from "./version"
import { ManifestType } from "./main"

let sourceList
let source
let cdn

let timeUpdateCallbacks = []
let subtitleCallbacks = []
let stateChangeCallbacks = []
let broadcastMixADCallbacks = []

let currentTime
let isSeeking
let seekableRange
let duration
let initialPlaybackTime = null
let liveWindowStart = 0
let pausedState = true
let endedState
let mediaKind
let manifestType
let subtitlesAvailable
let subtitlesEnabled
let subtitlesHidden
let broadcastMixADAvailable
let broadcastMixADEnabled
let endOfStream
let canSeekState
let canPauseState
let shallowClone
const mockModes = {
  NONE: 0,
  PLAIN: 1,
  JASMINE: 2,
}
let mockStatus = { currentlyMocked: false, mode: mockModes.NONE }
let initialised
let fatalErrorBufferingTimeout

let autoProgress
let autoProgressInterval
let initialBuffering = false

let manifestError

let excludedFuncs = [
  "getDebugLogs",
  "mock",
  "mockJasmine",
  "unmock",
  "toggleDebug",
  "getLogLevels",
  "setLogLevel",
  "setPlaybackRate",
  "getPlaybackRate",
  "clearSubtitleExample",
  "areSubtitlesCustomisable",
  "convertAvailabilityTimeToPresentationTimeInSeconds",
  "convertMediaSampleTimeToPresentationTimeInSeconds",
  "convertPresentationTimeToAvailabilityTimeInMilliseconds",
  "convertPresentationTimeToMediaSampleTimeInSeconds",
]

let compatibilityFuncs = ["getWindowType", "convertVideoTimeSecondsToEpochMs", "convertEpochMsToVideoTimeSeconds"]

function startProgress(progressCause) {
  setTimeout(() => {
    if (!autoProgressInterval) {
      mockingHooks.changeState(MediaState.PLAYING, progressCause)

      autoProgressInterval = setInterval(() => {
        if (manifestType !== ManifestType.STATIC && seekableRange.start && seekableRange.end) {
          seekableRange.start += 0.5
          seekableRange.end += 0.5
        }

        mockingHooks.progressTime(currentTime + 0.5)

        if (currentTime >= duration) {
          clearInterval(autoProgressInterval)
          mockingHooks.changeState(MediaState.ENDED)
        }
      }, 500)
    }
  }, 100)
}

function stopProgress() {
  if (autoProgressInterval) {
    clearInterval(autoProgressInterval)
    autoProgressInterval = null
  }
}

function mock(BigscreenPlayer, opts) {
  autoProgress = opts?.autoProgress

  if (opts?.excludedFuncs) {
    excludedFuncs = [...excludedFuncs, ...opts.excludedFuncs]
  }

  if (opts?.compatibilityFuncs) {
    compatibilityFuncs = [...compatibilityFuncs, ...opts.compatibilityFuncs]
  }

  if (mockStatus.currentlyMocked) {
    throw new Error("mock() was called while BigscreenPlayer was already mocked")
  }
  shallowClone = PlaybackUtils.clone(BigscreenPlayer)

  // Divert existing functions
  for (const func in BigscreenPlayer) {
    if (BigscreenPlayer[func] && mockFunctions[func]) {
      BigscreenPlayer[func] = mockFunctions[func]
    } else if (!PlaybackUtils.contains(excludedFuncs, func)) {
      throw new Error(`${func} was not mocked or included in the exclusion list`)
    }
  }
  // Add extra functions
  for (const hook in mockingHooks) {
    BigscreenPlayer[hook] = mockingHooks[hook]
  }

  // Add compatibility functions
  for (let funcsSoFar = 0; funcsSoFar < compatibilityFuncs.length; funcsSoFar += 1) {
    const funcName = compatibilityFuncs[funcsSoFar]

    BigscreenPlayer[funcName] = mockFunctions[funcName]
  }

  mockStatus = { currentlyMocked: true, mode: mockModes.PLAIN }
}

function mockJasmine(BigscreenPlayer, opts) {
  autoProgress = opts && opts.autoProgress

  if (opts && opts.excludedFuncs) {
    excludedFuncs = [...excludedFuncs, ...opts.excludedFuncs]
  }

  if (mockStatus.currentlyMocked) {
    throw new Error("mockJasmine() was called while BigscreenPlayer was already mocked")
  }

  for (const fn in BigscreenPlayer) {
    if (BigscreenPlayer[fn] && mockFunctions[fn]) {
      spyOn(BigscreenPlayer, fn).and.callFake(mockFunctions[fn])
    } else if (!PlaybackUtils.contains(excludedFuncs, fn)) {
      throw new Error(`${fn} was not mocked or included in the exclusion list`)
    }
  }

  for (const hook in mockingHooks) {
    BigscreenPlayer[hook] = mockingHooks[hook]
  }
  mockStatus = { currentlyMocked: true, mode: mockModes.JASMINE }
}

function unmock(BigscreenPlayer) {
  if (!mockStatus.currentlyMocked) {
    throw new Error("unmock() was called before BigscreenPlayer was mocked")
  }

  // Remove extra functions
  for (const hook in mockingHooks) {
    delete BigscreenPlayer[hook]
  }
  // Undo divert existing functions (plain mock only)
  if (mockStatus.mode === mockModes.PLAIN) {
    for (const func in shallowClone) {
      BigscreenPlayer[func] = shallowClone[func]
    }
  }

  timeUpdateCallbacks = []
  stateChangeCallbacks = []

  mockStatus = { currentlyMocked: false, mode: mockModes.NONE }
}

function callSubtitlesCallbacks(enabled) {
  callCallbacks(subtitleCallbacks, { enabled })
}

const mockFunctions = {
  init(playbackElement, bigscreenPlayerData, callbacks) {
    initialPlaybackTime =
      typeof bigscreenPlayerData?.initialPlaybackTime === "number" ? bigscreenPlayerData.initialPlaybackTime : null
    currentTime = initialPlaybackTime == null ? 0 : initialPlaybackTime
    liveWindowStart = 0
    pausedState = true
    endedState = false
    mediaKind = bigscreenPlayerData?.media?.kind || "video"
    subtitlesAvailable = true
    subtitlesEnabled = bigscreenPlayerData?.enableSubtitles ?? false
    broadcastMixADAvailable = false
    broadcastMixADEnabled = false
    canSeekState = true
    canPauseState = true
    sourceList = bigscreenPlayerData?.media?.urls
    source = sourceList?.[0].url
    cdn = sourceList?.[0].cdn

    duration = manifestType === ManifestType.STATIC ? 4808 : Infinity
    seekableRange = { start: 0, end: 4808 }

    if (manifestError) {
      if (callbacks && callbacks.onError) {
        callbacks.onError({ error: "manifest" })
      }
      return
    }

    mockingHooks.changeState(MediaState.WAITING)

    if (autoProgress && !initialBuffering) {
      startProgress()
    }

    initialised = true

    if (subtitlesEnabled) {
      callSubtitlesCallbacks(true)
    }

    if (callbacks?.onSuccess) {
      callbacks.onSuccess()
    }
  },
  registerForTimeUpdates(callback) {
    timeUpdateCallbacks.push(callback)
    return callback
  },
  unregisterForTimeUpdates(callback) {
    timeUpdateCallbacks = timeUpdateCallbacks.filter((existingCallback) => callback !== existingCallback)
  },
  registerForSubtitleChanges(callback) {
    subtitleCallbacks.push(callback)
    return callback
  },
  unregisterForSubtitleChanges(callback) {
    subtitleCallbacks = subtitleCallbacks.filter((existingCallback) => callback !== existingCallback)
  },
  registerForBroadcastMixADChanges(callback) {
    broadcastMixADCallbacks.push(callback)
    return callback
  },
  unregisterForBroadcastMixADChanges(callback) {
    broadcastMixADCallbacks = broadcastMixADCallbacks.filter((existingCallback) => callback !== existingCallback)
  },
  registerForStateChanges(callback) {
    stateChangeCallbacks.push(callback)
    return callback
  },
  unregisterForStateChanges(callback) {
    stateChangeCallbacks = stateChangeCallbacks.filter((existingCallback) => callback !== existingCallback)
  },
  setCurrentTime(time) {
    currentTime = time - liveWindowStart
    isSeeking = true

    if (autoProgress) {
      mockingHooks.changeState(MediaState.WAITING, "other")
      if (!pausedState) {
        startProgress()
      }
    } else {
      mockingHooks.progressTime(currentTime)
    }
  },
  getCurrentTime() {
    return currentTime + liveWindowStart
  },
  getInitialPlaybackTime() {
    return initialPlaybackTime
  },
  getMediaKind() {
    return mediaKind
  },
  getWindowType() {
    return manifestType === ManifestType.STATIC ? "staticWindow" : "slidingWindow"
  },
  getSeekableRange() {
    return seekableRange?.start && seekableRange?.end
      ? { start: seekableRange.start + liveWindowStart, end: seekableRange.end + liveWindowStart }
      : seekableRange
  },
  getDuration() {
    return duration
  },
  isPaused() {
    return pausedState
  },
  isEnded() {
    return endedState
  },
  play() {
    if (autoProgress) {
      startProgress("other")
    } else {
      mockingHooks.changeState(MediaState.PLAYING, "other")
    }
  },
  pause(opts) {
    mockingHooks.changeState(MediaState.PAUSED, "other", opts)
  },
  setSubtitlesEnabled(value) {
    subtitlesEnabled = value
    callSubtitlesCallbacks(value)
  },
  isSubtitlesEnabled() {
    return subtitlesEnabled
  },
  isSubtitlesAvailable() {
    return subtitlesAvailable
  },
  customiseSubtitles() {},
  renderSubtitleExample() {},
  setBroadcastMixADEnabled(value) {
    broadcastMixADEnabled = value
  },
  isBroadcastMixADEnabled() {
    return broadcastMixADEnabled
  },
  isBroadcastMixADAvailable() {
    return broadcastMixADAvailable
  },
  setTransportControlsPosition() {},
  canSeek() {
    return canSeekState
  },
  canPause() {
    return canPauseState
  },
  transitions() {
    return {
      canBePaused() {
        return true
      },
      canBeginSeek() {
        return true
      },
    }
  },
  isPlayingAtLiveEdge() {
    return false
  },
  resize() {
    subtitlesHidden = this.isSubtitlesEnabled()
    this.setSubtitlesEnabled(subtitlesHidden)
  },
  clearResize() {
    this.setSubtitlesEnabled(subtitlesHidden)
  },
  getPlayerElement() {},
  getFrameworkVersion() {
    return Version
  },
  tearDown() {
    manifestError = false
    if (!initialised) {
      return
    }

    Plugins.interface.onBufferingCleared(
      new PluginData({
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.BUFFERING,
        isInitialPlay: initialBuffering,
      })
    )
    Plugins.interface.onErrorCleared(
      new PluginData({ status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR })
    )
    Plugins.unregisterPlugin()

    timeUpdateCallbacks = []
    stateChangeCallbacks = []

    if (autoProgress) {
      stopProgress()
    }

    initialised = false
  },
  registerPlugin(plugin) {
    Plugins.registerPlugin(plugin)
  },
  unregisterPlugin(plugin) {
    Plugins.unregisterPlugin(plugin)
  },
  getPresentationTimeOffsetInMilliseconds() {
    return 0
  },
  getTimeShiftBufferDepthInMilliseconds() {
    return manifestType === ManifestType.STATIC ? 0 : 7200000
  },
  convertVideoTimeSecondsToEpochMs(seconds) {
    return seconds
  },
  convertEpochMsToVideoTimeSeconds(milliseconds) {
    return milliseconds
  },
}

const mockingHooks = {
  changeState(state, eventTrigger, opts) {
    // eslint-disable-next-line no-param-reassign
    eventTrigger = eventTrigger || "device"
    const pauseTrigger = opts && opts.userPause === false ? PauseTriggers.APP : PauseTriggers.USER

    pausedState = state === MediaState.PAUSED || state === MediaState.STOPPED || state === MediaState.ENDED
    endedState = state === MediaState.ENDED

    if (state === MediaState.WAITING) {
      fatalErrorBufferingTimeout = true
      Plugins.interface.onBuffering(
        new PluginData({ status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.BUFFERING })
      )
    } else {
      Plugins.interface.onBufferingCleared(
        new PluginData({
          status: PluginEnums.STATUS.DISMISSED,
          stateType: PluginEnums.TYPE.BUFFERING,
          isInitialPlay: initialBuffering,
        })
      )
    }
    Plugins.interface.onErrorCleared(
      new PluginData({ status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR })
    )

    if (state === MediaState.FATAL_ERROR) {
      Plugins.interface.onFatalError(
        new PluginData({
          status: PluginEnums.STATUS.FATAL,
          stateType: PluginEnums.TYPE.ERROR,
          isBufferingTimeoutError: fatalErrorBufferingTimeout,
        })
      )
    }

    const stateObject = { state }
    if (state === MediaState.PAUSED) {
      stateObject.trigger = pauseTrigger
      endOfStream = false
    }
    if (state === MediaState.FATAL_ERROR) {
      stateObject.errorId = opts && opts.error
      stateObject.isBufferingTimeoutError = opts && opts.isBufferingTimeoutError
    }
    if (state === MediaState.WAITING) {
      stateObject.isSeeking = isSeeking
      isSeeking = false
    }
    stateObject.endOfStream = endOfStream

    callCallbacks(stateChangeCallbacks, stateObject)

    if (autoProgress) {
      if (state === MediaState.PLAYING) {
        startProgress()
      } else {
        stopProgress()
      }
    }
  },
  progressTime(time) {
    currentTime = time + liveWindowStart
    callCallbacks(timeUpdateCallbacks, {
      currentTime: time + liveWindowStart,
      endOfStream,
    })
  },
  setEndOfStream(isEndOfStream) {
    endOfStream = isEndOfStream
  },
  setDuration(mediaDuration) {
    duration = mediaDuration
  },
  setSeekableRange(newSeekableRange) {
    seekableRange = newSeekableRange
  },
  setMediaKind(kind) {
    mediaKind = kind
  },
  setWindowType(type) {
    manifestType = type === "staticWindow" ? "static" : "dynamic"
  },
  setCanSeek(value) {
    canSeekState = value
  },
  setCanPause(value) {
    canPauseState = value
  },
  setLiveWindowStart(value) {
    liveWindowStart = value
  },
  setSubtitlesAvailable(value) {
    subtitlesAvailable = value
  },
  getSource() {
    return source
  },
  triggerError() {
    fatalErrorBufferingTimeout = false
    Plugins.interface.onError(
      new PluginData({
        status: PluginEnums.STATUS.STARTED,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: false,
      })
    )
    this.changeState(MediaState.WAITING)
    stopProgress()
  },
  triggerManifestError() {
    manifestError = true
  },
  triggerErrorHandled() {
    if (sourceList && sourceList.length > 1) {
      sourceList.shift()
      source = sourceList[0].url
      cdn = sourceList[0].cdn
    }
    Plugins.interface.onBufferingCleared(
      new PluginData({
        status: PluginEnums.STATUS.DISMISSED,
        stateType: PluginEnums.TYPE.BUFFERING,
        isInitialPlay: initialBuffering,
      })
    )
    Plugins.interface.onErrorCleared(
      new PluginData({ status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR })
    )
    Plugins.interface.onErrorHandled(
      new PluginData({
        status: PluginEnums.STATUS.FAILOVER,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: fatalErrorBufferingTimeout,
        cdn,
      })
    )

    if (autoProgress) {
      stopProgress()
      startProgress()
    }
  },
  setInitialBuffering(value) {
    initialBuffering = value
  },
}

export default {
  mock,
  unmock,
  mockJasmine,
}
