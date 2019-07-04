define('bigscreenplayer/mediasources',
  [
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats'
  ],
function (PlaybackUtils, WindowTypes, LiveSupport, TransferFormats) {
  var mediaSources;
  'use strict';

  // remove the failing CDN
  // Make the new point of truth the new CDN
  // Report to the debug tool, plugins and any other logging.
  function failover (postFailoverAction, failoverErrorAction) {
    updateCdns();
    emitCdnFailover();
    cdnLog();

    if (hasMoreCdns()) {
      postFailoverAction();
    } else {
      failoverErrorAction();
    }
  }

    // When we know we're failing over from a CDN, the point of truth needs updating somehow.
  function updateCdns () {
    if (hasMoreCdns()) {
      mediaSources.shift();
    }
  }

  function hasMoreCdns () {
    return mediaSources.length > 0;
  }

  // Fire off to the plugins
  function emitCdnFailover () {

  }

  // Log any output
  function cdnLog () {

  }

  function getCurrentUrl () {
    if (hasMoreCdns()) {
      return mediaSources[0].url.toString();
    }

    return '';
  }

  function availableUrls () {
    return mediaSources.map(function (mediaSource) {
      return mediaSource.url;
    });
  }

  function shouldFailover (duration, currentTime, liveSupport, windowType, transferFormat) {
    var aboutToEnd = duration && currentTime > duration - 5;
    var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
    var shouldLiveFailover = windowType !== WindowTypes.STATIC && (transferFormat === TransferFormats.DASH || liveSupport !== LiveSupport.RESTARTABLE);
    return mediaSources.length > 1 && (shouldStaticFailover || shouldLiveFailover);
  }

  // Constructor
  return function (urls) {
    mediaSources = PlaybackUtils.cloneArray(urls);

    return {
      failover: failover,
      shouldFailover: shouldFailover,
      currentSource: getCurrentUrl,
      availableSources: availableUrls
    };
  };
}
);

