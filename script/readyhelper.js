define(
  'bigscreenplayer/readyhelper', [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/models/windowtypes'
  ],
  function (MediaState, WindowTypes) {
    var ReadyHelper = function (initialPlaybackTime, windowType, callback) {
      var ready = false;

      initialPlaybackTime = initialPlaybackTime || 0;

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

        if (isStatic && evtData.currentTime >= initialPlaybackTime) {
          return true;
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
