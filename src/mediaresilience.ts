import WindowTypes from "./models/windowtypes";
import LiveSupport from "./models/livesupport";
import TransferFormats from "./models/transferformats";

function shouldFailover(
  remainingUrls,
  duration,
  currentTime,
  liveSupport,
  windowType,
  transferFormat
) {
  var aboutToEnd = duration && currentTime > duration - 5;
  var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
  var shouldLiveFailover =
    windowType !== WindowTypes.STATIC &&
    (transferFormat === TransferFormats.DASH ||
      liveSupport !== LiveSupport.RESTARTABLE);
  return remainingUrls > 1 && (shouldStaticFailover || shouldLiveFailover);
}

export default {
  shouldFailover: shouldFailover
};
