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
      var currentSubtitlesElement;
      var xml = IMSC.fromXML(response.text, errorHandlerNoOp);
      var times = xml.getMediaTimeEvents();
      var currentCaptionTime;
      var previousCaptionTime;

      if (autoStart) {
        start();
      }

      function currentSubtitleTime () {
        var currentTime = mediaPlayer.getCurrentTime();

        if (currentTime > times[0]) {
          for (var i = 0; i < times.length; i++) {
            if (currentTime < times[i]) {
              currentCaptionTime = i === 0 ? times[i] : times[i - 1];
              break;
            }
            currentCaptionTime = times[i];
          }
        }
      }

      function start () {
        updateInterval = setInterval(function () {
          currentSubtitleTime();

          if (currentCaptionTime !== previousCaptionTime) {
            if (currentSubtitlesElement) {
              DOMHelpers.safeRemoveElement(currentSubtitlesElement);
            }
            currentSubtitlesElement = document.createElement('div');
            currentSubtitlesElement.id = 'bsp_subtitles';

            var isd = IMSC.generateISD(xml, currentCaptionTime, errorHandlerNoOp);
            IMSC.renderHTML(isd, currentSubtitlesElement, null, parentElement.clientHeight, parentElement.clientWidth, false, errorHandlerNoOp, null, false);

            parentElement.appendChild(currentSubtitlesElement);
            previousCaptionTime = currentCaptionTime;
          }
        }, 750);
      }

      return {
        start: start,
        stop: function () {
          clearInterval(updateInterval);
        },
        updatePosition: function () {},
        tearDown: function () {}
      };
    };
  }
);
