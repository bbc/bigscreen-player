define('bigscreenplayer/mediasources',
  [
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/plugins',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/plugindata',
    'bigscreenplayer/debugger/debugtool'
  ],
function (PlaybackUtils, WindowTypes, LiveSupport, TransferFormats, Plugins, PluginEnums, PluginData, DebugTool) {
  var mediaSources;
  var initialUrl;
  'use strict';

  function failover (postFailoverAction, failoverErrorAction, failoverInfo) {
    if (hasSourcesToFailoverTo() && isFailoverInfoValid(failoverInfo)) {
      emitCdnFailover(failoverInfo);
      updateCdns();
      updateDebugOutput();
      postFailoverAction();
    } else {
      failoverErrorAction();
    }
  }

  function isFailoverInfoValid (failoverInfo) {
    var infoValid = typeof failoverInfo === 'object' &&
                    typeof failoverInfo.errorMessage === 'string' &&
                    typeof failoverInfo.isBufferingTimeoutError === 'boolean';

    if (!infoValid) {
      DebugTool.info('failoverInfo is not valid');
    }

    return infoValid;
  }

  function updateCdns () {
    if (hasSourcesToFailoverTo()) {
      mediaSources.shift();
    }
  }

  function hasSourcesToFailoverTo () {
    return mediaSources.length > 1;
  }

  function emitCdnFailover (failoverInfo) {
    var evt = new PluginData({
      status: PluginEnums.STATUS.FAILOVER,
      stateType: PluginEnums.TYPE.ERROR,
      properties: {error_mssg: failoverInfo.errorMessage},
      isBufferingTimeoutError: failoverInfo.isBufferingTimeoutError,
      cdn: mediaSources[0].cdn,
      newCdn: mediaSources[1].cdn
    });
    Plugins.interface.onErrorHandled(evt);
  }

  function getCurrentUrl () {
    if (mediaSources.length > 0) {
      return mediaSources[0].url.toString();
    }

    return '';
  }

  function getCurrentCdn () {
    if (mediaSources.length > 0) {
      return mediaSources[0].cdn.toString();
    }

    return '';
  }

  function availableUrls () {
    return mediaSources.map(function (mediaSource) {
      return mediaSource.url;
    });
  }

  function availableCdns () {
    return mediaSources.map(function (mediaSource) {
      return mediaSource.cdn;
    });
  }

  function isFirstSource (url) {
    return url === initialUrl;
  }

  function shouldFailover (duration, currentTime, liveSupport, windowType, transferFormat) {
    var aboutToEnd = duration && currentTime > duration - 5;
    var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
    var shouldLiveFailover = windowType !== WindowTypes.STATIC && (transferFormat === TransferFormats.DASH || liveSupport !== LiveSupport.RESTARTABLE);
    return hasSourcesToFailoverTo() && (shouldStaticFailover || shouldLiveFailover);
  }

  function updateDebugOutput () {
    DebugTool.keyValue({key: 'available cdns', value: availableCdns()});
    DebugTool.keyValue({key: 'current cdn', value: getCurrentCdn()});
    DebugTool.keyValue({key: 'url', value: getCurrentUrl()});
  }

  // Constructor
  return function (urls) {
    if (urls === undefined || urls.length === 0) throw new Error('Media Sources urls are undefined');

    initialUrl = urls.length > 0 ? urls[0].url : '';
    mediaSources = PlaybackUtils.cloneArray(urls);
    updateDebugOutput();

    return {
      failover: failover,
      shouldFailover: shouldFailover,
      currentSource: getCurrentUrl,
      availableSources: availableUrls,
      isFirstSource: isFirstSource
    };
  };
}
);

