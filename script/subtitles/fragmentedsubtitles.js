define('bigscreenplayer/subtitles/fragmentedsubtitles',
  [
    'bigscreenplayer/external/smp-imsc',
    'bigscreenplayer/domhelpers',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/plugins',
    'bigscreenplayer/utils/loadurl'
  ],
  function (IMSC, DOMHelpers, DebugTool, Plugins, LoadURL) {
    'use strict';
    return function (mediaPlayer, autoStart, parentElement, mediaSources) {
      var currentSubtitlesElement;
      var updateInterval;
      var fragments = [null, null, null, null, null, null, null, null, null, null];
      var fragmentIndex = 0;
      var liveSegmentsLoaded = [1];

      if (autoStart) {
        start();
      }

      function nextSubtitleTime (currentTime, fragment) {
        var futureIndices = fragment.times.filter(function (time, index) {
          return time > currentTime ? index : null;
        });

        return futureIndices[0];
      }

      function removeCurrentSubtitlesElement () {
        if (currentSubtitlesElement) {
          DOMHelpers.safeRemoveElement(currentSubtitlesElement);
          currentSubtitlesElement = undefined;
        }
      }

      function update (epochTime) {
        fragments.some(function (fragment) {
          if (fragment) {
            var subtitlesIndex = nextSubtitleTime(epochTime, fragment);
            var generateAndRender = subtitlesIndex !== fragment.previousIndex;

            if (generateAndRender) {
              removeCurrentSubtitlesElement();

              currentSubtitlesElement = document.createElement('div');
              currentSubtitlesElement.id = 'bsp_subtitles';
              parentElement.appendChild(currentSubtitlesElement);

              try {
                var isd = IMSC.generateISD(fragment.xml, epochTime);
                if (isd.contents.length > 0) {
                  IMSC.renderHTML(isd, currentSubtitlesElement, null, parentElement.clientHeight, parentElement.clientWidth, false, null, null, false);
                  return true;
                }
              } catch (e) {
                DebugTool.info('Exception while rendering subtitles: ' + e);
                Plugins.interface.onSubtitlesRenderError();
              }

              fragment.previousIndex = subtitlesIndex;
            }
          }
        });
      }

      function start () {
        setInterval(function () {
          var epochSeconds = (mediaSources.time().windowStartTime / 1000) + mediaPlayer.getCurrentTime();
          var segmentToLoad = Math.floor(epochSeconds / 3.84) + 2;

          var url = getCaptionsUrl('caption1=64000', segmentToLoad);

          var segmentNotLoaded = liveSegmentsLoaded.indexOf(segmentToLoad) === -1;

          if (segmentNotLoaded) {
            DebugTool.info('Loading subtitle segment: ' + segmentToLoad);
            LoadURL(url, {
              onLoad: function (responseXML, responseText, status) {
                liveSegmentsLoaded.push(segmentToLoad);
                var xmlString = responseText.split(/<\?xml version=\"1.0\" encoding=\"UTF-8\"\?>/i)[1];

                xmlString = mungeXml(xmlString);

                var parsedXML = IMSC.fromXML(xmlString);
                var fragmentTimes = parsedXML.getMediaTimeEvents();

                fragments[fragmentIndex] = {
                  xml: parsedXML,
                  times: fragmentTimes,
                  previousIndex: null
                };

                // circular buffer - keep 10 fragments
                fragmentIndex++;
                if (fragmentIndex > 9) {
                  fragmentIndex = 0;
                }
              },
              onError: function (error) {
                DebugTool.info('Live subtitle loading error: ' + error);
              }
            });
          }
        }, 1000);

        updateInterval = setInterval(function () {
          var currentTime = mediaPlayer.getCurrentTime();
          var epochSeconds = (mediaSources.time().windowStartTime / 1000) + currentTime;
          update(epochSeconds);
        }, 750);
      }

      function stop () {
        clearInterval(updateInterval);
        removeCurrentSubtitlesElement();
      }

      function mungeXml (xmlString) {
        xmlString = xmlString.replace('<styling>', '<styling><style xml:id="nm-fixup-div" tts:fontSize="117%" tts:lineHeight="120%"/>');
        var searchRegExp = /<region/g;
        xmlString = xmlString.replace(searchRegExp, '<region tts:overflow="visible" tts:displayAlign="after" ');

        xmlString = xmlString.replace('<body><div', '<body><div style="nm-fixup-div"');

        var fontRegExp = /tts:fontFamily="monospaceSansSerif/g;
        xmlString = xmlString.replace(fontRegExp, 'tts:fontFamily="ReithSans, Arial, Roboto, proportionalSansSerif, default');

        return xmlString;
      }

      function getCaptionsUrl (representationString, segment) {
        var manifest = mediaSources.getManifest();
        var url = mediaSources.currentSource().split(/\/.\w*.mpd/)[0];

        var baseUrl = manifest.getElementsByTagName('BaseURL')[0].textContent;

        var segmentTemplate = manifest.getElementsByTagName('SegmentTemplate')[0];
        var mediaRepresentation = segmentTemplate.getAttribute('media');

        mediaRepresentation = mediaRepresentation.replace('$RepresentationID$', representationString);
        mediaRepresentation = mediaRepresentation.replace('$Number$', segment);

        var captionsUrl = url + '/' + baseUrl + mediaRepresentation;

        return captionsUrl;
      }

      return {
        start: start,
        stop: stop,
        updatePosition: function () {},
        tearDown: function () {
          stop();
        }
      };
    };
  }
);
