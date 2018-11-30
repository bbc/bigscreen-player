define('bigscreenplayer/playbackstrategy/msestrategy',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/plugins',

    // static imports
    'dashjs'
  ],
  function (MediaState, WindowTypes, DebugTool, MediaKinds, Plugins) {
    return function (windowType, mediaKind, timeData, playbackElement) {
      var mediaPlayer;
      var eventCallback;
      var errorCallback;
      var timeUpdateCallback;
      var timeCorrection = timeData && timeData.correction || 0;

      var initialStartTime;
      var isEnded = false;
      var mediaElement;

      var bitrateInfoList;
      var videoMetrics;
      var dashMetrics;

      var playerMetadata = {
        downloadBitrate: undefined,
        playbackBitrate: undefined,
        bufferLength: undefined
      };

      var DashJSEvents = {
        ERROR: 'error',
        MANIFEST_LOADED: 'manifestLoaded',
        MANIFEST_VALIDITY_CHANGED: 'manifestValidityChanged',
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
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

          if (!bitrateInfoList) {
            bitrateInfoList = mediaPlayer.getBitrateInfoListFor('video');
          }
          if (bitrateInfoList && event.newQuality) {
            playerMetadata.playbackBitrate = bitrateInfoList[event.newQuality].bitrate / 1000;
          }
          Plugins.interface.onPlayerInfoUpdated(playerMetadata);
        }
      }

      function onMetricAdded (event) {
        DebugTool.info('Foo');
        if (event.mediaType === 'video') {
          if (event.metric === 'DroppedFrames') {
            DebugTool.keyValue({key: 'Dropped Frames', value: event.value.droppedFrames});
          } else if (event.metric === 'BufferLevel') {
            videoMetrics = mediaPlayer.getMetricsFor('video');
            dashMetrics = mediaPlayer.getDashMetrics();

            if (videoMetrics && dashMetrics) {
              playerMetadata.bufferLength = dashMetrics.getCurrentBufferLevel(videoMetrics);
              playerMetadata.downloadBitrate = mediaPlayer.getAverageThroughput('video');
              Plugins.interface.onPlayerInfoUpdated(playerMetadata);
              DebugTool.info('Buffer Length: ' + dashMetrics.getCurrentBufferLevel(videoMetrics));
              DebugTool.info('Get Average Throughput: ' + mediaPlayer.getAverageThroughput('video'));
            }
          }
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

      function setUpMediaPlayer (src) {
        mediaPlayer = dashjs.MediaPlayer().create();
        mediaPlayer.getDebug().setLogToBrowserConsole(false);

        mediaPlayer.setBufferToKeep(0);
        mediaPlayer.setBufferAheadToKeep(20);

        mediaPlayer.setBufferTimeAtTopQuality(12);
        mediaPlayer.setBufferTimeAtTopQualityLongForm(12);

        mediaPlayer.initialize(mediaElement, src, true);
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
        mediaPlayer.on(DashJSEvents.METRIC_ADDED, onMetricAdded);
      }

      function cdnFailoverLoad (newSrc, currentSrcWithTime) {
        // When an initial playback causes a failover and the media element is still reporting 0 rather than the initial start time
        if (mediaElement.currentTime === 0) {
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
              // zero start time indicates live point, relative time wise -1 will play almost from the live point,
              // otherwise play from the given video start time relative to the window
              startTime = (startTime === 0 ? -1 : startTime);
              srcWithTime = src + '#r=' + parseInt(startTime);
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
          return (mediaElement) ? mediaElement.currentTime - timeCorrection : 0;
        },
        getDuration: function () {
          return (mediaPlayer) ? mediaPlayer.duration() : 0;
        },
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

          mediaElement.parentElement.removeChild(mediaElement);

          mediaPlayer = undefined;
          mediaElement = undefined;
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

          var seekToTime = getClampedTime(time, this.getSeekableRange());

          if (windowType === WindowTypes.SLIDING) {
            mediaElement.currentTime = (seekToTime + timeCorrection);
          } else {
            mediaPlayer.seek(seekToTime);
          }
        }
      };
    };
  }
);
