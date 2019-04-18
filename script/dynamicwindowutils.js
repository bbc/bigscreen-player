define(
  'bigscreenplayer/dynamicwindowutils', [
    'bigscreenplayer/models/livesupportenum'
  ],
  function (LiveSupport) {
    'use strict';

    var FOUR_MINUTES = 4 * 60;

    function convertMilliSecondsToSeconds (timeInMilis) {
      return Math.floor(timeInMilis / 1000);
    }

    function hasFiniteSeekableRange (seekableRange) {
      var hasRange = true;
      try {
        hasRange = seekableRange.end !== Infinity;
      } catch (e) {}
      return hasRange;
    }

    function canSeek (windowStart, windowEnd, liveSupport, seekableRange) {
      return supportsSeeking(liveSupport) &&
        initialWindowIsBigEnoughForSeeking(windowStart, windowEnd) &&
        hasFiniteSeekableRange(seekableRange);
    }

    function canPause (windowStart, windowEnd, liveSupport) {
      return supportsPause(liveSupport) &&
        initialWindowIsBigEnoughForSeeking(windowStart, windowEnd);
    }

    function initialWindowIsBigEnoughForSeeking (windowStart, windowEnd) {
      var start = convertMilliSecondsToSeconds(windowStart);
      var end = convertMilliSecondsToSeconds(windowEnd);
      return end - start > FOUR_MINUTES;
    }

    function supportsPause (liveSupport) {
      return liveSupport === LiveSupport.SEEKABLE ||
        liveSupport === LiveSupport.RESTARTABLE;
    }

    function supportsSeeking (liveSupport) {
      return liveSupport === LiveSupport.SEEKABLE;
    }

    return {
      canPause: canPause,
      canSeek: canSeek
    };
  }
);

