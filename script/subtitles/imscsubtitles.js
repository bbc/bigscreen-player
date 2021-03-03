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
    return function (mediaPlayer, captions, autoStart, parentElement, defaultStyleOpts, windowStartTime) {
      var currentSubtitlesElement;
      var exampleSubtitlesElement;
      var imscRenderOpts = transformStyleOptions(defaultStyleOpts);
      var updateInterval;
      var fragmentInterval;
      var FRAGMENTS_TO_KEEP = 3;
      var fragments = [];

      if (captions.captionsUrl && !captions.segmentLength) {
        loadSegment(captions.captionsUrl);
      } else if (captions.captionsUrl && captions.segmentLength) {
        loadAllRequiredSegments();

        fragmentInterval = setInterval(loadAllRequiredSegments, captions.segmentLength * 1000);
      }

      function loadAllRequiredSegments () {
        var segmentsToLoad = [];

        for (var i = 0; i < FRAGMENTS_TO_KEEP; i++) {
          var segmentNumber = calculateSegmentNumber(i);
          var alreadyLoaded = fragments.some(function (fragment) {
            return fragment.segmentNumber === segmentNumber;
          });

          if (!alreadyLoaded) {
            segmentsToLoad.push(segmentNumber);
          }
        }

        segmentsToLoad.forEach(function (segment) {
          loadSegment(captions.captionsUrl, segment);
        });
      }

      function calculateSegmentNumber (offset) {
        var epochSeconds = (windowStartTime / 1000) + mediaPlayer.getCurrentTime();
        return Math.floor(epochSeconds / captions.segmentLength) + offset;
      }

      function loadSegment (url, segmentNumber) {
        url = url.replace('$segment$', segmentNumber);
        LoadURL(url, {
          onLoad: function (responseXML, responseText, status) {
            if (!responseXML) {
              DebugTool.info('Error: responseXML is invalid.');
              Plugins.interface.onSubtitlesTransformError();
              return;
            }

            try {
              var xml = IMSC.fromXML(responseText.split(/<\?xml version=\"1.0\" encoding=\"UTF-8\"\?>/i)[1]);
              var times = xml.getMediaTimeEvents();

              fragments.push({
                xml: xml,
                times: times,
                previousSubtitleIndex: null,
                segmentNumber: segmentNumber
              });

              var direction;
              if (fragments.length > 3 && (fragments[3].segmentNumber < fragments[2].segmentNumber)) {
                direction = 'backwards';
              } else {
                direction = 'forwards';
              }

              fragments.sort(function (a, b) {
                return a.segmentNumber - b.segmentNumber;
              });

              if (direction === 'forwards') {
                if (fragments.length > FRAGMENTS_TO_KEEP) {
                  fragments.splice(0, 1);
                }
              } else {
                fragments.pop();
              }

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
        clearInterval(fragmentInterval);
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
