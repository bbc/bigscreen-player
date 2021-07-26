import MediaPlayerBase from '../../../../script/playbackstrategy/modifiers/mediaplayerbase';
import WindowTypes from '../../../../script/models/windowtypes';
import DynamicWindowUtils from '../../../../script/dynamicwindowutils';

function RestartableLivePlayer (mediaPlayer, windowType, mediaSources) {
  var callbacksMap = [];
  var startTime;
  var fakeTimer = {};
  var timeCorrection = mediaSources.time().correction || 0;
  addEventCallback(this, updateFakeTimer);

  function updateFakeTimer (event) {
    if (fakeTimer.wasPlaying && fakeTimer.runningTime) {
      fakeTimer.currentTime += (Date.now() - fakeTimer.runningTime) / 1000;
    }

    fakeTimer.runningTime = Date.now();
    fakeTimer.wasPlaying = event.state === MediaPlayerBase.STATE.PLAYING;
  }

  function addEventCallback (thisArg, callback) {
    function newCallback (event) {
      event.currentTime = getCurrentTime();
      event.seekableRange = getSeekableRange();
      callback(event);
    }
    callbacksMap.push({ from: callback, to: newCallback });
    mediaPlayer.addEventCallback(thisArg, newCallback);
  }

  function removeEventCallback (thisArg, callback) {
    var filteredCallbacks = callbacksMap.filter(function (cb) {
      return cb.from === callback;
    });

    if (filteredCallbacks.length > 0) {
      callbacksMap = callbacksMap.splice(callbacksMap.indexOf(filteredCallbacks[0]));

      mediaPlayer.removeEventCallback(thisArg, filteredCallbacks[0].to);
    }
  }

  function removeAllEventCallbacks () {
    mediaPlayer.removeAllEventCallbacks();
  }

  function pause (opts) {
    mediaPlayer.pause();
    opts = opts || {};
    if (opts.disableAutoResume !== true && windowType === WindowTypes.SLIDING) {
      DynamicWindowUtils.autoResumeAtStartOfRange(
        getCurrentTime(),
        getSeekableRange(),
        addEventCallback,
        removeEventCallback,
        MediaPlayerBase.unpausedEventCheck,
        resume);
    }
  }
  function resume () {
    mediaPlayer.resume();
  }

  function getCurrentTime () {
    return fakeTimer.currentTime + timeCorrection;
  }

  function getSeekableRange () {
    var windowLength = (mediaSources.time().windowEndTime - mediaSources.time().windowStartTime) / 1000;
    var delta = (Date.now() - startTime) / 1000;
    return {
      start: (windowType === WindowTypes.SLIDING ? delta : 0) + timeCorrection,
      end: windowLength + delta + timeCorrection
    };
  }

  return {
    beginPlayback: function () {
      startTime = Date.now();
      fakeTimer.currentTime = (mediaSources.time().windowEndTime - mediaSources.time().windowStartTime) / 1000;

      if (window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.forceBeginPlaybackToEndOfWindow) {
        mediaPlayer.beginPlaybackFrom(Infinity);
      } else {
        mediaPlayer.beginPlayback();
      }
    },

    beginPlaybackFrom: function (offset) {
      startTime = Date.now();
      fakeTimer.currentTime = offset;
      mediaPlayer.beginPlaybackFrom(offset);
    },

    initialiseMedia: function (mediaType, sourceUrl, mimeType, sourceContainer, opts) {
      if (mediaType === MediaPlayerBase.TYPE.AUDIO) {
        mediaType = MediaPlayerBase.TYPE.LIVE_AUDIO;
      } else {
        mediaType = MediaPlayerBase.TYPE.LIVE_VIDEO;
      }

      mediaPlayer.initialiseMedia(mediaType, sourceUrl, mimeType, sourceContainer, opts);
    },

    pause: pause,

    resume: resume,

    stop: function () {
      mediaPlayer.stop();
    },

    reset: function () {
      mediaPlayer.reset();
    },

    getState: function () {
      return mediaPlayer.getState();
    },

    getSource: function () {
      return mediaPlayer.getSource();
    },

    getMimeType: function () {
      return mediaPlayer.getMimeType();
    },

    addEventCallback: addEventCallback,

    removeEventCallback: removeEventCallback,

    removeAllEventCallbacks: removeAllEventCallbacks,

    getPlayerElement: function () {
      return mediaPlayer.getPlayerElement();
    },

    getCurrentTime: getCurrentTime,

    getSeekableRange: getSeekableRange

  };
}

export default RestartableLivePlayer;
