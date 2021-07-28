define('bigscreenplayer/playbackstrategy/basicstrategy',
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
    var BasicStrategy = function (mediaSources, windowType, mediaKind, playbackElement, isUHD, device) {
      var eventCallbacks = [];
      var errorCallback;
      var timeUpdateCallback;

      var mediaElement;
      var metaDataLoaded;
      var timeCorrection = mediaSources.time() && mediaSources.time().correction || 0;
      var CLAMP_OFFSET_SECONDS = 1.1;

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
        if (!mediaElement) {
          setUpMediaElement(startTime);
          setUpMediaListeners();
        } else {
          mediaElement.src = mediaSources.currentSource();
          setStartTime(startTime);
          mediaElement.load();
        }
      }

      function setUpMediaElement (startTime) {
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
        mediaElement.src = mediaSources.currentSource();

        playbackElement.insertBefore(mediaElement, playbackElement.firstChild);

        setStartTime(startTime);
        mediaElement.load();
      }

      function setUpMediaListeners () {
        mediaElement.addEventListener('timeupdate', onTimeUpdate);
        mediaElement.addEventListener('playing', onPlaying);
        mediaElement.addEventListener('pause', onPaused);
        mediaElement.addEventListener('waiting', onWaiting);
        mediaElement.addEventListener('seeking', onSeeking);
        mediaElement.addEventListener('seeked', onSeeked);
        mediaElement.addEventListener('ended', onEnded);
        mediaElement.addEventListener('error', onError);
        mediaElement.addEventListener('loadedmetadata', onLoadedMetadata);
      }

      function setStartTime (startTime) {
        if (startTime) {
          mediaElement.currentTime = startTime + timeCorrection;
        }
      }

      function onPlaying () {
        publishMediaState(MediaState.PLAYING);
      }

      function onPaused () {
        publishMediaState(MediaState.PAUSED);
      }

      function onSeeking () {
        publishMediaState(MediaState.WAITING);
      }

      function onWaiting () {
        publishMediaState(MediaState.WAITING);
      }

      function onSeeked () {
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
        publishMediaState(MediaState.ENDED);
      }

      function onTimeUpdate () {
        publishTimeUpdate();
      }

      function onError (event) {
        publishError();
      }

      function onLoadedMetadata () {
        metaDataLoaded = true;
      }

      function isPaused () {
        return mediaElement.paused;
      }

      function getSeekableRange () {
        if (mediaElement && mediaElement.seekable && mediaElement.seekable.length > 0 && metaDataLoaded) {
          return {
            start: mediaElement.seekable.start(0) - timeCorrection,
            end: mediaElement.seekable.end(0) - timeCorrection
          };
        } else {
          return {
            start: 0,
            end: 0
          };
        }
      }

      function getDuration () {
        if (mediaElement && metaDataLoaded) {
          return mediaElement.duration;
        }
        return 0;
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
          play);
      }

      function play () {
        mediaElement.play();
      }

      function setCurrentTime (time) {
        if (metaDataLoaded) { // Without metadata we cannot clamp to seekableRange
          mediaElement.currentTime = getClampedTime(time, getSeekableRange()) + timeCorrection;
        } else {
          mediaElement.currentTime = time + timeCorrection;
        }
      }

      function setPlaybackRate (rate) {
        mediaElement.playbackRate = rate;
      }

      function getPlaybackRate () {
        return mediaElement.playbackRate;
      }

      function getClampedTime (time, range) {
        return Math.min(Math.max(time, range.start), range.end - CLAMP_OFFSET_SECONDS);
      }

      function addErrorCallback (thisArg, newErrorCallback) {
        errorCallback = function (event) {
          newErrorCallback.call(thisArg, event);
        };
      }

      function addTimeUpdateCallback (thisArg, newTimeUpdateCallback) {
        timeUpdateCallback = function () {
          newTimeUpdateCallback.call(thisArg);
        };
      }

      function tearDown () {
        if (mediaElement) {
          mediaElement.removeEventListener('timeupdate', onTimeUpdate);
          mediaElement.removeEventListener('playing', onPlaying);
          mediaElement.removeEventListener('pause', onPaused);
          mediaElement.removeEventListener('waiting', onWaiting);
          mediaElement.removeEventListener('seeking', onSeeking);
          mediaElement.removeEventListener('seeked', onSeeked);
          mediaElement.removeEventListener('ended', onEnded);
          mediaElement.removeEventListener('error', onError);
          mediaElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          mediaElement.removeAttribute('src');
          mediaElement.load();
          DOMHelpers.safeRemoveElement(mediaElement);
        }

        eventCallbacks = [];
        errorCallback = undefined;
        timeUpdateCallback = undefined;

        mediaElement = undefined;
        metaDataLoaded = undefined;
        timeCorrection = undefined;
      }

      function reset () {
        return;
      }

      function isEnded () {
        return mediaElement.ended;
      }

      function pause (opts) {
        mediaElement.pause();
        opts = opts || {};
        if (opts.disableAutoResume !== true && windowType === WindowTypes.SLIDING) {
          startAutoResumeTimeout();
        }
      }

      function getPlayerElement () {
        return mediaElement || undefined;
      }

      return {
        transitions: {
          canBePaused: function () { return true; },
          canBeginSeek: function () { return true; }
        },
        addEventCallback: addEventCallback,
        removeEventCallback: removeEventCallback,
        addErrorCallback: addErrorCallback,
        addTimeUpdateCallback: addTimeUpdateCallback,
        load: load,
        getSeekableRange: getSeekableRange,
        getCurrentTime: getCurrentTime,
        getDuration: getDuration,
        tearDown: tearDown,
        reset: reset,
        isEnded: isEnded,
        isPaused: isPaused,
        pause: pause,
        play: play,
        setCurrentTime: setCurrentTime,
        setPlaybackRate: setPlaybackRate,
        getPlaybackRate: getPlaybackRate,
        getPlayerElement: getPlayerElement
      };
    };

    BasicStrategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return BasicStrategy;
  }
);
