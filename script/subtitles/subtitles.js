define('bigscreenplayer/subtitles/subtitles',
  [
    'bigscreenplayer/subtitles/' + (window.bigscreenPlayer.overrides.legacySubtitles ? 'legacysubtitles' : 'imscsubtitles'),
    'bigscreenplayer/utils/loadurl',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/plugins'
  ],
  function (Captions, LoadURL, DebugTool, Plugins) {
    'use strict';
    // playbackStrategy, captionsURL, isSubtitlesEnabled(), playbackElement TODO: change the ordering of this, doesn't make sense.
    return function (mediaPlayer, url, autoStart, playbackElement) {
      var captions;

      DebugTool.info('Loading captions from: ' + url);
      LoadURL(url, {
        onLoad: function (responseXML, responseText, status) {
          if (status === 200) {
            captions = Captions(mediaPlayer, responseXML, autoStart, playbackElement);
            return captions;
          }
        },
        onError: function (error) {
          DebugTool.info('Error loading captions data: ' + error);
          Plugins.interface.onSubtitlesLoadError();
        }
      });

      // TODO: if onError is called, no captions are returned. Need to handle this
      // in playerComponent - or ideally bring more subtitle handling into this abstraction
    };
  }
);
