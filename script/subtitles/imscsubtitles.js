define('bigscreenplayer/subtitles/imscsubtitles',
  [
    'bigscreenplayer/external/smp-imsc',
    'bigscreenplayer/domhelpers',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/plugins',
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/utils/loadurl'
  ],
  function (IMSC, DOMHelpers, DebugTool, Plugins, Utils, LoadURL) {
    'use strict';
    return function (mediaPlayer, url, autoStart, parentElement, defaultStyleOpts) {
      var currentSubtitlesElement;
      var exampleSubtitlesElement;
      var imscRenderOpts = transformStyleOptions(defaultStyleOpts);
      var updateInterval;
      var fragments = [];

      if (url) {
        LoadURL(url, {
          onLoad: function (responseXML, responseText, status) {
            if (!responseXML) {
              DebugTool.info('Error: responseXML is invalid.');
              Plugins.interface.onSubtitlesTransformError();
              return;
            }

            try {
              var xml = IMSC.fromXML(responseText);
              var times = xml.getMediaTimeEvents();

              fragments.push({
                xml: xml,
                times: times,
                previousSubtitleIndex: null
              });

              if (autoStart) {
                start();
              }
            } catch (e) {
              DebugTool.info('Error transforming captions : ' + e);
              Plugins.interface.onSubtitlesTransformError();
            }
          },
          onError: function (error) {
            DebugTool.info('Error loading subtitles data: ' + error);
            Plugins.interface.onSubtitlesLoadError();
          }
        });
      }

      // Opts: { backgroundColour: string (css colour, hex), fontFamily: string , size: number, lineHeight: number }
      function transformStyleOptions (opts) {
        if (opts === undefined) return;

        var customStyles = {};

        if (opts.backgroundColour) {
          customStyles.spanBackgroundColorAdjust = {transparent: opts.backgroundColour};
        }

        if (opts.fontFamily) {
          customStyles.fontFamily = opts.fontFamily;
        }

        if (opts.size) {
          customStyles.sizeAdjust = opts.size;
        }

        if (opts.lineHeight) {
          customStyles.lineHeightAdjust = opts.lineHeight;
        }

        return customStyles;
      }

      function getSubtitleIndex (currentTime) {
        var times = fragments[0].times;
        if (currentTime === undefined || currentTime < times[0]) {
          return null;
        }

        if (currentTime > times[times.length - 1]) {
          return times.length - 1;
        }

        for (var i = 0; i < times.length; i++) {
          if (currentTime >= times[i] && currentTime < times[i + 1]) {
            return i;
          }
        }
      }

      function removeCurrentSubtitlesElement () {
        if (currentSubtitlesElement) {
          DOMHelpers.safeRemoveElement(currentSubtitlesElement);
          currentSubtitlesElement = undefined;
        }
      }

      function removeExampleSubtitlesElement () {
        if (exampleSubtitlesElement) {
          DOMHelpers.safeRemoveElement(exampleSubtitlesElement);
          exampleSubtitlesElement = undefined;
        }
      }

      function update (currentTime) {
        var subtitleIndex = getSubtitleIndex(currentTime);
        var generateAndRender = subtitleIndex !== fragments[0].previousSubtitleIndex;

        if (generateAndRender) {
          render(currentTime);
          fragments[0].previousSubtitleIndex = subtitleIndex;
        }
      }

      function render (currentTime) {
        removeCurrentSubtitlesElement();

        currentSubtitlesElement = document.createElement('div');
        currentSubtitlesElement.id = 'bsp_subtitles';
        currentSubtitlesElement.style.position = 'absolute';
        parentElement.appendChild(currentSubtitlesElement);

        renderHTML(fragments[0].xml, currentTime, currentSubtitlesElement, imscRenderOpts, parentElement.clientHeight, parentElement.clientWidth);
      }

      function renderExample (exampleXmlString, styleOpts, safePosition) {
        var exampleXml = IMSC.fromXML(exampleXmlString);
        removeExampleSubtitlesElement();

        var customStyleOptions = transformStyleOptions(styleOpts);
        var exampleStyle = Utils.merge(imscRenderOpts, customStyleOptions);

        exampleSubtitlesElement = document.createElement('div');
        exampleSubtitlesElement.id = 'subtitlesPreview';
        exampleSubtitlesElement.style.position = 'absolute';

        var renderWidth = parentElement.clientWidth;
        if (safePosition) {
          exampleSubtitlesElement.style.left = safePosition.left + '%';

          var leftPixels = parentElement.clientWidth * (safePosition.left / 100);
          renderWidth = parentElement.clientWidth - leftPixels;
        }

        parentElement.appendChild(exampleSubtitlesElement);

        renderHTML(exampleXml, 1, exampleSubtitlesElement, exampleStyle, parentElement.clientHeight, renderWidth);
      }

      function renderHTML (xml, currentTime, subsElement, styleOpts, renderHeight, renderWidth) {
        try {
          var isd = IMSC.generateISD(xml, currentTime);
          IMSC.renderHTML(isd, subsElement, null, renderHeight, renderWidth, false, null, null, false, styleOpts);
        } catch (e) {
          DebugTool.info('Exception while rendering subtitles: ' + e);
          Plugins.interface.onSubtitlesRenderError();
        }
      }

      function start () {
        if (fragments.length > 0) {
          updateInterval = setInterval(function () {
            update(mediaPlayer.getCurrentTime());
          }, 750);
        }
      }

      function stop () {
        clearInterval(updateInterval);
        removeCurrentSubtitlesElement();
      }

      function customise (styleOpts, enabled) {
        var customStyleOptions = transformStyleOptions(styleOpts);
        imscRenderOpts = Utils.merge(imscRenderOpts, customStyleOptions);
        if (enabled) {
          render(mediaPlayer.getCurrentTime());
        }
      }

      return {
        start: start,
        stop: stop,
        updatePosition: function () {},
        customise: customise,
        renderExample: renderExample,
        clearExample: removeExampleSubtitlesElement,
        tearDown: function () {
          stop();
          fragments = undefined;
        }
      };
    };
  }
);
