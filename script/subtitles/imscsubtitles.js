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
      // args: xmlstring, errorHandler, metadataHandler
      var xml = IMSC.fromXML(response.text, errorHandlerNoOp);

      return {
        start: function () {
          updateInterval = setInterval(function () {
            // Does the action need doing?
            // - safely remove the old output (DOMUtils)
            // - generate new output spans
            // - update the DOM

            if (currentSubtitlesElement) {
              DOMHelpers.safeRemoveElement(currentSubtitlesElement);
            }
            currentSubtitlesElement = document.createElement('div');
            // args: tt, offset, errorHandler
            var isd = IMSC.generateISD(xml, 0, errorHandlerNoOp);
            // args: isd, element, imgResolver, eheight, ewidth, displayForcedOnlyMode, errorHandler, previousISDState, enableRollUp
            // TODO: real args, ish: isd, currentSubtitlesElement, null, parentElement.height, parentElement.width, false, errorHandlerNoOp, null, false
            IMSC.renderHTML(isd);
          }, 750);
        },
        stop: function () {
          clearInterval(updateInterval);
        },
        updatePosition: function () {},
        tearDown: function () {}
      };
    };
  }
);
