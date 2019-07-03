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

    function rewriteDashCodec (manifest) {
      var periods = manifest.Period_asArray;
      if (periods) {
        for (var i = 0; i < periods.length; i++) {
          var sets = periods[i].AdaptationSet_asArray;
          if (sets) {
            for (var j = 0; j < sets.length; j++) {
              var representations = sets[j].Representation_asArray;
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
