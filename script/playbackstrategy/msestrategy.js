define('bigscreenplayer/playbackstrategy/msestrategy',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/debugger/debugtool',

    // static imports
    'dashjs'
  ],
  function (MediaState, WindowTypes, DebugTool) {
    return function (windowType, mediaKind, timeData, playbackElement) {
      var mediaPlayer;
      var eventCallback;
      var errorCallback;
      var timeUpdateCallback;
      var timeCorrection = timeData && timeData.correction || 0;

      var initialStartTime;
      var isEnded = false;
      var videoElement;

      var DashJSEvents = {
        ERROR: 'error',
        MANIFEST_LOADED: 'manifestLoaded',
        MANIFEST_VALIDITY_CHANGED: 'manifestValidityChanged',
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
        METRIC_ADDED: 'metricAdded'
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
        publishTimeUpdate();
      }

      function onError (event) {
        event.errorProperties = {error_mssg: event.error};
        DebugTool.info('MSE Error: ' + event.error);
        publishError(event);
      }

      function onManifestLoaded (event) {
        DebugTool.info('Manifest loaded. Duration is: ' + event.data.mediaPresentationDuration);
      }

      function onManifestValidityChange (event) {
        DebugTool.info('Manifest validity changed. Duration is: ' + event.newDuration);
      }

      function onQualityChangeRendered (event) {
        if (event.mediaType === 'video') {
          DebugTool.info('ABR Change Rendered from: ' + event.oldQuality + ' to: ' + event.newQuality);
        }
      }

      function onMetricAdded (event) {
        if (event.mediaType === 'video' && event.metric === 'DroppedFrames') {
          DebugTool.keyValue({key: 'Dropped Frames', value: event.value.droppedFrames});
        }
      }

      function publishMediaState (mediaState) {
        if (eventCallback) {
          eventCallback(mediaState);
        }
      }

      function publishTimeUpdate () {
        if (timeUpdateCallback) {
          timeUpdateCallback();
        }
      }

      function publishError (errorEvent) {
        if (errorCallback) {
          errorCallback(errorEvent);
        }
      }

      function isPaused () {
        return (mediaPlayer) ? mediaPlayer.isPaused() : undefined;
      }

      function getClampedTime (time, range) {
        return Math.min(Math.max(time, range.start), range.end - 1.1);
      }

      function setUpMediaElement (playbackElement) {
        videoElement = document.createElement('video');

        videoElement.style.position = 'absolute';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';

        playbackElement.insertBefore(videoElement, playbackElement.firstChild);
      }

      function setUpMediaPlayer (src) {
        mediaPlayer = dashjs.MediaPlayer().create();
        mediaPlayer.getDebug().setLogToBrowserConsole(false);
        mediaPlayer.initialize(videoElement, src, true);
      }

      function setUpMediaListeners () {
        videoElement.addEventListener('timeupdate', onTimeUpdate);
        videoElement.addEventListener('playing', onPlaying);
        videoElement.addEventListener('pause', onPaused);
        videoElement.addEventListener('waiting', onBuffering);
        videoElement.addEventListener('seeking', onBuffering);
        videoElement.addEventListener('seeked', onSeeked);
        videoElement.addEventListener('ended', onEnded);
        videoElement.addEventListener('error', onError);
        mediaPlayer.on(DashJSEvents.ERROR, onError);
        mediaPlayer.on(DashJSEvents.MANIFEST_LOADED, onManifestLoaded);
        mediaPlayer.on(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange);
        mediaPlayer.on(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered);
        mediaPlayer.on(DashJSEvents.METRIC_ADDED, onMetricAdded);
      }

      function cdnFailoverLoad (newSrc, currentSrcWithTime) {
        // When an initial playback causes a failover and the media element is still reporting 0 rather than the initial start time
        if (videoElement.currentTime === 0) {
          currentSrcWithTime = newSrc + '#t=' + initialStartTime;
        }
        mediaPlayer.attachSource(currentSrcWithTime);
      }

      return {
        transitions: {
          canBePaused: function () { return true; },
          canBeginSeek: function () { return true; }
        },
        addEventCallback: function (thisArg, newCallback) {
          eventCallback = function (event) {
            newCallback.call(thisArg, event);
          };
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
        load: function (src, mimeType, startTime) {
          var srcWithTime = startTime ? src + '#t=' + (startTime + timeCorrection) : src;

          if (!mediaPlayer) {
            initialStartTime = startTime + timeCorrection;

            if (windowType === WindowTypes.GROWING) {
              var windowStartTimeSeconds = (timeData.windowStartTime / 1000);
              var srcWithTimeAnchor = src + '#t=';
              // No need for an absolute time to play from live with a Webcast using dashjs.
              srcWithTime = src;

              if (startTime) {
                startTime = parseInt(startTime);
                srcWithTime = startTime === 0 ? srcWithTimeAnchor + (windowStartTimeSeconds + 1) : srcWithTimeAnchor + (windowStartTimeSeconds + startTime);
              }
            }

            if (windowType === WindowTypes.SLIDING) {
              srcWithTime = src; // No need for a relative time to play from live.

              if (startTime !== undefined) {
                // play from the given video start time relative to the window
                // zero start time indicates live point to dashjs, but we use zero to mean start of the window
                // so substituting -1 will play almost from the live point
                startTime = (startTime === 0 ? -1 : startTime);
                srcWithTime = src + '#r=' + parseInt(startTime);
              }
            }

            setUpMediaElement(playbackElement);
            setUpMediaPlayer(srcWithTime);
            setUpMediaListeners();
          } else {
            cdnFailoverLoad(src, srcWithTime);
          }
        },
        getSeekableRange: function () {
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
            end: this.getDuration()
          };
        },
        getCurrentTime: function () {
          return (videoElement) ? videoElement.currentTime - timeCorrection : 0;
        },
        getDuration: function () {
          return (mediaPlayer) ? mediaPlayer.duration() : 0;
        },
        tearDown: function () {
          mediaPlayer.reset();

          videoElement.removeEventListener('timeupdate', onTimeUpdate);
          videoElement.removeEventListener('playing', onPlaying);
          videoElement.removeEventListener('pause', onPaused);
          videoElement.removeEventListener('waiting', onBuffering);
          videoElement.removeEventListener('seeking', onBuffering);
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('ended', onEnded);
          videoElement.removeEventListener('error', onError);
          mediaPlayer.off(DashJSEvents.ERROR, onError);
          mediaPlayer.off(DashJSEvents.MANIFEST_LOADED, onManifestLoaded);
          mediaPlayer.off(DashJSEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChange);
          mediaPlayer.off(DashJSEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered);
          mediaPlayer.off(DashJSEvents.METRIC_ADDED, onMetricAdded);

          videoElement.parentElement.removeChild(videoElement);

          mediaPlayer = undefined;
          videoElement = undefined;
          eventCallback = undefined;
          errorCallback = undefined;
          timeUpdateCallback = undefined;
          isEnded = undefined;
          initialStartTime = undefined;
          timeCorrection = undefined;
          windowType = undefined;
        },
        reset: function () {
          return;
        },
        isEnded: function () {
          return isEnded;
        },
        isPaused: isPaused,
        pause: function () {
          mediaPlayer.pause();
        },
        play: function () {
          mediaPlayer.play();
        },
        setCurrentTime: function (time) {
          if (windowType === WindowTypes.GROWING) {
            DebugTool.info('Seeking and refreshing the manifest');
            mediaPlayer.refreshManifest();
          }

          if (windowType === WindowTypes.SLIDING) {
            videoElement.currentTime = (time + timeCorrection);
          } else {
            mediaPlayer.seek(getClampedTime(time, this.getSeekableRange()));
          }
        }
      };
    };
  }
);
