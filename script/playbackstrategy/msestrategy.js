define('bigscreenplayer/playbackstrategy/msestrategy',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/plugins',
    'bigscreenplayer/manifest/manifestmodifier',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/dynamicwindowutils',
    'bigscreenplayer/utils/timeutils',
    'bigscreenplayer/domhelpers',

    // static imports
    'dashjs'
  ],
  function (MediaState, WindowTypes, DebugTool, MediaKinds, Plugins, ManifestModifier, LiveSupport, DynamicWindowUtils, TimeUtils, DOMHelpers) {
    var MSEStrategy = function (mediaSources, windowType, mediaKind, playbackElement, isUHD) {
      var LIVE_DELAY_SECONDS = 1.1;
      var mediaPlayer;
      var mediaElement;

      var eventCallbacks = [];
      var errorCallback;
      var timeUpdateCallback;

      var timeCorrection = mediaSources.time() && mediaSources.time().correction || 0;
      var failoverTime;
      var refreshFailoverTime;
      var slidingWindowPausedTime = 0;
      var isEnded = false;

      var dashMetrics;

      var publishedSeekEvent = false;
      var isSeeking = false;

      var playerMetadata = {
        playbackBitrate: undefined,
        bufferLength: undefined,
        fragmentInfo: {
          requestTime: undefined,
          numDownloaded: undefined
        }
      };

      var DashJSEvents = {
        LOG: 'log',
        ERROR: 'error',
        MANIFEST_LOADED: 'manifestLoaded',
        DOWNLOAD_MANIFEST_ERROR_CODE: 25,
        DOWNLOAD_SIDX_ERROR_CODE: 26,
        DOWNLOAD_CONTENT_ERROR_CODE: 27,
        DOWNLOAD_INIT_SEGMENT_ERROR_CODE: 28,
        MANIFEST_VALIDITY_CHANGED: 'manifestValidityChanged',
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
        BASE_URL_SELECTED: 'baseUrlSelected',
        METRIC_ADDED: 'metricAdded',
        METRIC_CHANGED: 'metricChanged',
        STREAM_INITIALIZED: 'streamInitialized'
      };

      function onPlaying () {
        isEnded = false;
        publishMediaState(MediaState.PLAYING);
      }

      function onPaused () {
        publishMediaState(MediaState.PAUSED);
      }

      function onBuffering () {
        isEnded = false;
        if (!isSeeking || !publishedSeekEvent) {
          publishMediaState(MediaState.WAITING);
          publishedSeekEvent = true;
        }
      }

      function onSeeked () {
        isSeeking = false;
        DebugTool.info('Seeked Event');

        if (isPaused()) {
          if (windowType === WindowTypes.SLIDING) {
            startAutoResumeTimeout();
          }
          publishMediaState(MediaState.PAUSED);
        } else {
          publishMediaState(MediaState.PLAYING);
        }
      }

      function onEnded () {
        isEnded = true;
        publishMediaState(MediaState.ENDED);
      }

      function onTimeUpdate () {
        var IN_STREAM_BUFFERING_SECONDS = 20;
        var dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo('video');

        if (dvrInfo && windowType === WindowTypes.SLIDING) {
          failoverTime = Math.max(0, parseInt(dvrInfo.time - dvrInfo.range.start) - IN_STREAM_BUFFERING_SECONDS);
        } else {
          var time = mediaElement.currentTime;

          // Note: Multiple consecutive CDN failover logic
          // A newly loaded video element will always report a 0 time update
          // This is slightly unhelpful if we want to continue from a later point but consult failoverTime as the source of truth.
          if (parseInt(time) !== 0) {
            failoverTime = time;
          }
        }

        publishTimeUpdate();
      }

      function onError (event) {
        if (event.error && event.error.data) {
          delete event.error.data;
        }

        if (event.error && event.error.message) {
          DebugTool.info('MSE Error: ' + event.error.message);

          // Don't raise an error on fragment download error
          if (event.error.code === DashJSEvents.DOWNLOAD_SIDX_ERROR_CODE ||
            event.error.code === DashJSEvents.DOWNLOAD_CONTENT_ERROR_CODE ||
            event.error.code === DashJSEvents.DOWNLOAD_INIT_SEGMENT_ERROR_CODE) {
            return;
          }

          if (event.error.code === DashJSEvents.DOWNLOAD_MANIFEST_ERROR_CODE) {
            manifestDownloadError(event);
            return;
          }
        }
        publishError();
      }

      function manifestDownloadError (event) {
        var error = function () {
          publishError();
        };

        var failoverParams = {
          errorMessage: 'manifest-refresh',
          isBufferingTimeoutError: false,
          currentTime: getCurrentTime(),
          duration: getDuration()
        };

        mediaSources.failover(load, error, failoverParams);
      }

      function onManifestLoaded (event) {
        DebugTool.info('Manifest loaded. Duration is: ' + event.data.mediaPresentationDuration);

        if (event.data) {
          var manifest = event.data;
          var representationOptions = window.bigscreenPlayer.representationOptions || {};

          ManifestModifier.filter(manifest, representationOptions);
          ManifestModifier.generateBaseUrls(manifest, mediaSources.availableSources());
        }
      }

      function onManifestValidityChange (event) {
        DebugTool.info('Manifest validity changed. Duration is: ' + event.newDuration);
      }

      function onStreamInitialised () {
        var setMseDuration = window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.mseDurationOverride;
        if (setMseDuration && (windowType === WindowTypes.SLIDING || windowType === WindowTypes.GROWING)) {
          // Workaround for no setLiveSeekableRange/clearLiveSeekableRange
          mediaPlayer.setDuration(Number.MAX_SAFE_INTEGER);
        }
        emitPlayerInfo();
      }

      function emitPlayerInfo () {
        if (mediaKind === MediaKinds.VIDEO) {
          playerMetadata.playbackBitrate = currentPlaybackBitrate(MediaKinds.VIDEO) + currentPlaybackBitrate(MediaKinds.AUDIO);
        } else {
          playerMetadata.playbackBitrate = currentPlaybackBitrate(MediaKinds.AUDIO);
        }

        DebugTool.keyValue({ key: 'playback bitrate', value: playerMetadata.playbackBitrate + ' kbps' });

        Plugins.interface.onPlayerInfoUpdated({
          bufferLength: playerMetadata.bufferLength,
          playbackBitrate: playerMetadata.playbackBitrate
        });
      }

      function currentPlaybackBitrate (mediaKind) {
        var representationSwitch = mediaPlayer.getDashMetrics().getCurrentRepresentationSwitch(mediaKind);
        var representation = representationSwitch ? representationSwitch.to : '';
        return playbackBitrateForRepresentation(representation, mediaKind);
      }

      function playbackBitrateForRepresentation (representation, mediaKind) {
        var repIdx = mediaPlayer.getDashAdapter().getIndexForRepresentation(representation, 0);
        return playbackBitrateForRepresentationIndex(repIdx, mediaKind);
      }

      function playbackBitrateForRepresentationIndex (index, mediaKind) {
        if (index === -1) return '';
        var bitrateInfoList = mediaPlayer.getBitrateInfoListFor(mediaKind);
        return parseInt(bitrateInfoList[index].bitrate / 1000);
      }

      function onQualityChangeRendered (event) {
        function logBitrate (mediaKind, event) {
          var oldBitrate = isNaN(event.oldQuality) ? '--' : playbackBitrateForRepresentationIndex(event.oldQuality, mediaKind);
          var oldRepresentation = isNaN(event.oldQuality) ? 'Start' : event.oldQuality + ' (' + oldBitrate + ' kbps)';
          var newRepresentation = event.newQuality + ' (' + playbackBitrateForRepresentationIndex(event.newQuality, mediaKind) + ' kbps)';
          DebugTool.keyValue({ key: event.mediaType + ' Representation', value: newRepresentation });
          DebugTool.info(mediaKind + ' ABR Change Rendered From Representation ' + oldRepresentation + ' To ' + newRepresentation);
        }

        if (event.newQuality !== undefined) {
          logBitrate(event.mediaType, event);
        }

        emitPlayerInfo();
      }

      /**
       * Base url selected events are fired from dash.js whenever a priority weighted url is selected from a manifest
       * Note: we ignore the initial selection as it isn't a failover.
       * @param {*} event
       */
      function onBaseUrlSelected (event) {
        var failoverInfo = {
          errorMessage: 'download',
          isBufferingTimeoutError: false
        };

        function log () {
          DebugTool.info('BaseUrl selected: ' + event.baseUrl.url);
        }

        failoverInfo.serviceLocation = event.baseUrl.serviceLocation;
        mediaSources.failover(log, log, failoverInfo);
      }

      function onMetricAdded (event) {
        if (event.mediaType === 'video') {
          if (event.metric === 'DroppedFrames') {
            DebugTool.keyValue({ key: 'Dropped Frames', value: event.value.droppedFrames });
          }
        }
        if (event.mediaType === mediaKind && event.metric === 'BufferLevel') {
          dashMetrics = mediaPlayer.getDashMetrics();

          if (dashMetrics) {
            playerMetadata.bufferLength = dashMetrics.getCurrentBufferLevel(event.mediaType);
            DebugTool.keyValue({ key: 'Buffer Length', value: playerMetadata.bufferLength });
            Plugins.interface.onPlayerInfoUpdated({
              bufferLength: playerMetadata.bufferLength,
              playbackBitrate: playerMetadata.playbackBitrate
            });
          }
        }
        if (event.mediaType === mediaKind && event.metric === 'HttpList' && event.value._tfinish && event.value.trequest) {
          playerMetadata.fragmentInfo.requestTime = Math.floor(Math.abs(event.value._tfinish.getTime() - event.value.trequest.getTime()));
          playerMetadata.fragmentInfo.numDownloaded = playerMetadata.fragmentInfo.numDownloaded ? ++playerMetadata.fragmentInfo.numDownloaded : 1;
          Plugins.interface.onPlayerInfoUpdated({
            fragmentInfo: playerMetadata.fragmentInfo
          });
        }
      }

      function onDebugLog (e) {
        DebugTool.verbose(e.message);
      }

      function publishMediaState (mediaState) {
        for (var index = 0; index < eventCallbacks.length; index++) {
          eventCallbacks[index](mediaState);
        }
      }

      function publishTimeUpdate () {
        if (timeUpdateCallback) {
          timeUpdateCallback();
        }
      }

      function publishError () {
        if (errorCallback) {
          errorCallback();
        }
      }

      function isPaused () {
        return (mediaPlayer && mediaPlayer.isReady()) ? mediaPlayer.isPaused() : undefined;
      }

      function getClampedTime (time, range) {
        return Math.min(Math.max(time, range.start), range.end - LIVE_DELAY_SECONDS);
      }

      function load (mimeType, playbackTime) {
        if (!mediaPlayer) {
          failoverTime = playbackTime;
          setUpMediaElement(playbackElement);
          setUpMediaPlayer(playbackTime);
          setUpMediaListeners();
        } else {
          modifySource(refreshFailoverTime || failoverTime);
        }
      }

      function setUpMediaElement (playbackElement) {
        if (mediaKind === MediaKinds.AUDIO) {
          mediaElement = document.createElement('audio');
        } else {
          mediaElement = document.createElement('video');
        }
        mediaElement.style.position = 'absolute';
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';

        playbackElement.insertBefore(mediaElement, playbackElement.firstChild);
      }

      function setUpMediaPlayer (playbackTime) {
        mediaPlayer = dashjs.MediaPlayer().create();
        mediaPlayer.updateSettings({
          'debug': {
            'logLevel': 2
          }
        });

        mediaPlayer.updateSettings({
          'streaming': {
            'liveDelay': LIVE_DELAY_SECONDS,
            'bufferToKeep': 0,
            'bufferTimeAtTopQuality': 12,
            'bufferTimeAtTopQualityLongForm': 12
          }
        });

        mediaPlayer.initialize(mediaElement, null, true);
        modifySource(playbackTime);
      }

      function modifySource (playbackTime) {
        mediaPlayer.attachSource(calculateSourceAnchor(mediaSources.currentSource(), playbackTime));
      }

      function setUpMediaListeners () {
        mediaElement.addEventListener('timeupdate', onTimeUpdate);
        mediaElement.addEventListener('playing', onPlaying);
        mediaElement.addEventListener('pause', onPaused);
        mediaElement.addEventListener('waiting', onBuffering);
        mediaElement.addEventListener('seeking', onBuffering);
        mediaElement.addEventListener('seeked', onSeeked);
        mediaElement.addEventListener('ended', onEnded);
        mediaPlayer.on(DashJSEvents.ERROR, onError);
        mediaPlayer.on(DashJSEvents.MANIFEST_LOADED, onManifestLoaded);
        mediaPlayer.on(DashJSEvents.STREAM_INITIALIZED, onStreamInitialised);
        mediaPlayer.on(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange);
        mediaPlayer.on(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered);
        mediaPlayer.on(DashJSEvents.BASE_URL_SELECTED, onBaseUrlSelected);
        mediaPlayer.on(DashJSEvents.METRIC_ADDED, onMetricAdded);
        mediaPlayer.on(DashJSEvents.LOG, onDebugLog);
      }

      /**
       * Calculates a source url with anchor tags for playback within dashjs
       *
       * Anchor tags applied to the MPD source for playback:
       *
       * #t - time since the beginning of the first period defined in the DASH manifest
       * @param {String} source
       * @param {Number} startTime
       */
      function calculateSourceAnchor (source, startTime) {
        if (startTime === undefined || isNaN(startTime)) {
          return source;
        }

        startTime = parseInt(startTime);

        if (windowType === WindowTypes.STATIC) {
          return startTime === 0 ? source : source + '#t=' + startTime;
        } else {
          var windowStartTimeSeconds = (mediaSources.time().windowStartTime / 1000);
          var srcWithTimeAnchor = source + '#t=posix:';

          return startTime === 0 ? srcWithTimeAnchor + (windowStartTimeSeconds + 1) : srcWithTimeAnchor + (windowStartTimeSeconds + startTime);
        }
      }

      function getSeekableRange () {
        if (mediaPlayer && mediaPlayer.isReady() && windowType !== WindowTypes.STATIC) {
          var dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaKind);
          if (dvrInfo) {
            return {
              start: dvrInfo.range.start - timeCorrection,
              end: dvrInfo.range.end - timeCorrection
            };
          }
        }
        return {
          start: 0,
          end: getDuration()
        };
      }

      function getDuration () {
        return (mediaPlayer && mediaPlayer.isReady()) ? mediaPlayer.duration() : 0;
      }

      function getCurrentTime () {
        return (mediaElement) ? mediaElement.currentTime - timeCorrection : 0;
      }

      function refreshManifestBeforeSeek (seekToTime) {
        refreshFailoverTime = seekToTime;

        mediaPlayer.refreshManifest(function (manifest) {
          var mediaPresentationDuration = manifest && manifest.mediaPresentationDuration;
          if (!isNaN(mediaPresentationDuration)) {
            DebugTool.info('Stream ended. Clamping seek point to end of stream');
            mediaPlayer.seek(getClampedTime(seekToTime, { start: getSeekableRange().start, end: mediaPresentationDuration }));
          } else {
            mediaPlayer.seek(seekToTime);
          }
        });
      }

      function calculateSeekOffset (time) {
        function getClampedTimeForLive (time) {
          return Math.min(Math.max(time, 0), mediaPlayer.getDVRWindowSize() - LIVE_DELAY_SECONDS);
        }

        if (windowType === WindowTypes.SLIDING) {
          var dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaKind);
          var offset = TimeUtils.calculateSlidingWindowSeekOffset(time, dvrInfo.range.start, timeCorrection, slidingWindowPausedTime);
          slidingWindowPausedTime = 0;

          return getClampedTimeForLive(offset);
        }
        return getClampedTime(time, getSeekableRange());
      }

      function addEventCallback (thisArg, newCallback) {
        var eventCallback = function (event) {
          newCallback.call(thisArg, event);
        };
        eventCallbacks.push(eventCallback);
      }

      function removeEventCallback (callback) {
        var index = eventCallbacks.indexOf(callback);
        if (index !== -1) {
          eventCallbacks.splice(index, 1);
        }
      }

      function startAutoResumeTimeout () {
        DynamicWindowUtils.autoResumeAtStartOfRange(
          getCurrentTime(),
          getSeekableRange(),
          addEventCallback,
          removeEventCallback,
          function (event) {
            return event !== MediaState.PAUSED;
          },
          mediaPlayer.play);
      }

      return {
        transitions: {
          canBePaused: function () { return true; },
          canBeginSeek: function () { return true; }
        },
        addEventCallback: addEventCallback,
        removeEventCallback: removeEventCallback,
        addErrorCallback: function (thisArg, newErrorCallback) {
          errorCallback = function (event) {
            newErrorCallback.call(thisArg, event);
          };
        },
        addTimeUpdateCallback: function (thisArg, newTimeUpdateCallback) {
          timeUpdateCallback = function () {
            newTimeUpdateCallback.call(thisArg);
          };
        },
        load: load,
        getSeekableRange: getSeekableRange,
        getCurrentTime: getCurrentTime,
        getDuration: getDuration,
        tearDown: function () {
          mediaPlayer.reset();

          mediaElement.removeEventListener('timeupdate', onTimeUpdate);
          mediaElement.removeEventListener('playing', onPlaying);
          mediaElement.removeEventListener('pause', onPaused);
          mediaElement.removeEventListener('waiting', onBuffering);
          mediaElement.removeEventListener('seeking', onBuffering);
          mediaElement.removeEventListener('seeked', onSeeked);
          mediaElement.removeEventListener('ended', onEnded);
          mediaPlayer.off(DashJSEvents.ERROR, onError);
          mediaPlayer.off(DashJSEvents.MANIFEST_LOADED, onManifestLoaded);
          mediaPlayer.off(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange);
          mediaPlayer.off(DashJSEvents.STREAM_INITIALIZED, onStreamInitialised);
          mediaPlayer.off(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered);
          mediaPlayer.off(DashJSEvents.METRIC_ADDED, onMetricAdded);
          mediaPlayer.off(DashJSEvents.BASE_URL_SELECTED, onBaseUrlSelected);
          mediaPlayer.off(DashJSEvents.LOG, onDebugLog);

          DOMHelpers.safeRemoveElement(mediaElement);

          mediaPlayer = undefined;
          mediaElement = undefined;
          eventCallbacks = [];
          errorCallback = undefined;
          timeUpdateCallback = undefined;
          timeCorrection = undefined;
          failoverTime = undefined;
          isEnded = undefined;
          dashMetrics = undefined;
          playerMetadata = {
            playbackBitrate: undefined,
            bufferLength: undefined,
            fragmentInfo: {
              requestTime: undefined,
              numDownloaded: undefined
            }
          };
        },
        reset: function () {
          return;
        },
        isEnded: function () {
          return isEnded;
        },
        isPaused: isPaused,
        pause: function (opts) {
          if (windowType === WindowTypes.SLIDING) {
            slidingWindowPausedTime = Date.now();
          }

          mediaPlayer.pause();
          opts = opts || {};
          if (opts.disableAutoResume !== true && windowType === WindowTypes.SLIDING) {
            startAutoResumeTimeout();
          }
        },
        play: function () {
          mediaPlayer.play();
        },
        setCurrentTime: function (time) {
          publishedSeekEvent = false;
          isSeeking = true;
          var seekToTime = getClampedTime(time, getSeekableRange());
          if (windowType === WindowTypes.GROWING && seekToTime > getCurrentTime()) {
            refreshManifestBeforeSeek(seekToTime);
          } else {
            var seekTime = calculateSeekOffset(time);
            mediaPlayer.seek(seekTime);
          }
        },
        setPlaybackRate: function (rate) {
          mediaPlayer.setPlaybackRate(rate);
        },
        getPlaybackRate: function () {
          return mediaPlayer.getPlaybackRate();
        }
      };
    };

    MSEStrategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return MSEStrategy;
  }
);
