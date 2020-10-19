define(
  'bigscreenplayer/readyhelper', [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport'
  ],
  function (MediaState, WindowTypes, LiveSupport) {
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

        if (ready) {
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

        if (isValidSeekableRange(seekableRange)) {
          var currTimeGtStart = currentTime >= seekableRange.start;
          var currTimeLtEnd = currentTime <= seekableRange.end;

          return currTimeGtStart && currTimeLtEnd;
        }
        return false;
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

    return ReadyHelper;
  }
);
