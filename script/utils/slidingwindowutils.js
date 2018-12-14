define(
  'bigscreenplayer/utils/slidingwindowutils', [],
  function () {
    'use strict';

    function convertToSeekableVideoTime (epochTime, windowStartEpochTime) {
      // Wont allow a 0 value for this due to device issue, this should be sorted in the TAL strategy.
      return Math.max(0.1, convertToVideoTime(epochTime, windowStartEpochTime));
    }

    function convertToVideoTime (epochTime, windowStartEpochTime) {
      return Math.floor(convertMilliSecondsToSeconds(epochTime - windowStartEpochTime));
    }

    function convertMilliSecondsToSeconds (timeInMilis) {
      return Math.floor(timeInMilis / 1000);
    }

    return {
      convertToSeekableVideoTime: convertToSeekableVideoTime,
      convertToVideoTime: convertToVideoTime
    };
  }
);
