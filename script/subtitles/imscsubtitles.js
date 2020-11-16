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
      var previousCaptionIndex = null;

      if (autoStart) {
        start();
      }

      function nextSubtitleIndex (currentTime) {
        if (currentTime < times[0]) {
          return null;
        }

        var futureIndices = times.filter(function (time, index) {
          return time > currentTime ? index : null;
        });

        return futureIndices[0];
      }

      function start () {
        updateInterval = setInterval(function () {
          var currentTime = mediaPlayer.getCurrentTime();
          var subtitlesIndex = nextSubtitleIndex(currentTime);

          if (subtitlesIndex !== previousCaptionIndex) {
            if (currentSubtitlesElement) {
              DOMHelpers.safeRemoveElement(currentSubtitlesElement);
            }
            currentSubtitlesElement = document.createElement('div');
            currentSubtitlesElement.id = 'bsp_subtitles';

            var isd = IMSC.generateISD(xml, currentTime, errorHandlerNoOp);
            IMSC.renderHTML(isd, currentSubtitlesElement, null, parentElement.clientHeight, parentElement.clientWidth, false, errorHandlerNoOp, null, false);

            parentElement.appendChild(currentSubtitlesElement);
            previousCaptionIndex = subtitlesIndex;
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
