define('bigscreenplayer/mediasources',
  [
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/plugins',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/plugindata',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/manifest/manifestloader',
    'bigscreenplayer/models/playbackstrategy'
  ],
function (PlaybackUtils, WindowTypes, Plugins, PluginEnums, PluginData, DebugTool, ManifestLoader, PlaybackStrategy) {
  'use strict';
  var mediaSources;
  var windowType;
  var liveSupport;
  var serverDate;
  var initialUrl;
  var time = {};

  function failover (postFailoverAction, failoverErrorAction, failoverParams) {
    function doFailover () {
      emitCdnFailover(failoverParams);
      updateCdns();
      updateDebugOutput();
      postFailoverAction();
    }

    function error () {
      emitCdnFailover(failoverParams);
      updateCdns();
      updateDebugOutput();
      failoverErrorAction();
    }

    if (shouldFailover(failoverParams)) {
      if (needToGetManifest(windowType, liveSupport)) {
        loadManifest(serverDate, { onSuccess: doFailover, onError: error });
      } else {
        doFailover();
      }
    } else {
      failoverErrorAction();
    }
  }

  function shouldFailover (failoverParams) {
    var aboutToEnd = failoverParams.duration && failoverParams.currentTime > failoverParams.duration - 5;
    var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
    var shouldLiveFailover = windowType !== WindowTypes.STATIC && window.bigscreenPlayer.playbackStrategy !== PlaybackStrategy.TAL && !window.bigscreenPlayer.disableLiveFailover;
    return isFailoverInfoValid(failoverParams) && hasSourcesToFailoverTo() && (shouldStaticFailover || shouldLiveFailover);
  }

  function isFailoverInfoValid (failoverParams) {
    var infoValid = typeof failoverParams === 'object' &&
                    typeof failoverParams.errorMessage === 'string' &&
                    typeof failoverParams.isBufferingTimeoutError === 'boolean';

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

  function updateDebugOutput () {
    DebugTool.keyValue({key: 'available cdns', value: availableCdns()});
    DebugTool.keyValue({key: 'current cdn', value: getCurrentCdn()});
    DebugTool.keyValue({key: 'url', value: getCurrentUrl()});
  }

  function needToGetManifest (windowType, liveSupport) {
    var requiresManifestLoad = {
      restartable: true,
      seekable: true,
      playable: false,
      none: false
    };

    return windowType !== WindowTypes.STATIC && requiresManifestLoad[liveSupport];
  }

  function generateTime () {
    return time;
  }

  function loadManifest (serverDate, callbacks) {
    var onManifestLoadSuccess = function (manifestData) {
      time = manifestData.time;
      callbacks.onSuccess();
    };

    var failoverError = function () {
      callbacks.onError({error: 'manifest'});
    };

    var onManifestLoadError = function () {
      emitCdnFailover({errorMessage: 'manifest-load', isBufferingTimeoutError: false});
      updateCdns();
      updateDebugOutput();
      failover(load, failoverError, {errorMessage: 'manifest-load', isBufferingTimeoutError: false});
    };

    function load () {
      ManifestLoader.load(
        getCurrentUrl(),
        serverDate,
        {
          onSuccess: onManifestLoadSuccess,
          onError: onManifestLoadError
        }
      );
    }

    load();
  }

  function init (urls, newServerDate, newWindowType, newLiveSupport, callbacks) {
    if (urls === undefined || urls.length === 0) {
      throw new Error('Media Sources urls are undefined');
    }

    if (callbacks === undefined ||
      callbacks.onSuccess === undefined ||
      callbacks.onError === undefined) {
      throw new Error('Media Sources callbacks are undefined');
    }

    windowType = newWindowType;
    liveSupport = newLiveSupport;
    serverDate = newServerDate;
    initialUrl = urls.length > 0 ? urls[0].url : '';
    mediaSources = PlaybackUtils.cloneArray(urls);
    updateDebugOutput();

    if (needToGetManifest(windowType, liveSupport)) {
      loadManifest(serverDate, callbacks);
    } else {
      callbacks.onSuccess();
    }
  }

  return function () {
    return {
      init: init,
      failover: failover,
      currentSource: getCurrentUrl,
      availableSources: availableUrls,
      isFirstSource: isFirstSource,
      time: generateTime
    };
  };
});
