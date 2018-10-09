define('bigscreenplayer/mockbigscreenplayer',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/pausetriggers',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/plugins',
    'bigscreenplayer/plugindata',
    'bigscreenplayer/pluginenums'
  ],
  function (MediaState, PauseTriggers, WindowTypes, PlaybackUtils, Plugins, PluginData, PluginEnums) {
    var sourceList;
    var source;
    var cdn;

    var timeUpdateCallbacks = [];
    var stateChangeCallbacks = [];

    var currentTime;
    var seekableRange;
    var duration;
    var liveWindowStart;
    var pausedState = true;
    var endedState;
    var mediaKind;
    var windowType;
    var subtitlesAvailable;
    var subtitlesEnabled;
    var endOfStream;
    var canSeekState;
    var canPauseState;
    var shallowClone;
    var mockModes = {
      NONE: 0,
      PLAIN: 1,
      JASMINE: 2
    };
    var mockStatus = {currentlyMocked: false, mode: mockModes.NONE};
    var initialised;
    var fatalErrorBufferingTimeout;

    var autoProgress;
    var autoProgressInterval;
    var initialBuffering = false;

    function startProgress (progressCause) {
      setTimeout(function () {
        if (!autoProgressInterval) {
          mockingHooks.changeState(MediaState.PLAYING, progressCause);
          autoProgressInterval = setInterval(function () {
            if (windowType !== WindowTypes.STATIC && seekableRange.start && seekableRange.end) {
              seekableRange.start += 0.5;
              seekableRange.end += 0.5;
            }
            mockingHooks.progressTime(currentTime + 0.5);
            if (currentTime >= duration) {
              clearInterval(autoProgressInterval);
              mockingHooks.changeState(MediaState.ENDED);
            }
          }, 500);
        }
      }, 100);
    }

    function stopProgress () {
      if (autoProgressInterval) {
        clearInterval(autoProgressInterval);
        autoProgressInterval = null;
      }
    }

    function mock (BigscreenPlayer, opts) {
      autoProgress = opts && opts.autoProgress;

      if (mockStatus.currentlyMocked) {
        throw new Error('mock() was called while BigscreenPlayer was already mocked');
      }
      shallowClone = PlaybackUtils.clone(BigscreenPlayer);

      // Divert existing functions
      for (var mock in mockFunctions) {
        BigscreenPlayer[mock] = mockFunctions[mock];
      }
      // Add extra functions
      for (var hook in mockingHooks) {
        BigscreenPlayer[hook] = mockingHooks[hook];
      }
      mockStatus = {currentlyMocked: true, mode: mockModes.PLAIN};
    }

    function mockJasmine (BigscreenPlayer, opts) {
      autoProgress = opts && opts.autoProgress;

      if (mockStatus.currentlyMocked) {
        throw new Error('mockJasmine() was called while BigscreenPlayer was already mocked');
      }

      for (var mock in mockFunctions) {
        if (BigscreenPlayer[mock]) {
          spyOn(BigscreenPlayer, mock).and.callFake(mockFunctions[mock]);
        }
      }

      for (var hook in mockingHooks) {
        BigscreenPlayer[hook] = mockingHooks[hook];
      }
      mockStatus = {currentlyMocked: true, mode: mockModes.JASMINE};
    }

    function unmock (BigscreenPlayer) {
      if (!mockStatus.currentlyMocked) {
        throw new Error('unmock() was called before BigscreenPlayer was mocked');
      }

      // Remove extra functions
      for (var hook in mockingHooks) {
        delete BigscreenPlayer[hook];
      }
      // Undo divert existing functions (plain mock only)
      if (mockStatus.mode === mockModes.PLAIN) {
        for (var func in shallowClone) {
          BigscreenPlayer[func] = shallowClone[func];
        }
      }

      timeUpdateCallbacks = [];
      stateChangeCallbacks = [];

      mockStatus = {currentlyMocked: false, mode: mockModes.NONE};
    }

    var mockFunctions = {
      init: function (playbackElement, bigscreenPlayerData, newWindowType, enableSubtitles, newLiveSupport) {
        currentTime = (bigscreenPlayerData && bigscreenPlayerData.initialPlaybackTime) || 0;
        liveWindowStart = undefined;
        pausedState = true;
        endedState = false;
        mediaKind = 'video';
        windowType = newWindowType || WindowTypes.STATIC;
        subtitlesAvailable = true;
        subtitlesEnabled = false;
        canSeekState = true;
        canPauseState = true;
        sourceList = bigscreenPlayerData && bigscreenPlayerData.media && bigscreenPlayerData.media.urls;
        source = sourceList && sourceList[0].url;
        cdn = sourceList && sourceList[0].cdn;

        duration = windowType === WindowTypes.STATIC ? 4808 : Infinity;
        seekableRange = {start: 0, end: 4808};

        mockingHooks.changeState(MediaState.WAITING);

        if (autoProgress && !initialBuffering) {
          startProgress();
        }

        initialised = true;
      },
      registerForTimeUpdates: function (callback) {
        timeUpdateCallbacks.push(callback);
        return callback;
      },
      unregisterForTimeUpdates: function (callback) {
        var indexOf = timeUpdateCallbacks.indexOf(callback);

        if (indexOf !== -1) {
          timeUpdateCallbacks.splice(indexOf, 1);
        }
      },
      registerForStateChanges: function (callback) {
        stateChangeCallbacks.push(callback);
        return callback;
      },
      unregisterForStateChanges: function (callback) {
        var indexOf = stateChangeCallbacks.indexOf(callback);

        if (indexOf !== -1) {
          stateChangeCallbacks.splice(indexOf, 1);
        }
      },
      setCurrentTime: function (time) {
        currentTime = time;
        if (autoProgress) {
          if (!pausedState) {
            mockingHooks.changeState(MediaState.WAITING, 'other');
            startProgress();
          }
        } else {
          mockingHooks.progressTime(currentTime);
        }
      },
      getCurrentTime: function () {
        return currentTime;
      },
      getMediaKind: function () {
        return mediaKind;
      },
      getWindowType: function () {
        return windowType;
      },
      getSeekableRange: function () {
        return seekableRange;
      },
      getDuration: function () {
        return duration;
      },
      isPaused: function () {
        return pausedState;
      },
      isEnded: function () {
        return endedState;
      },
      play: function () {
        if (autoProgress) {
          startProgress('other');
        } else {
          mockingHooks.changeState(MediaState.PLAYING, 'other');
        }
      },
      pause: function (opts) {
        mockingHooks.changeState(MediaState.PAUSED, 'other', opts);
      },
      setSubtitlesEnabled: function (value) {
        subtitlesEnabled = value;
      },
      isSubtitlesEnabled: function () {
        return subtitlesEnabled;
      },
      isSubtitlesAvailable: function () {
        return subtitlesAvailable;
      },
      setTransportControlsPosition: function (position) {},
      canSeek: function () {
        return canSeekState;
      },
      canPause: function () {
        return canPauseState;
      },
      convertVideoTimeSecondsToEpochMs: function (seconds) {
        return liveWindowStart ? liveWindowStart + (seconds * 1000) : undefined;
      },
      transitions: function () {
        return {
          canBePaused: function () { return true; },
          canBeginSeek: function () { return true; }
        };
      },
      getPlayerElement: function () {
        return;
      },
      tearDown: function () {
        if (!initialised) {
          return;
        }

        Plugins.interface.onBufferingCleared(new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.BUFFERING, properties: {dismissed_by: 'teardown'}, isInitialPlay: initialBuffering}));
        Plugins.interface.onErrorCleared(new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR, properties: {dismissed_by: 'teardown'}}));
        Plugins.unregisterPlugin();

        timeUpdateCallbacks = [];
        stateChangeCallbacks = [];

        if (autoProgress) {
          stopProgress();
        }

        initialised = false;
      },
      registerPlugin: function (plugin) {
        Plugins.registerPlugin(plugin);
      },
      unregisterPlugin: function (plugin) {
        Plugins.unregisterPlugin(plugin);
      }
    };

    var mockingHooks = {
      changeState: function (state, eventTrigger, opts) {
        eventTrigger = eventTrigger || 'device';
        var pauseTrigger = opts && opts.userPause === false ? PauseTriggers.APP : PauseTriggers.USER;

        pausedState = state === MediaState.PAUSED || state === MediaState.STOPPED || state === MediaState.ENDED;
        endedState = state === MediaState.ENDED;

        if (state === MediaState.WAITING) {
          fatalErrorBufferingTimeout = true;
          Plugins.interface.onBuffering(new PluginData({status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.BUFFERING}));
        } else {
          Plugins.interface.onBufferingCleared(new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.BUFFERING, properties: {dismissed_by: eventTrigger}, isInitialPlay: initialBuffering}));
        }
        Plugins.interface.onErrorCleared(new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR, properties: {dismissed_by: eventTrigger}}));

        if (state === MediaState.FATAL_ERROR) {
          Plugins.interface.onFatalError(new PluginData({status: PluginEnums.STATUS.FATAL, stateType: PluginEnums.TYPE.ERROR, isBufferingTimeoutError: fatalErrorBufferingTimeout}));
        }

        var stateObject = { state: state };
        if (state === MediaState.PAUSED) {
          stateObject.trigger = pauseTrigger;
          endOfStream = false;
        }
        if (state === MediaState.FATAL_ERROR) {
          stateObject.errorId = opts && opts.error;
          stateObject.isBufferingTimeoutError = opts && opts.isBufferingTimeoutError;
        }
        stateObject.endOfStream = endOfStream;

        stateChangeCallbacks.forEach(function (callback) {
          callback(stateObject);
        });

        if (autoProgress) {
          if (state !== MediaState.PLAYING) {
            stopProgress();
          } else {
            startProgress();
          }
        }
      },
      progressTime: function (time) {
        currentTime = time;
        timeUpdateCallbacks.forEach(function (callback) {
          callback({
            currentTime: time,
            endOfStream: endOfStream
          });
        });
      },
      setEndOfStream: function (isEndOfStream) {
        endOfStream = isEndOfStream;
      },
      setDuration: function (mediaDuration) {
        duration = mediaDuration;
      },
      setSeekableRange: function (newSeekableRange) {
        seekableRange = newSeekableRange;
      },
      setMediaKind: function (kind) {
        mediaKind = kind;
      },
      setWindowType: function (type) {
        windowType = type;
      },
      setCanSeek: function (value) {
        canSeekState = value;
      },
      setCanPause: function (value) {
        canPauseState = value;
      },
      setLiveWindowStart: function (value) {
        liveWindowStart = value;
      },
      setSubtitlesAvailable: function (value) {
        subtitlesAvailable = value;
      },
      getSource: function () {
        return source;
      },
      triggerError: function () {
        fatalErrorBufferingTimeout = false;
        Plugins.interface.onError(new PluginData({status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.ERROR, isBufferingTimeoutError: false}));
        this.changeState(MediaState.WAITING);
        stopProgress();
      },
      triggerErrorHandled: function () {
        if (sourceList && sourceList.length > 1) {
          sourceList.shift();
          source = sourceList[0].url;
          cdn = sourceList[0].cdn;
        }
        Plugins.interface.onBufferingCleared(new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.BUFFERING, properties: {dismissed_by: 'timeout'}, isInitialPlay: initialBuffering}));
        Plugins.interface.onErrorCleared(new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR, properties: {dismissed_by: 'timeout'}}));
        Plugins.interface.onErrorHandled(new PluginData({status: PluginEnums.STATUS.FAILOVER, stateType: PluginEnums.TYPE.ERROR, isBufferingTimeoutError: fatalErrorBufferingTimeout, cdn: cdn}));

        if (autoProgress) {
          stopProgress();
          startProgress();
        }
      },
      setInitialBuffering: function (value) {
        initialBuffering = value;
      }
    };

    return {
      mock: mock,
      unmock: unmock,
      mockJasmine: mockJasmine
    };
  }
);
