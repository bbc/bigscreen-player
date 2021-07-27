import MediaState from './models/mediastate';
import WindowTypes from './models/windowtypes';
import LiveSupport from './models/livesupport';

var ReadyHelper = function (initialPlaybackTime, windowType, liveSupport, callback) {
  var ready = false;

  var callbackWhenReady = function (evt) {
    if (ready) return;

    if (!evt.data) {
      ready = false;
    } else if (evt.timeUpdate) {
      ready = isValidTime(evt.data);
    } else {
      ready = isValidState(evt.data) && isValidTime(evt.data);
    }

    if (ready && callback) {
      callback();
    }
  };

  function isValidState (evtData) {
    return evtData.state && evtData.state !== MediaState.FATAL_ERROR;
  }

  function isValidTime (evtData) {
    var isStatic = windowType === WindowTypes.STATIC;

    if (isStatic) {
      return validateStaticTime(evtData.currentTime);
    } else {
      return validateLiveTime(evtData.currentTime, evtData.seekableRange);
    }
  }

  function validateStaticTime (currentTime) {
    if (currentTime !== undefined) {
      if (initialPlaybackTime) {
        return currentTime > 0;
      } else {
        return currentTime >= 0;
      }
    }
    return false;
  }

  function validateLiveTime (currentTime, seekableRange) {
    if (liveSupport === LiveSupport.PLAYABLE) {
      return currentTime >= 0;
    }

    if (!isValidSeekableRange(seekableRange)) {
      return false;
    }

    return true;
  }

  function isValidSeekableRange (seekableRange) {
    if (seekableRange) {
      if (seekableRange.start === 0 && seekableRange.end === 0) {
        return false;
      }
      return true;
    }
    return false;
  }

  return {
    callbackWhenReady: callbackWhenReady
  };
};

export default ReadyHelper;
