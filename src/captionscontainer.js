import Captions from "./captions";
import TransportControlPosition from "./models/transportcontrolposition";
import DOMHelpers from "./domhelpers";

export default function(mediaPlayer, captionsURL, autoStart, parentElement) {
  var container = document.createElement("div");
  var captions;

  container.id = "playerCaptionsContainer";
  DOMHelpers.addClass(container, "playerCaptions");

  if (captionsURL) {
    captions = new Captions(
      "playerCaptions",
      captionsURL,
      mediaPlayer,
      container
    );
    container.appendChild(captions.render());
  }

  parentElement.appendChild(container);

  if (autoStart) {
    start();
  }

  function start() {
    if (captions) {
      captions.start();
    }
  }

  function stop() {
    if (captions) {
      captions.stop();
    }
  }

  function updatePosition(transportControlPosition) {
    var classes = {
      controlsVisible: TransportControlPosition.CONTROLS_ONLY,
      controlsWithInfoVisible: TransportControlPosition.CONTROLS_WITH_INFO,
      leftCarouselVisible: TransportControlPosition.LEFT_CAROUSEL,
      bottomCarouselVisible: TransportControlPosition.BOTTOM_CAROUSEL
    };

    for (var cssClassName in classes) {
      if (classes.hasOwnProperty(cssClassName)) {
        // Allow multiple flags to be set at once
        if (
          (classes[cssClassName] & transportControlPosition) ===
          classes[cssClassName]
        ) {
          DOMHelpers.addClass(container, cssClassName);
        } else {
          DOMHelpers.removeClass(container, cssClassName);
        }
      }
    }
  }

  function tearDown() {
    if (container) {
      parentElement.removeChild(container);
    }
  }

  return {
    start: start,
    stop: stop,
    updatePosition: updatePosition,
    tearDown: tearDown
  };
}
