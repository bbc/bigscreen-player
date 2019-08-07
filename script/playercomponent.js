define(
  'bigscreenplayer/playercomponent', [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/captionscontainer',
    'bigscreenplayer/playbackstrategy/' + window.bigscreenPlayer.playbackStrategy,
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/plugindata',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/plugins',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/models/playbackstrategy'
  ],
  function (MediaState, CaptionsContainer, PlaybackStrategy, WindowTypes, PlaybackUtils, PluginData, PluginEnums, Plugins, TransferFormats, LiveSupport, DebugTool, PlaybackStrategyModel) {
    'use strict';

    var PlayerComponent = function (playbackElement, bigscreenPlayerData, mediaSources, windowType, enableSubtitles, callback, device) {
      var isInitialPlay = true;
      var captionsURL = bigscreenPlayerData.media.captionsUrl;
      var errorTimeoutID = null;
      var mediaKind = bigscreenPlayerData.media.kind;
      var subtitlesEnabled;
      var userInteracted = false;
      var stateUpdateCallback = callback;
      var playbackStrategy;
      var captionsContainer;
      var mediaMetaData;
      var fatalErrorTimeout;
      var fatalError;
      var transferFormat = bigscreenPlayerData.media.transferFormat;

      playbackStrategy = PlaybackStrategy(
        mediaSources,
        windowType,
        mediaKind,
        playbackElement,
        bigscreenPlayerData.media.isUHD,
        device
      );

      playbackStrategy.addEventCallback(this, eventCallback);
      playbackStrategy.addErrorCallback(this, onError);
      playbackStrategy.addTimeUpdateCallback(this, onTimeUpdate);

      bubbleErrorCleared(createPlaybackProperties());

      setSubtitlesEnabled(enableSubtitles || false);

      initialMediaPlay(bigscreenPlayerData.media, bigscreenPlayerData.initialPlaybackTime);

      function play () {
        userInteracted = true;
        playbackStrategy.play();
      }

      function isEnded () {
        return playbackStrategy.isEnded();
      }

      function pause (opts) {
        opts = opts || {};
        userInteracted = true;
        if (transitions().canBePaused()) {
          var disableAutoResume = windowType === WindowTypes.GROWING ? true : opts.disableAutoResume;
          playbackStrategy.pause({ disableAutoResume: disableAutoResume });
        }
      }

      function getDuration () {
        return playbackStrategy.getDuration();
      }

      function getWindowStartTime () {
        return mediaSources && mediaSources.time().windowStartTime;
      }

      function getWindowEndTime () {
        return mediaSources && mediaSources.time().windowEndTime;
      }

      function getPlayerElement () {
        var element = null;
        if (playbackStrategy && playbackStrategy.getPlayerElement) {
          element = playbackStrategy.getPlayerElement();
        }
        return element;
      }

      function getCurrentTime () {
        return playbackStrategy.getCurrentTime();
      }

      function getSeekableRange () {
        return playbackStrategy.getSeekableRange();
      }

      function setSubtitlesEnabled (enabled) {
        subtitlesEnabled = enabled || false;
        if (isSubtitlesAvailable() && captionsContainer) {
          subtitlesEnabled ? captionsContainer.start() : captionsContainer.stop();
        }
      }

      function isSubtitlesEnabled () {
        return subtitlesEnabled;
      }

      function isSubtitlesAvailable () {
        return !!captionsURL;
      }

      function isPaused () {
        return playbackStrategy.isPaused();
      }

      function setTransportControlPosition (flags) {
        captionsContainer.updatePosition(flags);
      }

      function setCurrentTime (time) {
        userInteracted = true;
        if (transitions().canBeginSeek()) {
          isNativeHLSRestartable() ? reloadMediaElement(time) : playbackStrategy.setCurrentTime(time);
        }
      }

      function isNativeHLSRestartable () {
        return window.bigscreenPlayer.playbackStrategy === PlaybackStrategyModel.NATIVE &&
               transferFormat === TransferFormats.HLS &&
               windowType !== WindowTypes.STATIC &&
               getLiveSupport(device) === LiveSupport.RESTARTABLE;
      }

      function reloadMediaElement (time) {
        var originalWindowStartOffset = getWindowStartTime();

        var doSeek = function () {
          var windowOffset = mediaSources.time().windowStartTime - originalWindowStartOffset;
          var seekToTime = time - windowOffset / 1000;

          var thenPause = playbackStrategy.isPaused();
          var seekableRange = playbackStrategy.getSeekableRange();
          tearDownMediaElement();

          if (seekToTime > seekableRange.end - seekableRange.start - 30) {
            seekToTime = undefined;
            thenPause = false;
          }
          loadMedia(mediaMetaData.type, seekToTime, thenPause);
        };

        var onError = function (errorMessage) {
          DebugTool.info(errorMessage);
          tearDownMediaElement();
          bubbleFatalError(createPlaybackErrorProperties(event), false);
        };

        mediaSources.refresh(doSeek, onError);
      }

      function transitions () {
        return playbackStrategy.transitions;
      }

      function tearDownMediaElement () {
        var playbackProperties = createPlaybackProperties();
        playbackProperties.dismissed_by = 'teardown';
        playout(playbackProperties);
        playbackStrategy.reset();
      }

      function eventCallback (mediaState) {
        switch (mediaState) {
          case MediaState.PLAYING:
            onPlaying();
            break;
          case MediaState.PAUSED:
            onPaused();
            break;
          case MediaState.WAITING:
            onBuffering();
            break;
          case MediaState.ENDED:
            onEnded();
            break;
        }
      }

      function onPlaying () {
        playout(createPlaybackProperties());
        publishMediaStateUpdate(MediaState.PLAYING, {});
        isInitialPlay = false;
      }

      function onPaused () {
        publishMediaStateUpdate(MediaState.PAUSED);
        playout(createPlaybackProperties());
      }

      function onBuffering () {
        publishMediaStateUpdate(MediaState.WAITING);
        var playbackProperties = createPlaybackProperties();
        startBufferingErrorTimeout(playbackProperties);
        bubbleErrorCleared(playbackProperties);
        bubbleBufferingRaised(playbackProperties);
        userInteracted = false;
      }

      function onEnded () {
        playout(createPlaybackProperties());
        publishMediaStateUpdate(MediaState.ENDED);
      }

      function onTimeUpdate () {
        publishMediaStateUpdate(undefined, { timeUpdate: true });
      }

      function onError (event) {
        var playbackProperties = createPlaybackProperties();
        playbackProperties.dismissed_by = 'error';
        bubbleBufferingCleared(playbackProperties);

        var playbackErrorProperties = createPlaybackErrorProperties(event);
        raiseError(playbackErrorProperties);
      }

      function startBufferingErrorTimeout (properties) {
        var bufferingTimeout = isInitialPlay ? 30000 : 20000;
        var bufferingClearedProperties = PlaybackUtils.clone(properties);
        clearBufferingErrorTimeout();
        errorTimeoutID = setTimeout(function () {
          bufferingClearedProperties.dismissed_by = 'timeout';
          bubbleBufferingCleared(bufferingClearedProperties);
          properties.error_mssg = 'Buffering timed out';
          DebugTool.info('Buffering timeout error - attempting CDN failover');
          attemptCdnFailover(properties, true);
        }, bufferingTimeout);
      }

      function raiseError (properties) {
        clearBufferingErrorTimeout();
        publishMediaStateUpdate(MediaState.WAITING);
        bubbleErrorRaised(properties);
        startFatalErrorTimeout(properties);
      }

      function startFatalErrorTimeout (errorProperties) {
        if (!fatalErrorTimeout && !fatalError) {
          fatalErrorTimeout = setTimeout(function () {
            fatalErrorTimeout = null;
            fatalError = true;
            errorProperties.error_mssg = 'Fatal error';
            DebugTool.info('Fatal error - attempting CDN failover');
            attemptCdnFailover(errorProperties, false);
          }, 5000);
        }
      }

      function attemptCdnFailover (errorProperties, bufferingTimeoutError) {
       // TODO: Not getting the currentTime up front might cause double failover to not work!
        var time = getCurrentTime();
        var oldWindowStartTime = getWindowStartTime();

        var failoverParams = {
          errorMessage: errorProperties.error_mssg,
          isBufferingTimeoutError: bufferingTimeoutError,
          currentTime: getCurrentTime(),
          duration: getDuration()
        };
        DebugTool.info('Failover Params: ' + JSON.stringify(failoverParams));

        var doLoadMedia = function () {
          var thenPause = isPaused();
          var windowOffset = (mediaSources.time().windowStartTime - oldWindowStartTime) / 1000;
          var failoverTime = time - (windowOffset || 0);
          tearDownMediaElement();
          loadMedia(mediaMetaData.type, failoverTime, thenPause);
        };

        var doErrorCallback = function () {
          bubbleFatalError(errorProperties, bufferingTimeoutError);
        };

        mediaSources.failover(doLoadMedia, doErrorCallback, failoverParams);
      }

      function clearFatalErrorTimeout () {
        if (fatalErrorTimeout !== null) {
          clearTimeout(fatalErrorTimeout);
          fatalErrorTimeout = null;
        }
      }

      function clearBufferingErrorTimeout () {
        if (errorTimeoutID !== null) {
          clearTimeout(errorTimeoutID);
          errorTimeoutID = null;
        }
      }

      function playout (playbackProperties) {
        clearBufferingErrorTimeout();
        clearFatalErrorTimeout();
        fatalError = false;
        bubbleBufferingCleared(playbackProperties);
        bubbleErrorCleared(playbackProperties);
        userInteracted = false;
      }

      function bubbleErrorCleared (playbackProperties) {
        var errorProperties = PlaybackUtils.clone(playbackProperties);
        if (!errorProperties.dismissed_by) {
          if (userInteracted) {
            errorProperties.dismissed_by = 'other';
          } else {
            errorProperties.dismissed_by = 'device';
          }
        }
        var evt = new PluginData({ status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties });
        Plugins.interface.onErrorCleared(evt);
      }

      function bubbleErrorRaised (errorProperties) {
        var evt = new PluginData({ status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties, isBufferingTimeoutError: false });
        Plugins.interface.onError(evt);
      }

      function bubbleBufferingRaised (playbackProperties) {
        var evt = new PluginData({ status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.BUFFERING, properties: playbackProperties });
        Plugins.interface.onBuffering(evt);
      }

      function bubbleBufferingCleared (playbackProperties) {
        var bufferingProperties = PlaybackUtils.clone(playbackProperties);
        if (!bufferingProperties.dismissed_by) {
          if (userInteracted) {
            bufferingProperties.dismissed_by = 'other';
          } else {
            bufferingProperties.dismissed_by = 'device';
          }
        }
        var evt = new PluginData({ status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.BUFFERING, properties: bufferingProperties, isInitialPlay: isInitialPlay });
        Plugins.interface.onBufferingCleared(evt);
      }

      function bubbleFatalError (errorProperties, bufferingTimeoutError) {
        var evt = new PluginData({ status: PluginEnums.STATUS.FATAL, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties, isBufferingTimeoutError: bufferingTimeoutError });
        Plugins.interface.onFatalError(evt);
        publishMediaStateUpdate(MediaState.FATAL_ERROR, { isBufferingTimeoutError: bufferingTimeoutError });
      }

      function createPlaybackProperties () {
        var playbackProperties = {};

        playbackProperties.seekable_range = getSeekableRange().start + ' to ' + getSeekableRange().end;
        playbackProperties.current_time = getCurrentTime();
        playbackProperties.duration = getDuration();

        return playbackProperties;
      }

      function createPlaybackErrorProperties (event) {
        DebugTool.info('Create Playback Error Properties: ' + JSON.stringify(event.errorProperties));
        return PlaybackUtils.merge(createPlaybackProperties(), event.errorProperties);
      }

      function publishMediaStateUpdate (state, opts) {
        var mediaData = {};
        mediaData.currentTime = getCurrentTime();
        mediaData.seekableRange = getSeekableRange();
        mediaData.subtitles = {
          enabled: isSubtitlesEnabled(),
          available: isSubtitlesAvailable()
        };
        mediaData.state = state;
        mediaData.duration = getDuration();

        stateUpdateCallback({ data: mediaData, timeUpdate: opts && opts.timeUpdate, isBufferingTimeoutError: (opts && opts.isBufferingTimeoutError || false) });
      }

      function initialMediaPlay (media, startTime) {
        mediaMetaData = media;
        loadMedia(media.type, startTime);

        if (!captionsContainer) {
          captionsContainer = new CaptionsContainer(playbackStrategy, captionsURL, isSubtitlesEnabled(), playbackElement);
        }
      }

      function loadMedia (type, startTime, thenPause) {
        playbackStrategy.load(type, startTime);
        if (thenPause) {
          pause();
        }
      }

      function tearDown () {
        userInteracted = false;
        tearDownMediaElement();

        playbackStrategy.tearDown();
        playbackStrategy = null;

        if (captionsContainer) {
          captionsContainer.stop();
          captionsContainer.tearDown();
          captionsContainer = null;
        }

        isInitialPlay = true;
        captionsURL = undefined;
        errorTimeoutID = undefined;
        windowType = undefined;
        mediaKind = undefined;
        subtitlesEnabled = undefined;
        userInteracted = undefined;
        stateUpdateCallback = undefined;
        mediaMetaData = undefined;
        fatalErrorTimeout = undefined;
        fatalError = undefined;
      }

      return {
        play: play,
        pause: pause,
        transitions: transitions,
        isEnded: isEnded,
        setCurrentTime: setCurrentTime,
        getCurrentTime: getCurrentTime,
        getDuration: getDuration,
        getWindowStartTime: getWindowStartTime,
        getWindowEndTime: getWindowEndTime,
        getSeekableRange: getSeekableRange,
        getPlayerElement: getPlayerElement,
        isSubtitlesAvailable: isSubtitlesAvailable,
        isSubtitlesEnabled: isSubtitlesEnabled,
        setSubtitlesEnabled: setSubtitlesEnabled,
        isPaused: isPaused,
        setTransportControlPosition: setTransportControlPosition,
        tearDown: tearDown
      };
    };

    function getLiveSupport (device) {
      return PlaybackStrategy.getLiveSupport(device);
    }

    PlayerComponent.getLiveSupport = getLiveSupport;

    return PlayerComponent;
  }
);
