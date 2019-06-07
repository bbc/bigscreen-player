import DebugTool from "./debugger/debugtool";

var elementToStyleMap = [
  {
    attribute: "tts:color",
    property: "color"
  },
  {
    attribute: "tts:backgroundColor",
    property: "text-shadow"
  },
  {
    attribute: "tts:fontStyle",
    property: "font-style"
  },
  {
    attribute: "tts:textAlign",
    property: "text-align"
  }
];

var Captions = function(id, uri, media) {
  var timedItems = [];
  var liveItems = [];
  var iterator = 0;
  var _styles = {};
  var lastTimeSeen = 0;
  var interval = 0;
  var outputElement;

  loadData(uri);

  function loadData(dataFeedUrl) {
    var req = new XMLHttpRequest();

    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        req.onreadystatechange = null;
        if (req.status >= 200 && req.status < 300) {
          if (req.responseXML) {
            try {
              transformXML(req.responseXML);
            } catch (e) {
              DebugTool.info("Error transforming captions response: " + e);
            }
          }
        } else {
          DebugTool.info(
            "Response Code " +
              req.status +
              "; Error loading captions data: " +
              req.responseText
          );
        }
      }
    };

    try {
      req.open("GET", dataFeedUrl, true);
      req.send(null);
    } catch (e) {
      DebugTool.info("Error transforming captions response: " + e);
    }
  }

  function render() {
    if (!outputElement) {
      outputElement = document.createElement("div");
      outputElement.id = id;
    }

    return outputElement;
  }

  function start() {
    interval = setInterval(function() {
      update();
    }, 750);

    if (outputElement) {
      outputElement.style.display = "block";
    }
  }

  function stop() {
    if (outputElement) {
      outputElement.style.display = "none";
    }

    cleanOldCaptions(media.getDuration());
    clearInterval(interval);
  }

  function update() {
    if (!media) {
      stop();
    }

    var time = media.getCurrentTime();
    updateCaptions(time);
  }

  function transformXML(xml) {
    // Use .getElementsByTagNameNS() when parsing XML as some implementations of .getElementsByTagName() will lowercase its argument before proceding
    var conformsToStandardElements = xml.getElementsByTagNameNS(
      "urn:ebu:tt:metadata",
      "conformsToStandard"
    )[0];
    var isEBUTTD =
      conformsToStandardElements &&
      conformsToStandardElements.textContent ===
        "urn:ebu:tt:distribution:2014-01";

    var captionValues = {
      ttml: {
        namespace: "http://www.w3.org/2006/10/ttaf1",
        idAttribute: "id"
      },
      ebuttd: {
        namespace: "http://www.w3.org/ns/ttml",
        idAttribute: "xml:id"
      }
    };

    var captionStandard = isEBUTTD ? captionValues.ebuttd : captionValues.ttml;
    var styles = _styles;
    var styleElements = xml.getElementsByTagNameNS(
      captionStandard.namespace,
      "style"
    );

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

    var body = xml.getElementsByTagNameNS(captionStandard.namespace, "body")[0];
    var s = elementToStyle(body);
    var d = document.createElement("div");
    d.setAttribute("style", s);
    d.style.cssText = s;

    if (!outputElement) {
      outputElement = document.createElement("div");
      outputElement.id = id;
    }

    outputElement.appendChild(d);
    outputElement = d;

    var ps = xml.getElementsByTagNameNS(captionStandard.namespace, "p");
    var items = [];

    for (var k = 0, m = ps.length; k < m; k++) {
      items.push(TimedPiece(ps[k], elementToStyle));
    }

    timedItems = items;
    liveItems = [];
    return items;
  }

  function elementToStyle(el) {
    var stringStyle = "";
    var styles = _styles;
    var inherit = el.getAttribute("style");
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
      if (map.attribute === "tts:backgroundColor") {
        value += " 2px 2px 1px";
      }

      stringStyle += map.property + ": " + value + "; ";
    }

    return stringStyle;
  }

  function groupUnseenFor(time) {
    // Basic approach first.
    // TODO - seek backwards and do fast seeking if long timestamp
    // differences. Also add a cache for last timestamp seen. If next time is older, reset.
    var it;
    if (time < lastTimeSeen) {
      it = 0;
    } else {
      it = iterator || 0;
    }
    lastTimeSeen = time;
    var itms = timedItems;
    var max = itms.length;

    // The current iterated item was not returned last time.
    // If its time has not come, we return nothing.
    var ready = [];
    var itm = itms[it];
    while (it !== max && itm.start < time) {
      if (itm.end > time) {
        ready.push(itm);
      }
      it++;
      itm = itms[it];
    }
    iterator = it;

    return ready;
  }

  function updateCaptions(time) {
    // Clear out old captions
    cleanOldCaptions(time);
    // Add new captions
    addNewCaptions(time);
  }

  function cleanOldCaptions(time) {
    var live = liveItems;
    for (var i = live.length - 1; i >= 0; i--) {
      if (live[i].removeFromDomIfExpired(time)) {
        live.splice(i, 1);
      }
    }
  }

  function addNewCaptions(time) {
    var live = liveItems;
    var fresh = groupUnseenFor(time);
    liveItems = live.concat(fresh);
    for (var i = 0, j = fresh.length; i < j; i++) {
      fresh[i].addToDom(outputElement);
    }
  }

  return {
    render: render,
    start: start,
    stop: stop,
    update: update,
    loadData: loadData,
    transformXML: transformXML,
    elementToStyle: elementToStyle,
    groupUnseenFor: groupUnseenFor,
    updateCaptions: updateCaptions,
    cleanOldCaptions: cleanOldCaptions,
    addNewCaptions: addNewCaptions
  };
};

var TimedPiece = function(timedPieceNode, toStyleFunc) {
  var start = timeStampToSeconds(timedPieceNode.getAttribute("begin"));
  var end = timeStampToSeconds(timedPieceNode.getAttribute("end"));
  var _node = timedPieceNode;
  var htmlElementNode;

  function timeStampToSeconds(timeStamp) {
    var timePieces = timeStamp.split(":");
    var timeSeconds = parseFloat(timePieces.pop(), 10);
    if (timePieces.length) {
      timeSeconds += 60 * parseInt(timePieces.pop(), 10);
    }
    if (timePieces.length) {
      timeSeconds += 60 * 60 * parseInt(timePieces.pop(), 10);
    }
    return timeSeconds;
  }

  function removeFromDomIfExpired(time) {
    if (time > end || time < start) {
      if (htmlElementNode) {
        var e = htmlElementNode;
        if (e.parentNode) {
          e.parentNode.removeChild(e);
        }
      }
      return true;
    }
    return false;
  }

  function addToDom(parentNode) {
    var node = htmlElementNode || generateHtmlElementNode();
    parentNode.appendChild(node);
  }

  function generateHtmlElementNode(node) {
    var source = node || _node;

    var localName = source.localName || source.tagName;
    var html = document.createElement(localName);
    var style = toStyleFunc(source);
    if (style) {
      html.setAttribute("style", style);
      html.style.cssText = style;
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
    node: timedPieceNode,
    start: start,
    end: end,

    timeStampToSeconds: timeStampToSeconds,
    removeFromDomIfExpired: removeFromDomIfExpired,
    addToDom: addToDom,
    generateHtmlElementNode: generateHtmlElementNode
  };
};

export default Captions;
