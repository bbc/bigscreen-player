define('bigscreenplayer/subtitles/timedtext',
  [
    'bigscreenplayer/domhelpers'
  ],
  function (DOMHelpers) {
    'use strict';

    return function (timedTextNode, toStyleFunc) {
      var timings = parseTimings(timedTextNode);
      var start = timings.start;
      var end = timings.end;
      var _node = timedTextNode;
      var htmlElementNode;

      function parseTimings (timedTextNode) {
        if (hasNestedTime(timedTextNode)) {
          return parseNestedTime(timedTextNode);
        } else {
          return {
            start: timeStampToSeconds(timedTextNode.getAttribute('begin')),
            end: timeStampToSeconds(timedTextNode.getAttribute('end'))
          };
        }

        function hasNestedTime (timedTextNode) {
          if (!timedTextNode.getAttribute('begin') || !timedTextNode.getAttribute('end')) return true;
        }

        function parseNestedTime (timedTextNode) {
          var earliestStart;
          var latestEnd;
          for (var i = 0; i < timedTextNode.childNodes.length; i++) {
            var childNodeTime = {};
            childNodeTime.start = timedTextNode.childNodes[i].getAttribute('begin') ? timeStampToSeconds(timedTextNode.childNodes[i].getAttribute('begin')) : null;
            childNodeTime.end = timedTextNode.childNodes[i].getAttribute('end') ? timeStampToSeconds(timedTextNode.childNodes[i].getAttribute('end')) : null;
            if (childNodeTime.start && childNodeTime.end) {
              if (earliestStart === undefined || childNodeTime.start < earliestStart) {
                earliestStart = childNodeTime.start;
              }
              if (latestEnd === undefined || childNodeTime.end > latestEnd) {
                latestEnd = childNodeTime.end;
              }
            }
          }

          if (earliestStart && latestEnd) {
            return {
              start: earliestStart,
              end: latestEnd
            };
          }
        }
      }

      function timeStampToSeconds (timeStamp) {
        var timePieces = timeStamp.split(':');
        var timeSeconds = parseFloat(timePieces.pop(), 10);
        if (timePieces.length) {
          timeSeconds += 60 * parseInt(timePieces.pop(), 10);
        }
        if (timePieces.length) {
          timeSeconds += 60 * 60 * parseInt(timePieces.pop(), 10);
        }
        return timeSeconds;
      }

      function removeFromDomIfExpired (time) {
        if (time > end || time < start) {
          DOMHelpers.safeRemoveElement(htmlElementNode);
          return true;
        }
        return false;
      }

      function addToDom (parentNode) {
        var node = htmlElementNode || generateHtmlElementNode();
        parentNode.appendChild(node);
      }

      function generateHtmlElementNode (node) {
        var source = node || _node;

        var localName = source.localName || source.tagName;
        var html = document.createElement(localName);
        var style = toStyleFunc(source);
        if (style) {
          html.setAttribute('style', style);
          html.style.cssText = style;
        }

        if (localName === 'p') {
          html.style.margin = '0px';
        }

        for (var i = 0, j = source.childNodes.length; i < j; i++) {
          var n = source.childNodes[i];
          if (n.nodeType === 3) {
            html.appendChild(document.createTextNode(n.data));
          } else if (n.nodeType === 1) {
            html.appendChild(generateHtmlElementNode(n));
          }
        }
        if (!node) {
          htmlElementNode = html;
        }

        return html;
      }

      return {
        start: start,
        end: end,
        addToDom: addToDom,
        removeFromDomIfExpired: removeFromDomIfExpired
      };
    };
  });
