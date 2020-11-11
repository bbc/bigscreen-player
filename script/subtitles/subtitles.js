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
      var subtitlesEnabled = autoStart;
      var available = !!url;

      DebugTool.info('Loading captions from: ' + url);
      LoadURL(url, {
        onLoad: function (responseXML, responseText, status) {
          if (status === 200) {
            captions = Captions(mediaPlayer, responseXML, autoStart, playbackElement);
          }
        },
        onError: function (error) {
          DebugTool.info('Error loading captions data: ' + error);
          available = false;
          Plugins.interface.onSubtitlesLoadError();
        }
      });

      function setEnabled (enabled) {
        subtitlesEnabled = enabled || false;
        if (areAvailable() && captions) {
          subtitlesEnabled ? captions.start() : captions.stop();
        }
      }

      function areEnabled () {
        return subtitlesEnabled;
      }

      function areAvailable () {
        return available;
      }

      function setPosition (position) {
        if (captions) {
          captions.updatePosition(position);
        }
      }

      function tearDown () {
        if (captions) {
          captions.tearDown();
        }
      }

      return {
        setEnabled: setEnabled,
        areEnabled: areEnabled,
        areAvailable: areAvailable,
        setPosition: setPosition,
        tearDown: tearDown
      };
    };
  }
);
