define('bigscreenplayer/subtitles/subtitles',
  [
    'bigscreenplayer/subtitles/legacysubtitles',
    'bigscreenplayer/utils/loadurl',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/plugins'
  ],
  function (SubtitlesContainer, LoadURL, DebugTool, Plugins) {
    'use strict';
    // playbackStrategy, captionsURL, isSubtitlesEnabled(), playbackElement TODO: change the ordering of this, doesn't make sense.
    return function (mediaPlayer, url, autoStart, playbackElement) {
      var subtitlesContainer;
      var subtitlesEnabled = autoStart;
      var subtitlesAvailable = !!url;

      if (subtitlesAvailable) {
        DebugTool.info('Loading subtitles from: ' + url);
        LoadURL(url, {
          onLoad: function (responseXML, responseText, status) {
            if (!responseXML) {
              DebugTool.info('Error: responseXML is invalid.');
              Plugins.interface.onSubtitlesTransformError();
              return;
            }

            if (status === 200) {
              subtitlesContainer = SubtitlesContainer(mediaPlayer, responseXML, autoStart, playbackElement);
            }
          },
          onError: function (error) {
            DebugTool.info('Error loading subtitles data: ' + error);
            Plugins.interface.onSubtitlesLoadError();
          }
        });
      }

      function start () {
        subtitlesEnabled = true;
        if (available() && subtitlesContainer) {
          subtitlesContainer.start();
        }
      }

      function stop () {
        subtitlesEnabled = false;
        if (available() && subtitlesContainer) {
          subtitlesContainer.stop();
        }
      }

      function enabled () {
        return subtitlesEnabled;
      }

      function available () {
        return subtitlesAvailable;
      }

      function setPosition (position) {
        if (subtitlesContainer) {
          subtitlesContainer.updatePosition(position);
        }
      }

      function tearDown () {
        if (subtitlesContainer) {
          subtitlesContainer.tearDown();
        }
      }

      return {
        enable: start,
        disable: stop,
        enabled: enabled,
        available: available,
        setPosition: setPosition,
        tearDown: tearDown
      };
    };
  }
);
