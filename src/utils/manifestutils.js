import WindowTypes from "../models/windowtypes";

function needToGetManifest(windowType, liveSupport) {
  var requiresSeekingData = {
    restartable: true,
    seekable: true,
    playable: false,
    none: false
  };

  return windowType !== WindowTypes.STATIC && requiresSeekingData[liveSupport];
}

export default {
  needToGetManifest: needToGetManifest
};
