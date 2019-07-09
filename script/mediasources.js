define('bigscreenplayer/mediasources',
  [
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/plugins',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/plugindata'
  ],
function (PlaybackUtils, WindowTypes, LiveSupport, TransferFormats, Plugins, PluginEnums, PluginData) {
  var mediaSources;
  'use strict';

  // remove the failing CDN
  // Make the new point of truth the new CDN
  // Report to the debug tool, plugins and any other logging.
  function failover (postFailoverAction, failoverErrorAction, errorProperties, isBufferingTimeoutError) {
    if (hasSourcesToFailoverTo()) {
      emitCdnFailover(errorProperties, isBufferingTimeoutError);
      updateCdns();
      cdnLog();
      postFailoverAction();
    } else {
      failoverErrorAction();
    }
  }

    // When we know we're failing over from a CDN, the point of truth needs updating somehow.
  function updateCdns () {
    if (hasSourcesToFailoverTo()) {
      mediaSources.shift();
    }
  }

  function hasSourcesToFailoverTo () {
    return mediaSources.length > 1;
  }

  // Fire off to the plugins
  function emitCdnFailover (errorProperties, isBufferingTimeoutError) {
    var evt = new PluginData({
      status: PluginEnums.STATUS.FAILOVER,
      stateType: PluginEnums.TYPE.ERROR,
      properties: errorProperties,
      isBufferingTimeoutError: isBufferingTimeoutError,
      cdn: mediaSources[0].cdn,
      newCdn: mediaSources[1].cdn
    });
    Plugins.interface.onErrorHandled(evt);
  }

  // Log any output
  function cdnLog () {

  }

  function getCurrentUrl () {
    if (mediaSources.length > 0) {
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
    return hasSourcesToFailoverTo() && (shouldStaticFailover || shouldLiveFailover);
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

