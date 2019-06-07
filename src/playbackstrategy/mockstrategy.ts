var eventCallback;
var errorCallback;
var timeUpdateCallback;
var instance = {
  transitions: {
    canBePaused: function() {
      return true;
    },
    canBeginSeek: function() {
      return true;
    }
  },
  addEventCallback: function(thisArg, callback) {
    eventCallback = function(event) {
      callback.call(thisArg, event);
    };
  },
  addErrorCallback: function(thisArg, callback) {
    errorCallback = function(event) {
      callback.call(thisArg, event);
    };
  },
  addTimeUpdateCallback: function(thisArg, callback) {
    timeUpdateCallback = function() {
      callback.call(thisArg);
    };
  },
  getSeekableRange: function() {
    return {
      start: 0,
      end: 0
    };
  },
  getCurrentTime: function() {
    return;
  },
  getDuration: function() {
    return;
  },
  load: function() {
    return;
  },
  play: function() {
    return;
  },
  pause: function() {
    return;
  },
  reset: function() {
    return;
  },
  tearDown: function() {
    return;
  },
  isEnded: function() {
    return;
  },
  getPlayerElement: function() {
    return;
  },
  setCurrentTime: function() {
    return;
  },
  isPaused: function() {
    return;
  },
  mockingHooks: {
    fireEvent: function(event) {
      eventCallback(event);
    },
    fireErrorEvent: function(event) {
      errorCallback(event);
    },
    fireTimeUpdate: function() {
      timeUpdateCallback();
    }
  }
};

var MockStrategy = function(
  playbackFrame,
  playbackType,
  streamType,
  mediaType,
  timeData,
  videoContainer
) {
  return instance;
};

MockStrategy.getLiveSupport = function() {
  return "seekable";
};

export default MockStrategy;
