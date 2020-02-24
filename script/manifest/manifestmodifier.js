define('bigscreenplayer/manifest/manifestmodifier',
  [
    'bigscreenplayer/debugger/debugtool'
  ],
  function (DebugTool) {
    'use strict';

    function filter (manifest, representationOptions, oldDashCodecRequired) {
      var constantFps = representationOptions.constantFps;
      var maxFps = representationOptions.maxFps;

      if (constantFps || maxFps) {
        manifest.Period.AdaptationSet = manifest.Period.AdaptationSet.map(function (adaptationSet) {
          if (adaptationSet.contentType === 'video') {
            var frameRates = [];

            adaptationSet.Representation_asArray = adaptationSet.Representation_asArray.filter(function (representation) {
              if (!maxFps || representation.frameRate <= maxFps) {
                frameRates.push(representation.frameRate);
                return true;
              }
            }).filter(function (representation) {
              return !constantFps || representation.frameRate === Math.max.apply(null, frameRates);
            });
          }
          return adaptationSet;
        });
      }

      if (oldDashCodecRequired) {
        DebugTool.keyValue({ key: 'Video Container', value: 'avc1' });
        manifest = rewriteDashCodec(manifest);
      } else {
        DebugTool.keyValue({ key: 'Video Container', value: 'avc3' });
      }

      return manifest;
    }

    function extractBaseUrl (manifest) {
      if (manifest.Period && typeof manifest.Period.BaseURL === 'string') {
        return manifest.Period.BaseURL;
      }

      if (manifest.Period && manifest.Period.BaseURL && typeof manifest.Period.BaseURL.__text === 'string') {
        return manifest.Period.BaseURL.__text;
      }

      if (typeof manifest.BaseURL === 'string') {
        return manifest.BaseURL;
      }

      if (manifest.BaseURL && typeof manifest.BaseURL.__text === 'string') {
        return manifest.BaseURL.__text;
      }
    }

    function generateBaseUrls (manifest, sources) {
      var baseUrl = extractBaseUrl(manifest);
      var baseUrls = [];
      if (!baseUrl) return;

      function generateBaseUrl (source, priority, serviceLocation) {
        return {
          __text: source,
          'dvb:priority': priority,
          serviceLocation: serviceLocation
        };
      }

      if (baseUrl.match(/^https?:\/\//)) {
        var newBaseUrl = generateBaseUrl(baseUrl, 0, sources[0]);
        baseUrls = [newBaseUrl];

        if (manifest && (manifest.BaseURL || manifest.Period && manifest.Period.BaseURL)) {
          manifest.BaseURL = newBaseUrl;
        }
      } else {
        baseUrls = sources.map(function (source, priority) {
          var sourceUrl = new URL(baseUrl, source);
          return generateBaseUrl(sourceUrl.href, priority, source);
        });
      }

      manifest.BaseURL_asArray = baseUrls;
      if (manifest && manifest.Period && manifest.Period.BaseURL) delete manifest.Period.BaseURL;
      if (manifest && manifest.Period && manifest.Period.BaseURL_asArray) delete manifest.Period.BaseURL_asArray;
    }

    function rewriteDashCodec (manifest) {
      var periods = manifest.Period_asArray || [manifest.Period];
      if (periods) {
        for (var i = 0; i < periods.length; i++) {
          var sets = periods[i].AdaptationSet_asArray || periods[i].AdaptationSet;
          if (sets) {
            for (var j = 0; j < sets.length; j++) {
              var representations = sets[j].Representation_asArray || [sets[j].Representation];
              if (representations) {
                for (var k = 0; k < representations.length; k++) {
                  var rep = representations[k];
                  if (rep.mimeType === 'video/mp4') {
                    rep.codecs = rep.codecs.replace('avc3', 'avc1');
                  }
                }
              }
            }
          }
        }
      }
      return manifest;
    }

    return {
      filter: filter,
      extractBaseUrl: extractBaseUrl,
      generateBaseUrls: generateBaseUrls
    };
  });
