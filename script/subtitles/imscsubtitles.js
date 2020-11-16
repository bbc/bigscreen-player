define('bigscreenplayer/subtitles/imscsubtitles',
  [ 'smp-imsc',
    'bigscreenplayer/domhelpers'
  ],
  function (IMSC, DOMHelpers) {
    'use strict';
    return function (mediaPlayer, response, autoStart, parentElement) {
      // TODO: This is obviously a placeholder
      var errorHandlerNoOp = function () {};
      var updateInterval;
      var xml = IMSC.fromXML(response.text, errorHandlerNoOp);
      var times = xml.getMediaTimeEvents();
      var currentSubtitlesElement;
      var previousSubtitlesIndex = null;

      if (autoStart) {
        start();
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

          var isd = IMSC.generateISD(xml, currentTime, errorHandlerNoOp);
          IMSC.renderHTML(isd, currentSubtitlesElement, null, parentElement.clientHeight, parentElement.clientWidth, false, errorHandlerNoOp, null, false);

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
