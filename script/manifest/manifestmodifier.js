define('bigscreenplayer/manifest/manifestmodifier',
  [
    'bigscreenplayer/debugger/debugtool'
  ],
  function (DebugTool) {
    'use strict';

    function filter (manifest, representationOptions) {
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

    return {
      filter: filter,
      extractBaseUrl: extractBaseUrl,
      generateBaseUrls: generateBaseUrls
    };
  });
