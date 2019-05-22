define(
  'bigscreenplayer/utils/manifestutils', [
    'bigscreenplayer/models/windowtypes'
  ],
  function (WindowTypes) {
    'use strict';

    function needToGetManifest (windowType, liveSupport) {
      var requiresSeekingData = {
        restartable: true,
        seekable: true,
        playable: false,
        none: false
      };

      return windowType !== WindowTypes.STATIC && requiresSeekingData[liveSupport];
    }

    return {
      needToGetManifest: needToGetManifest
    };
  }
);
