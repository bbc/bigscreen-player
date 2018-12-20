define(
  'bigscreenplayer/utils/timeutils', [],
  function () {
    'use strict';

    function durationToSeconds (duration) {
      var matches = duration.match(/^PT(\d+(?:[,\.]\d+)?H)?(\d+(?:[,\.]\d+)?M)?(\d+(?:[,\.]\d+)?S)?/) || [];

      var hours = parseFloat(matches[1] || 0) * 60 * 60;
      var mins = parseFloat(matches[2] || 0) * 60;
      var secs = parseFloat(matches[3] || 0);

      return (hours + mins + secs) || undefined;
    }

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
      durationToSeconds: durationToSeconds,
      convertToSeekableVideoTime: convertToSeekableVideoTime,
      convertToVideoTime: convertToVideoTime
    };
  }
);
