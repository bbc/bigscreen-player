define('bigscreenplayer/subtitles/subtitles',
  ['bigscreenplayer/subtitles/' + (window.bigscreenPlayer.overrides.legacySubtitles ? 'legacysubtitles' : 'imscsubtitles')],
  function (Captions) {
    'use strict';
    // playbackStrategy, captionsURL, isSubtitlesEnabled(), playbackElement TODO: change the ordering of this, doesn't make sense.
    return function (mediaPlayer, url, autoStart, playbackElement) {
      var captions = Captions(mediaPlayer, url, autoStart, playbackElement);
      return captions;
    };
  }
);
