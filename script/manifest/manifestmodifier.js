define('bigscreenplayer/manifest/manifestmodifier',
  function () {
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
      return manifest.Period && manifest.Period.BaseURL || manifest.BaseURL && manifest.BaseURL.__text;
    }

    function generateBaseUrls (manifest, sources) {
      var baseUrl = extractBaseUrl(manifest);
      if (!baseUrl || baseUrl.match(/^https?:\/\//)) return;

      var baseUrls = sources.map(function (source, priority) {
        var sourceUrl = new URL(baseUrl, source.url);
        return {
          __text: sourceUrl.href,
          'dvb:priority': priority,
          serviceLocation: source.cdn
        };
      });

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
