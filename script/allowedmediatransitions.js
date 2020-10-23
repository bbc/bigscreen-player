define(
  'bigscreenplayer/allowedmediatransitions',
  function () {
    'use strict';

    function AllowedMediaTransitions (mediaplayer) {
      var player = mediaplayer;

      var MediaPlayerState = {
        EMPTY: 'EMPTY', // No source set
        STOPPED: 'STOPPED', // Source set but no playback
        BUFFERING: 'BUFFERING', // Not enough data to play, waiting to download more
        PLAYING: 'PLAYING', // Media is playing
        PAUSED: 'PAUSED', // Media is paused
        COMPLETE: 'COMPLETE', // Media has reached its end point
        ERROR: 'ERROR' // An error occurred
      };

      function canBePaused () {
        var pausableStates = [
          MediaPlayerState.BUFFERING,
          MediaPlayerState.PLAYING
        ];
        return pausableStates.indexOf(player.getState()) !== -1;
      }

      function canBeStopped () {
        var unstoppableStates = [
          MediaPlayerState.EMPTY,
          MediaPlayerState.ERROR
        ];
        var stoppable = unstoppableStates.indexOf(player.getState()) === -1;
        return stoppable;
      }

      function canBeginSeek () {
        var unseekableStates = [
          MediaPlayerState.EMPTY,
          MediaPlayerState.ERROR
        ];
        var state = player.getState();
        var seekable = state ? unseekableStates.indexOf(state) === -1 : false;
        return seekable;
      }

      function canResume () {
        return player.getState() === MediaPlayerState.PAUSED || player.getState() === MediaPlayerState.BUFFERING;
      }

      return {
        canBePaused: canBePaused,
        canBeStopped: canBeStopped,
        canBeginSeek: canBeginSeek,
        canResume: canResume
      };
    }

    return AllowedMediaTransitions;
  });