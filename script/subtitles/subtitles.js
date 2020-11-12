define('bigscreenplayer/subtitles/subtitles',
  [
    'bigscreenplayer/subtitles/legacysubtitles',
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
      var subtitlesAvailable = !!url;

      DebugTool.info('Loading captions from: ' + url);
      LoadURL(url, {
        onLoad: function (responseXML, responseText, status) {
          if (status === 200) {
            captions = Captions(mediaPlayer, responseXML, autoStart, playbackElement);
          }
        },
        onError: function (error) {
          DebugTool.info('Error loading captions data: ' + error);
          Plugins.interface.onSubtitlesLoadError();
        }
      });

      function setEnabled (enabled) {
        subtitlesEnabled = enabled || false;
        if (available() && captions) {
          subtitlesEnabled ? captions.start() : captions.stop();
        }
      }

      function enabled () {
        return subtitlesEnabled;
      }

      function available () {
        return subtitlesAvailable;
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
        enabled: enabled,
        available: available,
        setPosition: setPosition,
        tearDown: tearDown
      };
    };
  }
);
