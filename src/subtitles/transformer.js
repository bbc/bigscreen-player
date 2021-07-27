import TimedText from './subtitles/timedtext';
import DOMHelpers from './domhelpers';
import Plugins from './plugins';
import DebugTool from './debugger/debugtool';

export default function () {
  var _styles = {};
  var elementToStyleMap = [
    {
      attribute: 'tts:color',
      property: 'color'
    }, {
      attribute: 'tts:backgroundColor',
      property: 'text-shadow'
    }, {
      attribute: 'tts:fontStyle',
      property: 'font-style'
    }, {
      attribute: 'tts:textAlign',
      property: 'text-align'
    }
  ];

  /**
  * Safely checks if an attribute exists on an element.
  * Browsers < DOM Level 2 do not have 'hasAttribute'
  *
  * The interesting case - can be null when it isn't there or "", but then can also return "" when there is an attribute with no value.
  * For subs this is good enough. There should not be attributes without values.
  * @param {Element} el HTML Element
  * @param {String} attribute attribute to check for
  */
  var hasAttribute = function (el, attribute) {
    return !!el.getAttribute(attribute);
  };

  function hasNestedTime (element) {
    return (!hasAttribute(element, 'begin') || !hasAttribute(element, 'end'));
  }

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
    try {
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

      for (var i = 0; i < styleElements.length; i++) {
        var se = styleElements[i];
        var id = se.getAttribute(captionStandard.idAttribute);
        var style = elementToStyle(se);

        if (style) {
          styles[id] = style;
        }
      }

      var body = xml.getElementsByTagNameNS(captionStandard.namespace, 'body')[0];
      var s = elementToStyle(body);
      var ps = xml.getElementsByTagNameNS(captionStandard.namespace, 'p');
      var items = [];

      for (var k = 0, m = ps.length; k < m; k++) {
        if (hasNestedTime(ps[k])) {
          var tag = ps[k];
          for (var index = 0; index < tag.childNodes.length; index++) {
            if (hasAttribute(tag.childNodes[index], 'begin') && hasAttribute(tag.childNodes[index], 'end')) {
              // TODO: rather than pass a function, can't we make timedText look after it's style from this point?
              items.push(TimedText(tag.childNodes[index], elementToStyle));
            }
          }
        } else {
          items.push(TimedText(ps[k], elementToStyle));
        }
      }

      return {
        baseStyle: s,
        subtitlesForTime: function (time) {
          return items.filter(function (subtitle) {
            return subtitle.start < time && subtitle.end > time;
          });
        }
      };
    } catch (e) {
      DebugTool.info('Error transforming captions : ' + e);
      Plugins.interface.onSubtitlesTransformError();
    }
  }

  return {
    transformXML: transformXML
  };
}
