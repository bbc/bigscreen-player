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
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/manifest/manifestloader',
    'bigscreenplayer/utils/livesupportutils',
    'bigscreenplayer/mediaresilience',
    'bigscreenplayer/debugger/cdndebugoutput',
    'bigscreenplayer/models/livesupport'
  ],
  function (MediaState, CaptionsContainer, PlaybackStrategy, WindowTypes, PlaybackUtils, PluginData, PluginEnums, Plugins, DebugTool, TransferFormats, ManifestLoader, LiveSupportUtils, MediaResilience, CdnDebugOutput, LiveSupport) {
    'use strict';

    var PlayerComponent = function (playbackElement, bigscreenPlayerData, windowType, enableSubtitles, callback, device) {
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
      var cdnDebugOutput = new CdnDebugOutput(bigscreenPlayerData.media.urls);
      var transferFormat = bigscreenPlayerData.media.transferFormat;

      playbackStrategy = PlaybackStrategy(
        windowType,
        mediaKind,
        bigscreenPlayerData.time,
        playbackElement,
        bigscreenPlayerData.media.isUHD,
        device,
        cdnDebugOutput
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
        return bigscreenPlayerData.time && bigscreenPlayerData.time.windowStartTime;
      }

      function getWindowEndTime () {
        return bigscreenPlayerData.time && bigscreenPlayerData.time.windowEndTime;
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
          if (windowType !== WindowTypes.STATIC && getLiveSupport(device) === LiveSupport.RESTARTABLE) {
            reloadMediaElement(time);
          } else {
            playbackStrategy.setCurrentTime(time);
          }
        }
      }

      function reloadMediaElement (time) {
        function doSeek (time) {
          var thenPause = playbackStrategy.isPaused();
          tearDownMediaElement();
          if (time > (bigscreenPlayerData.time.windowEndTime - bigscreenPlayerData.time.windowStartTime) / 1000) {
            time = undefined;
          }
          loadMedia(mediaMetaData.urls, mediaMetaData.type, time, thenPause);
        }
        var errorCallback = function () {
          tearDownMediaElement();
          bubbleFatalError(createPlaybackErrorProperties(event), false);
        };

        reloadManifest(time, doSeek, errorCallback);
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
        startErrorTimeout(playbackProperties);
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
        raiseError(playbackErrorProperties, false);
      }

      function startErrorTimeout (properties) {
        var bufferingTimeout = isInitialPlay ? 30000 : 20000;
        var bufferingClearedProperties = PlaybackUtils.clone(properties);
        clearErrorTimeout();
        errorTimeoutID = setTimeout(function () {
          bufferingClearedProperties.dismissed_by = 'timeout';
          bubbleBufferingCleared(bufferingClearedProperties);
          properties.error_mssg = 'Buffering timed out';
          attemptCdnFailover(properties, true);
        }, bufferingTimeout);
      }

      function raiseError (properties, bufferingTimeoutError) {
        clearErrorTimeout();
        publishMediaStateUpdate(MediaState.WAITING);
        bubbleErrorRaised(properties, bufferingTimeoutError);
        startFatalErrorTimeout(properties, bufferingTimeoutError);
      }

      function startFatalErrorTimeout (errorProperties, bufferingTimeoutError) {
        if (!fatalErrorTimeout && !fatalError) {
          fatalErrorTimeout = setTimeout(function () {
            fatalErrorTimeout = null;
            fatalError = true;
            attemptCdnFailover(errorProperties, bufferingTimeoutError);
          }, 5000);
        }
      }

      function attemptCdnFailover (errorProperties, bufferingTimeoutError) {
        var shouldFailover = MediaResilience.shouldFailover(mediaMetaData.urls.length, getDuration(), getCurrentTime(), getLiveSupport(device), windowType, transferFormat);

        var failover = function (time) {
          cdnFailover(time, thenPause, errorProperties, bufferingTimeoutError);
        };
        var errorCallback = function () {
          bubbleFatalError(errorProperties, bufferingTimeoutError);
        };

        if (shouldFailover) {
          var thenPause = playbackStrategy.isPaused();
          tearDownMediaElement();

          var failoverTime = getCurrentTime();
          reloadManifest(failoverTime, failover, errorCallback);
        } else {
          errorCallback();
        }
      }

      function reloadManifest (time, successCallback, errorCallback) {
        if (transferFormat === TransferFormats.HLS && LiveSupportUtils.needToGetManifest(windowType, getLiveSupport(device))) {
          ManifestLoader.load(
            bigscreenPlayerData.media.urls,
            bigscreenPlayerData.serverDate,
            {
              onSuccess: function (manifestData) {
                var windowOffset = manifestData.time.windowStartTime - getWindowStartTime();
                bigscreenPlayerData.time = manifestData.time;
                successCallback(time - windowOffset / 1000);
              },
              onError: errorCallback
            }
          );
        } else {
          successCallback(time);
        }
      }

      function cdnFailover (failoverTime, thenPause, errorProperties, bufferingTimeoutError) {
        var evt = new PluginData({
          status: PluginEnums.STATUS.FAILOVER,
          stateType: PluginEnums.TYPE.ERROR,
          properties: errorProperties,
          isBufferingTimeoutError: bufferingTimeoutError,
          cdn: mediaMetaData.urls[0].cdn,
          newCdn: mediaMetaData.urls[1].cdn
        });
        Plugins.interface.onErrorHandled(evt);
        mediaMetaData.urls.shift();
        cdnDebugOutput.update();
        loadMedia(mediaMetaData.urls, mediaMetaData.type, failoverTime, thenPause);
      }

      function clearFatalErrorTimeout () {
        if (fatalErrorTimeout !== null) {
          clearTimeout(fatalErrorTimeout);
          fatalErrorTimeout = null;
        }
      }

      function clearErrorTimeout () {
        if (errorTimeoutID !== null) {
          clearTimeout(errorTimeoutID);
          errorTimeoutID = null;
        }
      }

      function playout (playbackProperties) {
        clearErrorTimeout();
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

      function bubbleErrorRaised (errorProperties, bufferingTimeoutError) {
        var evt = new PluginData({ status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties, isBufferingTimeoutError: bufferingTimeoutError });
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
        loadMedia(media.urls, media.type, startTime);

        if (!captionsContainer) {
          captionsContainer = new CaptionsContainer(playbackStrategy, captionsURL, isSubtitlesEnabled(), playbackElement);
        }
      }

      function loadMedia (urls, type, startTime, thenPause) {
        playbackStrategy.load(urls, type, startTime);
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

        if (cdnDebugOutput) {
          cdnDebugOutput.tearDown();
          cdnDebugOutput = undefined;
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
