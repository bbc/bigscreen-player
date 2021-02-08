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
    return function (mediaPlayer, response, autoStart, parentElement, defaultStyleOpts) {
      var currentSubtitlesElement;
      var exampleSubtitlesElement;
      var previousSubtitlesIndex = null;
      var imscRenderOpts = transformStyleOptions(defaultStyleOpts);
      var updateInterval;
      var exampleXml;
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

        if (exampleSubtitlesElement) {
          DOMHelpers.safeRemoveElement(exampleSubtitlesElement);
          exampleSubtitlesElement = undefined;
        }
      }

      function update (currentTime) {
        var subtitlesIndex = nextSubtitleIndex(currentTime);
        var generateAndRender = subtitlesIndex !== previousSubtitlesIndex;

        if (generateAndRender) {
          render(currentTime);
          previousSubtitlesIndex = subtitlesIndex;
        }
      }

      function render (currentTime) {
        removeCurrentSubtitlesElement();

        currentSubtitlesElement = document.createElement('div');
        currentSubtitlesElement.id = 'bsp_subtitles';
        parentElement.appendChild(currentSubtitlesElement);

        renderHTML(xml, currentTime, parentElement, currentSubtitlesElement, imscRenderOpts);
      }

      function loadExample (exampleSubtitlesUrl, styleOpts, safePosition) {
        if (!exampleXml) {
          LoadURL(exampleSubtitlesUrl, {
            onLoad: function (responseXML, responseText, status) {
              exampleXml = IMSC.fromXML(responseText);
              renderExample(exampleXml, styleOpts, safePosition);
            },
            onError: function (error) {
              DebugTool.info('Error loading subtitles example data: ' + error);
              Plugins.interface.onSubtitlesLoadError();
            }
          });
        } else {
          renderExample(exampleXml, styleOpts, safePosition);
        }
      }

      function renderExample (exampleXml, styleOpts, safePosition) {
        removeCurrentSubtitlesElement();

        var customStyleOptions = transformStyleOptions(styleOpts);
        var exampleStyle = Utils.merge(imscRenderOpts, customStyleOptions);

        exampleSubtitlesElement = document.createElement('div');
        exampleSubtitlesElement.id = 'subtitlesPreview';

        var SAFE_REGION = 8;
        // TODO: verify positions!
        if (safePosition) {
          exampleSubtitlesElement.style.position = 'absolute';
          exampleSubtitlesElement.style.overflow = 'hidden';
          exampleSubtitlesElement.style.top = safePosition.top + '%';
          exampleSubtitlesElement.style.left = safePosition.left + '%';
          exampleSubtitlesElement.style.height = (100 - safePosition.top - SAFE_REGION) + '%';
          exampleSubtitlesElement.style.width = (100 - safePosition.left - SAFE_REGION) + '%';
        }

        parentElement.appendChild(exampleSubtitlesElement);

        renderHTML(exampleXml, 1, parentElement, exampleSubtitlesElement, exampleStyle);
      }

      function renderHTML (xml, currentTime, parent, subsElement, styleOpts) {
        try {
          var isd = IMSC.generateISD(xml, currentTime);
          IMSC.renderHTML(isd, subsElement, null, parent.clientHeight, parent.clientWidth, false, null, null, false, styleOpts);
        } catch (e) {
          DebugTool.info('Exception while rendering subtitles: ' + e);
          Plugins.interface.onSubtitlesRenderError();
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

      function customise (styleOpts) {
        var customStyleOptions = transformStyleOptions(styleOpts);
        imscRenderOpts = Utils.merge(imscRenderOpts, customStyleOptions);
        render(mediaPlayer.getCurrentTime());
      }

      return {
        start: start,
        stop: stop,
        updatePosition: function () {},
        customise: customise,
        renderExample: loadExample,
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
