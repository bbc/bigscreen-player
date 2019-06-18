define(
  'bigscreenplayer/playbackstrategy/modifiers/seekfinishedemitevent',
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
  function (MediaPlayerBase) {
    'use strict';

    function SeekFinishedEmitEvent (state, restartTimeout, emitEventCallback) {
      var count;
      var timeoutHappened;
      var seekFinished;

      count = 0;
      if (state === MediaPlayerBase.STATE.EMPTY) {
        emitEventCallback(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);
        seekFinished = false;
      }

      timeoutHappened = false;
      if (restartTimeout) {
        setTimeout(function () {
          timeoutHappened = true;
        }, restartTimeout);
      } else {
        timeoutHappened = true;
      }

      function onStatus (state, currentTime, sentinelSeekTime, sentinelSeekTolerance) {
        var isAtCorrectStartingPoint = Math.abs(currentTime - sentinelSeekTime) <= sentinelSeekTolerance;

        if (sentinelSeekTime === undefined) {
          isAtCorrectStartingPoint = true;
        }

        var isPlayingAtCorrectTime = state === MediaPlayerBase.STATE.PLAYING && isAtCorrectStartingPoint;

        if (isPlayingAtCorrectTime && count >= 5 && timeoutHappened && !seekFinished) {
          emitEventCallback(MediaPlayerBase.EVENT.SEEK_FINISHED);
          seekFinished = true;
        } else if (isPlayingAtCorrectTime) {
          count++;
        } else {
          count = 0;
        }
      }

      return {
        onStatus: onStatus
      };
    }

    return SeekFinishedEmitEvent;
  });
