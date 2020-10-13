define(
  'bigscreenplayer/readyhelper', [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes'
  ],
  function (MediaState, WindowTypes) {
    var ReadyHelper = function (initialPlaybackTime, windowType, callback) {
      var complete = false;

      var callbackWhenReady = function (evt) {
        if (complete) return;

        var ready = false;

        if (!evt.data) {
          return;
        } else if (evt.timeUpdate) {
          ready = isValidTime(evt.data);
        } else {
          ready = isValidState(evt.data) && isValidTime(evt.data);
        }

        if (ready && !complete) {
          complete = true;
          callback();
        }
      };

      function isValidState (evtData) {
        return evtData.state && evtData.state !== MediaState.FATAL_ERROR;
      }

      function isValidTime (evtData) {
        var isStatic = windowType === WindowTypes.STATIC;

        if (isStatic) {
          if (initialPlaybackTime) {
            return evtData.currentTime > 0;
          } else {
            return evtData.currentTime >= 0;
          }
        }

        if (!isStatic) {
          var validSeekableRange = isValidSeekableRange(evtData.seekableRange);

          if (validSeekableRange) {
            var currTimeGtStart = evtData.currentTime >= evtData.seekableRange.start;
            var currTimeLtEnd = evtData.currentTime <= evtData.seekableRange.end;

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
