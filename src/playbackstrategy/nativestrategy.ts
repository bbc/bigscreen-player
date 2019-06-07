import LegacyAdapter from "./legacyplayeradapter";
import WindowTypes from "../models/windowtypes";
import Html5Player from "./modifiers/html5";

let LivePlayer;
import(
  `./modifiers/live/${window.bigscreenPlayer.liveSupport || "playable"}`
).then(({ default: lp }) => (LivePlayer = lp));

var NativeStrategy = function(
  windowType,
  mediaKind,
  timeData,
  playbackElement,
  isUHD,
  device
) {
  var mediaPlayer;
  var logger = device.getLogger();
  var tempConfig = device.getConfig();

  if (windowType !== WindowTypes.STATIC) {
    mediaPlayer = LivePlayer(tempConfig, logger);
  } else {
    mediaPlayer = Html5Player(logger);
  }

  return LegacyAdapter(
    windowType,
    mediaKind,
    timeData,
    playbackElement,
    isUHD,
    device.getConfig(),
    mediaPlayer
  );
};

NativeStrategy.getLiveSupport = function() {
  return window.bigscreenPlayer.liveSupport;
};

export default NativeStrategy;
