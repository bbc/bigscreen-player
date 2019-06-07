import Native from "./nativestrategy";
import MSE from "./msestrategy";
import StrategyPicker from "./strategypicker";
import LiveSupport from "../models/livesupport";
var HybridStrategy = function(
  windowType,
  mediaKind,
  timeCorrection,
  videoElement,
  isUHD,
  device,
  cdnDebugOutput
) {
  var strategy = StrategyPicker(windowType, isUHD);

  if (strategy === "mseStrategy") {
    return MSE(
      windowType,
      mediaKind,
      timeCorrection,
      videoElement,
      isUHD,
      device,
      cdnDebugOutput
    );
  }

  return Native(
    windowType,
    mediaKind,
    timeCorrection,
    videoElement,
    isUHD,
    device,
    cdnDebugOutput
  );
};

HybridStrategy.getLiveSupport = function() {
  return LiveSupport.SEEKABLE;
};

export default HybridStrategy;
