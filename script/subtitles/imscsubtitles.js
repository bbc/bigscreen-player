define('bigscreenplayer/subtitles/imscsubtitles',
  [ 'smp-imsc',
    'bigscreenplayer/domhelpers'
  ],
  function (IMSC, DOMHelpers) {
    'use strict';
    return function (mediaPlayer, response, autoStart, parentElement) {
      var xml = parseXMl(response.text);
      var times = xml.getMediaTimeEvents();
      var currentSubtitlesElement;
      var previousSubtitlesIndex = null;
      var updateInterval;

      if (autoStart) {
        start();
      }

      // TODO: general pattern for lib access
      function parseXMl (xmlString) {
        try {
          return IMSC.fromXML(xmlString);
        } catch (e) {
          // DebugTool
          // Plugin
        }
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

          try {
            var isd = IMSC.generateISD(xml, currentTime);
            IMSC.renderHTML(isd, currentSubtitlesElement, null, parentElement.clientHeight, parentElement.clientWidth, false, null, null, false);
          } catch (e) {
            DebugTool.info('IMSC Error: ' + e);
          }

          parentElement.appendChild(currentSubtitlesElement);
          previousSubtitlesIndex = subtitlesIndex;
        }
      }

      function start () {
        updateInterval = setInterval(function () {
          update(mediaPlayer.getCurrentTime());
        }, 750);
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
