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
    'bigscreenplayer/debugger/debugtool'
  ],
  function (MediaState, CaptionsContainer, PlaybackStrategy, WindowTypes, PlaybackUtils, PluginData, PluginEnums, Plugins, DebugTool) {
    'use strict';

    return function (playbackElement, bigscreenPlayerData, windowType, enableSubtitles, callback, device) {
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
      var transferFormat = bigscreenPlayerData.media.manifestType === 'mpd' ? 'dash' : 'hls';

      playbackStrategy = PlaybackStrategy(
        windowType,
        mediaKind,
        bigscreenPlayerData.time,
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
          playbackStrategy.pause({disableAutoResume: disableAutoResume});
        }
      }

      function getDuration () {
        return playbackStrategy.getDuration();
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
          playbackStrategy.setCurrentTime(time);
        }
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
        publishMediaStateUpdate(undefined, {timeUpdate: true});
      }

      function onError (event) {
        var playbackProperties = createPlaybackProperties();
        playbackProperties.dismissed_by = 'error';
        bubbleBufferingCleared(playbackProperties);

        var playbackErrorProperties = createPlaybackErrorProperties(event);
        raiseError(playbackErrorProperties);
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
        var hasNextCDN = mediaMetaData.urls.length > 1;
        var aboutToEndVod = getDuration() > 0 && (getDuration() - getCurrentTime()) <= 5;
        var canVodFailover = windowType === WindowTypes.STATIC && !aboutToEndVod;
        var canLiveFailover = windowType !== WindowTypes.STATIC && transferFormat === 'dash';

        if (hasNextCDN && (canVodFailover || canLiveFailover)) {
          cdnFailover(errorProperties, bufferingTimeoutError);
        } else {
          var evt = new PluginData({status: PluginEnums.STATUS.FATAL, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties, isBufferingTimeoutError: bufferingTimeoutError});
          Plugins.interface.onFatalError(evt);
          publishMediaStateUpdate(MediaState.FATAL_ERROR, {isBufferingTimeoutError: bufferingTimeoutError});
        }
      }

      function cdnFailover (errorProperties, bufferingTimeoutError) {
        var thenPause = playbackStrategy.isPaused();
        tearDownMediaElement();
        mediaMetaData.urls.shift();
        var evt = new PluginData({status: PluginEnums.STATUS.FAILOVER, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties, isBufferingTimeoutError: bufferingTimeoutError, cdn: mediaMetaData.urls[0].cdn});
        Plugins.interface.onErrorHandled(evt);

        var availableCdns = mediaMetaData.urls.map(function (media) {
          return media.cdn;
        });

        DebugTool.keyValue({key: 'available cdns', value: availableCdns});
        DebugTool.keyValue({key: 'current cdn', value: mediaMetaData.urls[0].cdn});
        DebugTool.keyValue({key: 'url', value: mediaMetaData.urls[0].url});
        loadMedia(mediaMetaData.urls[0].url, mediaMetaData.type, getCurrentTime(), thenPause);
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
        var evt = new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties});
        Plugins.interface.onErrorCleared(evt);
      }

      function bubbleErrorRaised (errorProperties, bufferingTimeoutError) {
        var evt = new PluginData({status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.ERROR, properties: errorProperties, isBufferingTimeoutError: bufferingTimeoutError});
        Plugins.interface.onError(evt);
      }

      function bubbleBufferingRaised (playbackProperties) {
        var evt = new PluginData({status: PluginEnums.STATUS.STARTED, stateType: PluginEnums.TYPE.BUFFERING, properties: playbackProperties});
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
        var evt = new PluginData({status: PluginEnums.STATUS.DISMISSED, stateType: PluginEnums.TYPE.BUFFERING, properties: bufferingProperties, isInitialPlay: isInitialPlay});
        Plugins.interface.onBufferingCleared(evt);
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

        stateUpdateCallback({data: mediaData, timeUpdate: opts && opts.timeUpdate, isBufferingTimeoutError: (opts && opts.isBufferingTimeoutError || false)});
      }

      function initialMediaPlay (media, startTime) {
        mediaMetaData = media;
        loadMedia(media.urls[0].url, media.type, startTime);

        if (!captionsContainer) {
          captionsContainer = new CaptionsContainer(playbackStrategy, captionsURL, isSubtitlesEnabled(), playbackElement);
        }
      }

      function loadMedia (url, type, startTime, thenPause) {
        playbackStrategy.load(url, type, startTime);
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
  }
);
