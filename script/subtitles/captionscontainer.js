define(
  'bigscreenplayer/subtitles/captionscontainer', [
    'bigscreenplayer/subtitles/renderer',
    'bigscreenplayer/models/transportcontrolposition',
    'bigscreenplayer/domhelpers'
  ],
  function (Renderer, TransportControlPosition, DOMHelpers) {
    'use strict';

    return function (mediaPlayer, captionsURL, autoStart, parentElement) {
      var container = document.createElement('div');
      var subtitlesRenderer;

      container.id = 'playerCaptionsContainer';
      DOMHelpers.addClass(container, 'playerCaptions');

      // TODO: We don't need this extra Div really... can we get rid of render() and use the passed in container?
      if (captionsURL) {
        subtitlesRenderer = new Renderer('playerCaptions', captionsURL, mediaPlayer, container);
        container.appendChild(subtitlesRenderer.render());
      }

      parentElement.appendChild(container);

      if (autoStart) {
        start();
      }

      function start () {
        if (subtitlesRenderer) {
          subtitlesRenderer.start();
        }
      }

      function stop () {
        if (subtitlesRenderer) {
          subtitlesRenderer.stop();
        }
      }

      function updatePosition (transportControlPosition) {
        var classes = {
          controlsVisible: TransportControlPosition.CONTROLS_ONLY,
          controlsWithInfoVisible: TransportControlPosition.CONTROLS_WITH_INFO,
          leftCarouselVisible: TransportControlPosition.LEFT_CAROUSEL,
          bottomCarouselVisible: TransportControlPosition.BOTTOM_CAROUSEL
        };

        for (var cssClassName in classes) {
          if (classes.hasOwnProperty(cssClassName)) {
            // Allow multiple flags to be set at once
            if ((classes[cssClassName] & transportControlPosition) === classes[cssClassName]) {
              DOMHelpers.addClass(container, cssClassName);
            } else {
              DOMHelpers.removeClass(container, cssClassName);
            }
          }
        }
      }

      function tearDown () {
        DOMHelpers.safeRemoveElement(container);
      }

      return {
        start: start,
        stop: stop,
        updatePosition: updatePosition,
        tearDown: tearDown
      };
    };
  }
);
