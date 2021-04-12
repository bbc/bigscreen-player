define('bigscreenplayer/subtitles/imscsubtitles',
  [
    'bigscreenplayer/external/smp-imsc',
    'bigscreenplayer/domhelpers',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/plugins',
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/utils/loadurl',
    'bigscreenplayer/utils/timeutils'
  ],
  function (IMSC, DOMHelpers, DebugTool, Plugins, Utils, LoadURL, TimeUtils) {
    'use strict';
    return function (mediaPlayer, autoStart, parentElement, mediaSources, defaultStyleOpts) {
      var currentSubtitlesElement;
      var exampleSubtitlesElement;
      var imscRenderOpts = transformStyleOptions(defaultStyleOpts);
      var updateInterval;
      var SEGMENTS_TO_KEEP = 3;
      var segments = [];
      var currentSegmentRendered = {};
      var liveSubtitles = !!mediaSources.currentSubtitlesSegmentLength();
      var loadErrorCount = 0;
      var LOAD_ERROR_COUNT_MAX = 3;
      var windowStartEpochSeconds = getWindowStartTime() / 1000;

      if (autoStart) {
        start();
      }

      function loadAllRequiredSegments () {
        var segmentsToLoad = [];
        var currentSegment = TimeUtils.calculateSegmentNumber(windowStartEpochSeconds + mediaPlayer.getCurrentTime(), mediaSources.currentSubtitlesSegmentLength());
        for (var i = 0; i < SEGMENTS_TO_KEEP; i++) {
          var segmentNumber = currentSegment + i;
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
          var url = mediaSources.currentSubtitlesSource();
          loadSegment(url, segmentNumber);
        });
      }

      function loadSegment (url, segmentNumber) {
        url = url.replace('$segment$', segmentNumber);
        LoadURL(url, {
          timeout: 5000,
          onLoad: function (responseXML, responseText, status) {
            resetLoadErrorCount();
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
              DebugTool.info('Error transforming subtitles : ' + e);
              Plugins.interface.onSubtitlesTransformError();
              stop();
            }
          },
          onError: function (error) {
            DebugTool.info('Error loading subtitles data: ' + error);
            loadErrorFailover();
          }
        });
      }

      function resetLoadErrorCount () {
        loadErrorCount = 0;
      }

      function loadErrorFailover () {
        var errorCase = function () {
          stop();
          Plugins.interface.onSubtitlesLoadError();
        };

        if (liveSubtitles) {
          loadErrorCount++;
          if (loadErrorCount >= LOAD_ERROR_COUNT_MAX) {
            resetLoadErrorCount();
            mediaSources.failoverSubtitles(start, errorCase);
          }
        } else {
          mediaSources.failoverSubtitles(start, errorCase);
        }
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
          render(currentTime, segment.xml);
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

        renderHTML(xml, currentTime, currentSubtitlesElement, imscRenderOpts, parentElement.clientHeight, parentElement.clientWidth);
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
        if (liveSubtitles && xml && xml.head && xml.head.styling) {
          xml.head.styling.initials = defaultStyleOpts.initials;
        }
        return xml;
      }

      function timeIsValid (time) {
        return time > windowStartEpochSeconds;
      }

      function getCurrentTime () {
        return liveSubtitles ? windowStartEpochSeconds + mediaPlayer.getCurrentTime() : mediaPlayer.getCurrentTime();
      }

      function getWindowStartTime () {
        return mediaSources && mediaSources.time().windowStartTime;
      }

      function start () {
        var url = mediaSources.currentSubtitlesSource();
        if (url && url !== '') {
          if (!liveSubtitles) {
            loadSegment(url);
          }

          updateInterval = setInterval(function () {
            var time = getCurrentTime();
            if (liveSubtitles && timeIsValid(time)) {
              loadAllRequiredSegments();
            }
            update(time);
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
