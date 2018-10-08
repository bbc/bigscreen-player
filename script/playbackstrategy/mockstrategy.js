define('bigscreenplayer/playbackstrategy/mockstrategy',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/bigscreenplayer',
    'bigscreenplayer/debugger/debugtool'
  ],
  function (MediaState, WindowTypes, MediaSetUtils, DebugTool) {
    var eventCallback;
    var errorCallback;
    var timeUpdateCallback;
    var instance = {
      transitions: {
        canBePaused: function () { return true; },
        canBeginSeek: function () { return true; }
      },
      addEventCallback: function (thisArg, callback) {
        eventCallback = function (event) {
          callback.call(thisArg, event);
        };
      },
      addErrorCallback: function (thisArg, callback) {
        errorCallback = function (event) {
          callback.call(thisArg, event);
        };
      },
      addTimeUpdateCallback: function (thisArg, callback) {
        timeUpdateCallback = function () {
          callback.call(thisArg);
        };
      },
      getSeekableRange: function () {
        return {
          start: 0,
          end: 0
        };
      },
      getCurrentTime: function () {
        return;
      },
      getDuration: function () {
        return;
      },
      load: function () {
        return;
      },
      play: function () {
        return;
      },
      pause: function () {
        return;
      },
      reset: function () {
        return;
      },
      tearDown: function () {
        return;
      },
      isEnded: function () {
        return;
      },
      getPlayerElement: function () {
        return;
      },
      setCurrentTime: function () {
        return;
      },
      isPaused: function () {
        return;
      },
      mockingHooks: {
        fireEvent: function (event) {
          eventCallback(event);
        },
        fireErrorEvent: function (event) {
          errorCallback(event);
        },
        fireTimeUpdate: function () {
          timeUpdateCallback();
        }
      }
    };

    return function MockStrategy (playbackFrame, playbackType, streamType, mediaType, timeData, videoContainer) {
      return instance;
    };
  }
);
