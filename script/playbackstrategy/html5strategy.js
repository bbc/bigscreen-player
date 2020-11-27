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
        if (!mediaElement) {
          setUpMediaElement();
          setUpMediaListeners();
        } else {
          mediaElement.src = mediaSources.currentSource();
        }
      }

      function setUpMediaElement () {
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
        mediaElement.addEventListener('loadedmetadata', onLoadedMetadata);
      }

      function onPlaying () {
        console.log('playing event');
        publishMediaState(MediaState.PLAYING);
      }

      function onPaused () {
        console.log('paused event');
        publishMediaState(MediaState.PAUSED);
      }

      function onSeeking () {
        console.log('seeking event');
        publishMediaState(MediaState.WAITING);
      }

      function onWaiting () {
        console.log('waiting event');
        publishMediaState(MediaState.WAITING);
      }

      function onSeeked () {
        if (isPaused()) {
          if (windowType === WindowTypes.SLIDING) {
            startAutoResumeTimeout();
          }
          console.log('seeked event - paused');
          publishMediaState(MediaState.PAUSED);
        } else {
          console.log('seeked event - not paused');
          publishMediaState(MediaState.PLAYING);
        }
      }

      function onEnded () {
        console.log('ended event');
        publishMediaState(MediaState.ENDED);
      }

      function onTimeUpdate () {
        publishTimeUpdate();
      }

      function onError (event) {
        publishError();
      }

      function onLoadedMetadata () {
        console.log('loaded metadata');
        metaDataLoaded = true;
        if (playFromTime) {
          mediaElement.currentTime = playFromTime + timeCorrection;
          playFromTime = undefined;
        }
      }

      function onCanPlay () {
        console.log('can play metadata');
      }

      function isPaused () {
        return mediaElement.paused;
      }

      function getSeekableRange () {
        if (mediaElement && metaDataLoaded) {
          return {
            start: mediaElement.seekable.start(0) - timeCorrection, // need to subtract the time correction
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
          if (mediaElement) {
            mediaElement.removeEventListener('canplay', onCanPlay);
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
          playFromTime = undefined;
          metaDataLoaded = undefined;
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
        play: play,
        setCurrentTime: function (time) {
          console.log('setting time to: ' + (time + timeCorrection));
          mediaElement.currentTime = time + timeCorrection;
        },
        getPlayerElement: function () {
          return mediaElement || undefined;
        }
      };
    };

    HTML5Strategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    return HTML5Strategy;
  }
);
