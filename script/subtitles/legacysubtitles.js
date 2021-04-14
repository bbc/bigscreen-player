define(
  'bigscreenplayer/subtitles/legacysubtitles', [
    'bigscreenplayer/subtitles/renderer',
    'bigscreenplayer/models/transportcontrolposition',
    'bigscreenplayer/domhelpers',
    'bigscreenplayer/utils/loadurl',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/plugins'
  ],
  function (Renderer, TransportControlPosition, DOMHelpers, LoadURL, DebugTool, Plugins) {
    'use strict';

    return function (mediaPlayer, autoStart, parentElement, mediaSources) {
      var container = document.createElement('div');
      var subtitlesRenderer;

      loadSubtitles();

      function loadSubtitles () {
        var url = mediaSources.currentSubtitlesSource();
        if (url && url !== '') {
          LoadURL(url, {
            timeout: 5000,
            onLoad: function (responseXML, responseText, status) {
              if (!responseXML) {
                DebugTool.info('Error: responseXML is invalid.');
                Plugins.interface.onSubtitlesTransformError();
                return;
              } else {
                createContainer(responseXML);
              }
            },
            onError: function (error) {
              DebugTool.info('Error loading subtitles data: ' + error);
              tearDown();
              autoStart = true;
              mediaSources.failoverSubtitles(loadSubtitles, Plugins.interface.onSubtitlesLoadError);
            }
          });
        }
      }

      function createContainer (xml) {
        container.id = 'playerCaptionsContainer';
        DOMHelpers.addClass(container, 'playerCaptions');

        // TODO: We don't need this extra Div really... can we get rid of render() and use the passed in container?
        subtitlesRenderer = new Renderer('playerCaptions', xml, mediaPlayer, autoStart);
        container.appendChild(subtitlesRenderer.render());

        parentElement.appendChild(container);
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
        stop();
        DOMHelpers.safeRemoveElement(container);
      }

      return {
        start: start,
        stop: stop,
        updatePosition: updatePosition,
        customise: function () {},
        renderExample: function () {},
        clearExample: function () {},
        tearDown: tearDown
      };
    };
  }
);
