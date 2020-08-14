define('bigscreenplayer/subtitles/subtitlestransformer',
  [
    'bigscreenplayer/subtitles/timedtext',
    'bigscreenplayer/domhelpers'
  ],
  function (TimedText, DOMHelpers) {
    'use strict';
    return function () {
      var _styles = {};
      var elementToStyleMap = [
        {
          attribute: 'tts:color',
          property: 'color'
        }, {
          attribute: 'tts:backgroundColor',
          property: 'background-color'
        }, {
          attribute: 'tts:fontStyle',
          property: 'font-style'
        }, {
          attribute: 'tts:textAlign',
          property: 'text-align'
        }
      ];

      function isEBUDistribution (metadata) {
        return metadata === 'urn:ebu:tt:distribution:2014-01' || metadata === 'urn:ebu:tt:distribution:2018-04';
      }

      function rgbWithOpacity (value) {
        if (DOMHelpers.isRGBA(value)) {
          var opacity = parseInt(value.slice(7, 9), 16) / 255;
          if (isNaN(opacity)) {
            opacity = 1.0;
          }
          value = DOMHelpers.rgbaToRGB(value);
          value += '; opacity: ' + opacity + ';';
        }
        return value;
      }

      function elementToStyle (el) {
        var stringStyle = '';
        var styles = _styles;
        var inherit = el.getAttribute('style');
        if (inherit) {
          if (styles[inherit]) {
            stringStyle = styles[inherit];
          } else {
            return false;
          }
        }
        for (var i = 0, j = elementToStyleMap.length; i < j; i++) {
          var map = elementToStyleMap[i];
          var value = el.getAttribute(map.attribute);
          if (value === null || value === undefined) {
            continue;
          }
          if (map.conversion) {
            value = map.conversion(value);
          }

          if (map.attribute === 'tts:backgroundColor') {
            value = rgbWithOpacity(value);
            value += ' 2px 2px 1px';
          }

          if (map.attribute === 'tts:color') {
            value = rgbWithOpacity(value);
          }

          stringStyle += map.property + ': ' + value + '; ';
        }

        return stringStyle;
      }

      function transformXML (xml) {
        // Use .getElementsByTagNameNS() when parsing XML as some implementations of .getElementsByTagName() will lowercase its argument before proceding
        var conformsToStandardElements = Array.prototype.slice.call(xml.getElementsByTagNameNS('urn:ebu:tt:metadata', 'conformsToStandard'));
        var isEBUTTD = conformsToStandardElements && conformsToStandardElements.some(function (node) {
          return isEBUDistribution(node.textContent);
        });

        var captionValues = {
          ttml: {
            namespace: 'http://www.w3.org/2006/10/ttaf1',
            idAttribute: 'id'
          },
          ebuttd: {
            namespace: 'http://www.w3.org/ns/ttml',
            idAttribute: 'xml:id'
          }
        };

        var captionStandard = isEBUTTD ? captionValues.ebuttd : captionValues.ttml;
        var styles = _styles;
        var styleElements = xml.getElementsByTagNameNS(captionStandard.namespace, 'style');

        var max = styleElements.length;
        // We should get at least one each time. If we don't, then the data
        // is broken or structured in a way this can't cope with.
        // This prevents an infinite loop.
        var seenNonOk = false;
        do {
          for (var i = 0, j = styleElements.length; i < j; i++) {
            var se = styleElements[i];
            if (se.ok) {
              continue;
            }

            var id = se.getAttribute(captionStandard.idAttribute);
            var myStyles = elementToStyle(se);

            if (myStyles) {
              styles[id] = myStyles;
              se.ok = true;
            } else {
              seenNonOk = true;
            }
          }
        } while (seenNonOk && max--);

        var body = xml.getElementsByTagNameNS(captionStandard.namespace, 'body')[0];
        var s = elementToStyle(body);
        var ps = xml.getElementsByTagNameNS(captionStandard.namespace, 'p');
        var items = [];

        for (var k = 0, m = ps.length; k < m; k++) {
          items.push(TimedText(ps[k], elementToStyle));
        }

        return {
          subtitles: items,
          baseStyle: s
        };
      }

      return {
        transformXML: transformXML
      };
    };
  }
);
