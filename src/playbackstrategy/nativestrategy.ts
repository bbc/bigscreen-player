import LegacyAdapter from "./legacyplayeradapter";
import WindowTypes from "../models/windowtypes";
import Html5Player from "./modifiers/html5";
import LivePlayer from "./modifiers/live/seekable";
// 'bigscreenplayer/playbackstrategy/modifiers/live/' + (window.bigscreenPlayer.liveSupport || 'playable')
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
