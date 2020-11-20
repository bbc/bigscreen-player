define('bigscreenplayer/subtitles/imscsubtitles',
  [
    'bigscreenplayer/external/smp-imsc',
    'bigscreenplayer/domhelpers',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/plugins'
  ],
  function (IMSC, DOMHelpers, DebugTool, Plugins) {
    'use strict';
    return function (mediaPlayer, response, autoStart, parentElement) {
      var currentSubtitlesElement;
      var previousSubtitlesIndex = null;
      var updateInterval;
      var xml;
      var times = [];

      try {
        xml = IMSC.fromXML(response.text);
        times = xml.getMediaTimeEvents();
        if (autoStart) {
          start();
        }
      } catch (e) {
        DebugTool.info('Error transforming captions : ' + e);
        Plugins.interface.onSubtitlesTransformError();
      }

      function nextSubtitleIndex (currentTime) {
        if (currentTime === undefined || currentTime < times[0]) {
          return null;
        }

        if (currentTime > times[times.length - 1]) {
          return times.length - 1;
        }

        var futureIndices = times.filter(function (time, index) {
          return time > currentTime ? index : null;
        });

        return futureIndices[0];
      }

      function removeCurrentSubtitlesElement () {
        if (currentSubtitlesElement) {
          DOMHelpers.safeRemoveElement(currentSubtitlesElement);
          currentSubtitlesElement = undefined;
        }
      }

      function update (currentTime) {
        var subtitlesIndex = nextSubtitleIndex(currentTime);
        var generateAndRender = subtitlesIndex !== previousSubtitlesIndex;

        if (generateAndRender) {
          removeCurrentSubtitlesElement();

          currentSubtitlesElement = document.createElement('div');
          currentSubtitlesElement.id = 'bsp_subtitles';
          parentElement.appendChild(currentSubtitlesElement);

          try {
            var isd = IMSC.generateISD(xml, currentTime);
            IMSC.renderHTML(isd, currentSubtitlesElement, null, parentElement.clientHeight, parentElement.clientWidth, false, null, null, false);
          } catch (e) {
            DebugTool.info('Exception while rendering subtitles: ' + e);
            Plugins.interface.onSubtitlesRenderError();
          }

          previousSubtitlesIndex = subtitlesIndex;
        }
      }

      function start () {
        if (xml && times.length > 0) {
          updateInterval = setInterval(function () {
            update(mediaPlayer.getCurrentTime());
          }, 750);
        }
      }

      function stop () {
        clearInterval(updateInterval);
        removeCurrentSubtitlesElement();
      }

      return {
        start: start,
        stop: stop,
        updatePosition: function () {},
        tearDown: function () {
          stop();
          xml = undefined;
          times = undefined;
          previousSubtitlesIndex = undefined;
        }
      };
    };
  }
);
