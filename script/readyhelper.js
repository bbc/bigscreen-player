define(
  'bigscreenplayer/readyhelper', [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes'
  ],
  function (MediaState, WindowTypes) {
    var ReadyHelper = function (initialPlaybackTime, windowType, callback) {
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
        if (currentTime) {
          if (initialPlaybackTime) {
            return currentTime > 0;
          } else {
            return currentTime >= 0;
          }
        }
        return false;
      }

      function validateLiveTime (currentTime, seekableRange) {
        return true;
        if (currentTime && seekableRange) {
          var validSeekableRange = isValidSeekableRange(seekableRange);

          if (validSeekableRange) {
            var currTimeGtStart = currentTime >= seekableRange.start;
            var currTimeLtEnd = currentTime <= seekableRange.end;

            return currTimeGtStart && currTimeLtEnd;
          }
        }
        return false;
      }

      function isValidSeekableRange (seekableRange) {
        return seekableRange
          ? !(seekableRange.start === 0 && seekableRange.end === 0)
          : false;
      }

      return {
        callbackWhenReady: callbackWhenReady
      };
    };

    return ReadyHelper;
  }
);
