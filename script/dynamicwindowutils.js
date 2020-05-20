define(
  'bigscreenplayer/dynamicwindowutils', [
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/debugger/debugtool'
  ],
  function (LiveSupport, DebugTool) {
    'use strict';

    var AUTO_RESUME_WINDOW_START_CUSHION_SECONDS = 8;
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
      return liveSupport === LiveSupport.SEEKABLE ||
        (liveSupport === LiveSupport.RESTARTABLE &&
        window.bigscreenPlayer.playbackStrategy === 'nativestrategy');
    }

    function autoResumeAtStartOfRange (currentTime, seekableRange, addEventCallback, removeEventCallback, checkNotPauseEvent, resume) {
      var resumeTimeOut = Math.max(0, currentTime - seekableRange.start - AUTO_RESUME_WINDOW_START_CUSHION_SECONDS);
      DebugTool.keyValue({key: 'autoresume', value: resumeTimeOut});
      var autoResumeTimer = setTimeout(function () {
        removeEventCallback(detectIfUnpaused);
        resume();
      }, resumeTimeOut * 1000);

      addEventCallback(undefined, detectIfUnpaused);

      function detectIfUnpaused (event) {
        if (checkNotPauseEvent(event)) {
          removeEventCallback(detectIfUnpaused);
          clearTimeout(autoResumeTimer);
        }
      }
    }

    function shouldAutoResume (seekTime, seekableRangeStart) {
      return seekTime - seekableRangeStart <= AUTO_RESUME_WINDOW_START_CUSHION_SECONDS;
    }

    return {
      autoResumeAtStartOfRange: autoResumeAtStartOfRange,
      shouldAutoResume: shouldAutoResume,
      canPause: canPause,
      canSeek: canSeek
    };
  }
);

