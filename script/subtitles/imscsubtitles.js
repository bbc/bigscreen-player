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
      var SEGMENTS_TO_KEEP = 3;
      var segments = [];
      var currentSegmentRendered = {};
      var liveSubtitles = !!captions.segmentLength;

      if (autoStart) {
        start();
      }

      function loadAllRequiredSegments () {
        var segmentsToLoad = [];

        for (var i = 0; i < SEGMENTS_TO_KEEP; i++) {
          var segmentNumber = calculateSegmentNumber(i);
          var alreadyLoaded = segments.some(function (segment) {
            return segment.number === segmentNumber;
          });

          if (!alreadyLoaded) {
            segmentsToLoad.push(segmentNumber);
          }
        }

        if (SEGMENTS_TO_KEEP === segmentsToLoad.length) {
          // This is to ensure when seeking to a point with no subtitles, don't leave previous subtitle displayed.
          removeCurrentSubtitlesElement();
        }

        segmentsToLoad.forEach(function (segmentNumber) {
          loadSegment(captions.captionsUrl, segmentNumber);
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
            if (!responseXML && !liveSubtitles) {
              DebugTool.info('Error: responseXML is invalid.');
              Plugins.interface.onSubtitlesTransformError();
              stop();
              return;
            }

            try {
              var xml = IMSC.fromXML(responseText.split(/<\?xml version=\"1.0\" encoding=\"UTF-8\"\?>/i)[1] || responseText);
              var times = xml.getMediaTimeEvents();

              segments.push({
                xml: modifyStyling(xml),
                times: times || [0],
                previousSubtitleIndex: null,
                number: segmentNumber
              });

              if (segments.length > SEGMENTS_TO_KEEP) {
                pruneSegments();
              }
            } catch (e) {
              DebugTool.info('Error transforming captions : ' + e);
              Plugins.interface.onSubtitlesTransformError();
              stop();
            }
          },
          onError: function (error) {
            DebugTool.info('Error loading subtitles data: ' + error);
            DebugTool.info('Media player current time: ' + mediaPlayer.getCurrentTime());
            DebugTool.info('Attempted to load url: ' + url);
            DebugTool.info('Approx highest segment number available: ' + Math.floor(((Date.now() / 1000) - 10) / captions.segmentLength));
            Plugins.interface.onSubtitlesLoadError();
            stop();
          }
        });
      }

      function pruneSegments () {
        // Before sorting, check if we've gone back in time, so we know whether to prune from front or back of array
        var seekedBack = segments[SEGMENTS_TO_KEEP].number < segments[SEGMENTS_TO_KEEP - 1].number;

        segments.sort(function (a, b) {
          return a.number - b.number;
        });

        if (seekedBack) {
          segments.pop();
        } else {
          segments.splice(0, 1);
        }
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
        var segment = getSegmentToRender(currentTime);

        if (segment) {
          DebugTool.keyValue({key: 'segmentToRender', value: 'true'});
          render(currentTime, segment.xml);
        } else {
          DebugTool.keyValue({key: 'segmentToRender', value: 'false'});
        }
      }

      function getSegmentToRender (currentTime) {
        var segment;

        for (var i = 0; i < segments.length; i++) {
          for (var j = 0; j < segments[i].times.length; j++) {
            var lastOne = segments[i].times.length === j + 1;
            if (currentTime >= segments[i].times[j] && (lastOne || currentTime < segments[i].times[j + 1]) && segments[i].previousSubtitleIndex !== j && segments[i].times[j] !== 0) {
              segment = segments[i];
              currentSegmentRendered = segments[i];
              segments[i].previousSubtitleIndex = j;
              break;
            }
          }
        }

        return segment;
      }

      function render (currentTime, xml) {
        removeCurrentSubtitlesElement();

        currentSubtitlesElement = document.createElement('div');
        currentSubtitlesElement.id = 'bsp_subtitles';
        currentSubtitlesElement.style.position = 'absolute';
        parentElement.appendChild(currentSubtitlesElement);

        return renderHTML(xml, currentTime, currentSubtitlesElement, imscRenderOpts, parentElement.clientHeight, parentElement.clientWidth);
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

      function modifyStyling (xml) {
        if (liveSubtitles) {
          xml.head.styling.initials = {
            'http://www.w3.org/ns/ttml#styling displayAlign': 'after',
            'http://www.w3.org/ns/ttml#styling lineHeight': '133%',
            'http://www.w3.org/ns/ttml#styling overflow': 'visible'
          };

          for (var i = 0; i < xml.body.contents.length; i++) {
            for (var j = 0; j < xml.body.contents[i].contents.length; j++) {
              xml.body.contents[i].contents[j].styleAttrs['http://www.w3.org/ns/ttml#styling fontFamily'] = ['ReithSans', 'Arial', 'Roboto', 'proportionalSansSerif', 'default'];
              xml.body.contents[i].contents[j].styleAttrs['http://www.w3.org/ns/ttml#styling fontSize'].value = 94;
            }
          }
        }
        return xml;
      }

      function timeIsValid (time) {
        return time > ((windowStartTime / 1000) / captions.segmentLength);
      }

      function getCurrentTime () {
        return liveSubtitles ? (windowStartTime / 1000) + mediaPlayer.getCurrentTime() : mediaPlayer.getCurrentTime();
      }

      function start () {
        if (!liveSubtitles && captions.captionsUrl) {
          loadSegment(captions.captionsUrl);
        }

        updateInterval = setInterval(function () {
          var time = getCurrentTime();
          if (liveSubtitles && timeIsValid(time)) {
            loadAllRequiredSegments();
          }
          update(time);
        }, 750);
      }

      function stop () {
        clearInterval(updateInterval);
        removeCurrentSubtitlesElement();
      }

      function customise (styleOpts, enabled) {
        var customStyleOptions = transformStyleOptions(styleOpts);
        imscRenderOpts = Utils.merge(imscRenderOpts, customStyleOptions);
        if (enabled) {
          render(getCurrentTime(), currentSegmentRendered && currentSegmentRendered.xml);
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
          segments = undefined;
        }
      };
    };
  }
);
