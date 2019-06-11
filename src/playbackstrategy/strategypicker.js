export default function(windowType, isUHD) {
  var strategy = "mseStrategy";

  var mseExceptions = window.bigscreenPlayer.mseExceptions || [];

  if (mseExceptions.indexOf(windowType) !== -1) {
    strategy = "talStrategy";
  }

  if (isUHD && mseExceptions.indexOf("uhd") !== -1) {
    strategy = "talStrategy";
  }

  return strategy;
}
