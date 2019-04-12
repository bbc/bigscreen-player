define('bigscreenplayer/parsers/manifestfilter',
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

    return {
      filter: filter
    };
  });
