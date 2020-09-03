define('bigscreenplayer/playbackstrategy/html5strategy',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/dynamicwindowutils',
    'bigscreenplayer/domhelpers',
    'bigscreenplayer/debugger/debugtool'
  ],
  function (MediaState, WindowTypes, MediaKinds, LiveSupport, DynamicWindowUtils, DOMHelpers, DebugTool) {
    var HTML5Strategy = function (mediaSources, windowType, mediaKind, playbackElement, isUHD, device) {
      var LIVE_DELAY_SECONDS = 1.1;

      var eventCallbacks = [];
      var errorCallback;
      var timeUpdateCallback;

      var mediaElement;
      var playFromTime;
      var metaDataLoaded;
      var timeCorrection = mediaSources.time() && mediaSources.time().correction || 0;

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

      function load (mimeType, startTime) {
        playFromTime = startTime;
        setUpMediaElement(playbackElement, mimeType);
        setUpMediaListeners();
      }

      function setUpMediaElement (playbackElement, mimeType) {
        if (mediaKind === MediaKinds.AUDIO) {
          mediaElement = document.createElement('audio');
        } else {
          mediaElement = document.createElement('video');
        }
        mediaElement.style.position = 'absolute';
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';
        mediaElement.autoplay = true;
        mediaElement.preload = 'auto';

        playbackElement.insertBefore(mediaElement, playbackElement.firstChild);

        var sourceElement = document.createElement('source');
        sourceElement.src = mediaSources.currentSource();
        sourceElement.type = mimeType;

        mediaElement.appendChild(sourceElement);
        mediaElement.load();
      }

      function setUpMediaListeners () {
        mediaElement.addEventListener('canplay', onCanPlay);
        mediaElement.addEventListener('timeupdate', onTimeUpdate);
        mediaElement.addEventListener('playing', onPlaying);
        mediaElement.addEventListener('pause', onPaused);
        mediaElement.addEventListener('waiting', onWaiting);
        mediaElement.addEventListener('seeking', onSeeking);
        mediaElement.addEventListener('seeked', onSeeked);
        mediaElement.addEventListener('ended', onEnded);
        mediaElement.addEventListener('error', onError);
        mediaElement.addEventListener('loadedmetadata', onLoadedMetadata, false);
      }

      function onPlaying () {
        console.log('playing');
        publishMediaState(MediaState.PLAYING);
      }

      function onPaused () {
        console.log('paused');
        publishMediaState(MediaState.PAUSED);
      }

      function onSeeking () {
        console.log('seeking');
        publishMediaState(MediaState.WAITING);
      }

      function onWaiting () {
        console.log('waiting');
        publishMediaState(MediaState.WAITING);
      }

      function onSeeked () {
        console.log('seeked');
        if (isPaused()) {
          if (windowType === WindowTypes.SLIDING) {
            startAutoResumeTimeout();
          }
          publishMediaState(MediaState.PAUSED);
        } else {
          // publish here as mediaElement playing event not thrown after a seek whilst in playback
          publishMediaState(MediaState.PLAYING);
        }
      }

      function onEnded () {
        console.log('ended');
        publishMediaState(MediaState.ENDED);
      }

      function onTimeUpdate () {
        publishTimeUpdate();
      }

      function onError (event) {
        console.log('error');
        publishError();
      }

      function onLoadedMetadata () {
        console.log('loadedmetadata');
        metaDataLoaded = true;
      }

      function onCanPlay () {
        console.log('canplay');
        if (playFromTime && metaDataLoaded) {
          mediaElement.currentTime = getClampedTime(playFromTime, getSeekableRange()) + timeCorrection;
          playFromTime = undefined;
        }
        if (!isPaused()) {
          mediaElement.play();
        }
      }

      function isPaused () {
        return mediaElement.paused;
      }

      function getClampedTime (time, range) {
        return Math.min(Math.max(time, range.start), range.end - LIVE_DELAY_SECONDS);
      }

      function getSeekableRange () {
        if (mediaElement && metaDataLoaded) {
          return {
            start: mediaElement.seekable.start(0),
            end: mediaElement.seekable.end(0)
          };
        }
        return undefined;
      }

      function getDuration () {
        if (mediaElement && metaDataLoaded) {
          return mediaElement.duration;
        }
        return undefined;
      }

      function getCurrentTime () {
        return (mediaElement) ? mediaElement.currentTime - timeCorrection : 0;
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
          mediaElement.play);
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
          mediaElement.removeEventListener('timeupdate', onTimeUpdate);
          mediaElement.removeEventListener('playing', onPlaying);
          mediaElement.removeEventListener('pause', onPaused);
          mediaElement.removeEventListener('waiting', onWaiting);
          mediaElement.removeEventListener('seeking', onSeeking);
          mediaElement.removeEventListener('seeked', onSeeked);
          mediaElement.removeEventListener('ended', onEnded);
          mediaElement.removeEventListener('error', onError);

          DOMHelpers.safeRemoveElement(mediaElement);

          mediaElement = undefined;
          eventCallbacks = [];
          errorCallback = undefined;
          timeUpdateCallback = undefined;
          timeCorrection = undefined;
        },
        reset: function () {
          return;
        },
        isEnded: function () {
          return mediaElement.ended;
        },
        isPaused: isPaused,
        pause: function (opts) {
          mediaElement.pause();
          opts = opts || {};
          if (opts.disableAutoResume !== true && windowType === WindowTypes.SLIDING) {
            startAutoResumeTimeout();
          }
        },
        play: function () {
          mediaElement.play();
        },
        setCurrentTime: function (time) {
          mediaElement.currentTime = getClampedTime(time, getSeekableRange()) + timeCorrection;
        }
      };
    };

    HTML5Strategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return HTML5Strategy;
  }
);
