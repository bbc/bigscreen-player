import LegacyAdapter from "./legacyplayeradapter";
import WindowTypes from "../models/windowtypes";
var TALStrategy = function(
  windowType,
  mediaKind,
  timeData,
  playbackElement,
  isUHD,
  device
) {
  var mediaPlayer;

  if (windowType === WindowTypes.STATIC) {
    mediaPlayer = device.getMediaPlayer();
  } else {
    mediaPlayer = device.getLivePlayer();
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

TALStrategy.getLiveSupport = function(device) {
  return device.getLiveSupport();
};

export default TALStrategy;
