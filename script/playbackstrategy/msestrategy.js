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
    'bigscreenplayer/playbackstrategy/growingwindowrefresher',
    'bigscreenplayer/utils/timeutils',

    // static imports
    'dashjs'
  ],
  function (MediaState, WindowTypes, DebugTool, MediaKinds, Plugins, ManifestModifier, LiveSupport, DynamicWindowUtils, GrowingWindowRefresher, TimeUtils) {
    var MSEStrategy = function (mediaSources, windowType, mediaKind, playbackElement, isUHD, device) {
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

      var bitrateInfoList;
      var mediaMetrics;
      var dashMetrics;

      var playerMetadata = {
        playbackBitrate: undefined,
        bufferLength: undefined,
        fragmentInfo: {
          requestTime: undefined,
          numDownloaded: undefined
        }
      };

      var DashJSEvents = {
        ERROR: 'error',
        MANIFEST_LOADED: 'manifestLoaded',
        DOWNLOAD_MANIFEST_ERROR_CODE: 25,
        DOWNLOAD_SIDX_ERROR_CODE: 26,
        DOWNLOAD_CONTENT_ERROR_CODE: 27,
        DOWNLOAD_ERROR_MESSAGE: 'download',
        MANIFEST_VALIDITY_CHANGED: 'manifestValidityChanged',
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
        BASE_URL_SELECTED: 'baseUrlSelected',
        METRIC_ADDED: 'metricAdded',
        METRIC_CHANGED: 'metricChanged'
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
        publishMediaState(MediaState.WAITING);
      }

      function onSeeked () {
        DebugTool.info('Seeked Event');
        publishMediaState(isPaused() ? MediaState.PAUSED : MediaState.PLAYING);
      }

      function onEnded () {
        isEnded = true;
        publishMediaState(MediaState.ENDED);
      }

      function onTimeUpdate () {
        var IN_STREAM_BUFFERING_SECONDS = 20;
        var dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaPlayer.getMetricsFor('video'));

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

        if (event.error) {
          if (event.error.message) {
            DebugTool.info('MSE Error: ' + event.error.message);

            // Don't raise an error on fragment download error
            if (event.error.code === DashJSEvents.DOWNLOAD_SIDX_ERROR_CODE ||
               event.error.code === DashJSEvents.DOWNLOAD_CONTENT_ERROR_CODE ||
               event.error.code === DashJSEvents.DOWNLOAD_MANIFEST_ERROR_CODE) {
              return;
            }
          } else {
            DebugTool.info('MSE Error: ' + event.error);

            if (event.error === DashJSEvents.DOWNLOAD_ERROR_MESSAGE && event.event.id === 'content') {
              return;
            }
            if (event.error === DashJSEvents.DOWNLOAD_ERROR_MESSAGE && event.event.id === 'manifest') {
              manifestDownloadError(event);
              return;
            }
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
          ManifestModifier.filter(manifest, window.bigscreenPlayer.representationOptions || {}, window.bigscreenPlayer.oldDashCodecRequired);
          ManifestModifier.generateBaseUrls(manifest, mediaSources.availableSources());
        }
      }

      function onManifestValidityChange (event) {
        DebugTool.info('Manifest validity changed. Duration is: ' + event.newDuration);
      }

      function onQualityChangeRendered (event) {
        if (event.mediaType === mediaKind) {
          if (!bitrateInfoList) {
            bitrateInfoList = mediaPlayer.getBitrateInfoListFor(event.mediaType);
          }
          if (bitrateInfoList && (event.newQuality !== undefined)) {
            playerMetadata.playbackBitrate = bitrateInfoList[event.newQuality].bitrate / 1000;

            var oldBitrate = isNaN(event.oldQuality) ? '--' : bitrateInfoList[event.oldQuality].bitrate / 1000;
            var oldRepresentation = isNaN(event.oldQuality) ? 'Start' : event.oldQuality + ' (' + oldBitrate + ' kbps)';
            var newRepresentation = event.newQuality + ' (' + playerMetadata.playbackBitrate + ' kbps)';
            DebugTool.keyValue({ key: event.mediaType + ' Representation', value: newRepresentation });
            DebugTool.info('ABR Change Rendered From Representation ' + oldRepresentation + ' To ' + newRepresentation);
          }
          Plugins.interface.onPlayerInfoUpdated({
            bufferLength: playerMetadata.bufferLength,
            playbackBitrate: playerMetadata.playbackBitrate
          });
        }
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
          mediaMetrics = mediaPlayer.getMetricsFor(event.mediaType);
          dashMetrics = mediaPlayer.getDashMetrics();

          if (mediaMetrics && dashMetrics) {
            playerMetadata.bufferLength = dashMetrics.getCurrentBufferLevel(mediaMetrics);
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
        mediaPlayer.getDebug().setLogToBrowserConsole(false);
        mediaPlayer.setLiveDelay(LIVE_DELAY_SECONDS);

        mediaPlayer.setBufferToKeep(0);
        mediaPlayer.setBufferAheadToKeep(20);

        mediaPlayer.setBufferTimeAtTopQuality(12);
        mediaPlayer.setBufferTimeAtTopQualityLongForm(12);

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
        mediaElement.addEventListener('error', onError);
        mediaPlayer.on(DashJSEvents.ERROR, onError);
        mediaPlayer.on(DashJSEvents.MANIFEST_LOADED, onManifestLoaded);
        mediaPlayer.on(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange);
        mediaPlayer.on(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered);
        mediaPlayer.on(DashJSEvents.BASE_URL_SELECTED, onBaseUrlSelected);
        mediaPlayer.on(DashJSEvents.METRIC_ADDED, onMetricAdded);
      }

      /**
       * Calculates a source url with anchor tags for playback within dashjs
       *
       * Anchor tags applied to the MPD source for playback:
       *
       * #r - relative to the start of the first period defined in the DASH manifest
       * #t - time since the beginning of the first period defined in the DASH manifest
       * @param {String} source
       * @param {Number} startTime
       */
      function calculateSourceAnchor (source, startTime) {
        if (startTime === undefined || isNaN(startTime)) {
          return source;
        }

        if (windowType === WindowTypes.STATIC) {
          return startTime === 0 ? source : source + '#t=' + parseInt(startTime);
        }

        if (windowType === WindowTypes.SLIDING) {
          return startTime === 0 ? source : source + '#r=' + parseInt(startTime);
        }

        if (windowType === WindowTypes.GROWING) {
          var windowStartTimeSeconds = (mediaSources.time().windowStartTime / 1000);
          var srcWithTimeAnchor = source + '#t=';

          startTime = parseInt(startTime);
          return startTime === 0 ? srcWithTimeAnchor + (windowStartTimeSeconds + 1) : srcWithTimeAnchor + (windowStartTimeSeconds + startTime);
        }
      }

      function getSeekableRange () {
        if (mediaPlayer && mediaPlayer.isReady() && windowType !== WindowTypes.STATIC) {
          var dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaPlayer.getMetricsFor(mediaKind));
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
        GrowingWindowRefresher(mediaPlayer, function (mediaPresentationDuration) {
          if (!isNaN(mediaPresentationDuration)) {
            DebugTool.info('Stream ended. Clamping seek point to end of stream');
            mediaPlayer.seek(getClampedTime(seekToTime, {start: getSeekableRange().start, end: mediaPresentationDuration}));
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
          var dvrInfo = mediaPlayer.getDashMetrics().getCurrentDVRInfo(mediaPlayer.getMetricsFor(mediaKind));
          var offset = TimeUtils.calculateSlidingWindowSeekOffset(time, dvrInfo.range.start, timeCorrection, slidingWindowPausedTime);
          slidingWindowPausedTime = 0;

          return getClampedTimeForLive(offset);
        }
        return getClampedTime(time, getSeekableRange());
      }

      return {
        transitions: {
          canBePaused: function () { return true; },
          canBeginSeek: function () { return true; }
        },
        addEventCallback: function (thisArg, newCallback) {
          var eventCallback = function (event) {
            newCallback.call(thisArg, event);
          };
          eventCallbacks.push(eventCallback);
        },
        removeEventCallback: function (callback) {
          var index = eventCallbacks.indexOf(callback);
          if (index !== -1) {
            eventCallbacks.splice(index, 1);
          }
        },
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
          mediaElement.removeEventListener('error', onError);
          mediaPlayer.off(DashJSEvents.ERROR, onError);
          mediaPlayer.off(DashJSEvents.MANIFEST_LOADED, onManifestLoaded);
          mediaPlayer.off(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange);
          mediaPlayer.off(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered);
          mediaPlayer.off(DashJSEvents.METRIC_ADDED, onMetricAdded);
          mediaPlayer.off(DashJSEvents.BASE_URL_SELECTED, onBaseUrlSelected);

          mediaElement.parentElement.removeChild(mediaElement);

          mediaPlayer = undefined;
          mediaElement = undefined;
          eventCallbacks = undefined;
          errorCallback = undefined;
          timeUpdateCallback = undefined;
          timeCorrection = undefined;
          failoverTime = undefined;
          isEnded = undefined;
          bitrateInfoList = undefined;
          mediaMetrics = undefined;
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
            DynamicWindowUtils.autoResumeAtStartOfRange(
              getCurrentTime(),
              getSeekableRange(),
              this.addEventCallback,
              this.removeEventCallback,
              function (event) {
                return event !== MediaState.PAUSED;
              },
              mediaPlayer.play);
          }
        },
        play: function () {
          mediaPlayer.play();
        },
        setCurrentTime: function (time) {
          var seekToTime = getClampedTime(time, getSeekableRange());
          if (windowType === WindowTypes.GROWING && seekToTime > getCurrentTime()) {
            refreshManifestBeforeSeek(seekToTime);
          } else {
            var seekTime = calculateSeekOffset(time);
            mediaPlayer.seek(seekTime);
          }
        }
      };
    };

    MSEStrategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return MSEStrategy;
  }
);
