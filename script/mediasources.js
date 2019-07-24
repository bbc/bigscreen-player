define('bigscreenplayer/mediasources',
  [
    'bigscreenplayer/utils/playbackutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/plugins',
    'bigscreenplayer/pluginenums',
    'bigscreenplayer/plugindata',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/manifest/manifestloader',
    'bigscreenplayer/models/playbackstrategy',
    'bigscreenplayer/models/transferformats'
  ],
function (PlaybackUtils, WindowTypes, Plugins, PluginEnums, PluginData, DebugTool, ManifestLoader, PlaybackStrategy, TransferFormats) {
  'use strict';
  var mediaSources;
  var windowType;
  var liveSupport;
  var serverDate;
  var time = {};
  var transferFormat;

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
    mediaSources = PlaybackUtils.cloneArray(urls);
    updateDebugOutput();

    if (needToGetManifest(windowType, liveSupport)) {
      loadManifest(serverDate, callbacks);
    } else {
      callbacks.onSuccess();
    }
  }

  function failover (postFailoverAction, failoverErrorAction, failoverParams) {
    if (shouldFailover(failoverParams)) {
      emitCdnFailover(failoverParams);
      updateCdns();
      updateDebugOutput();

      if (needToGetManifest(windowType, liveSupport)) {
        loadManifest(serverDate, { onSuccess: postFailoverAction, onError: failoverErrorAction });
      } else {
        postFailoverAction();
      }
    } else {
      failoverErrorAction();
    }
  }

  function shouldFailover (failoverParams) {
    if (failoverParams.serviceLocation === getCurrentUrl()) {
      return false;
    }

    var aboutToEnd = failoverParams.duration && failoverParams.currentTime > failoverParams.duration - 5;
    var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
    var shouldLiveFailover = windowType !== WindowTypes.STATIC && window.bigscreenPlayer.playbackStrategy !== PlaybackStrategy.TAL;
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

  function needToGetManifest (windowType, liveSupport) {
    var requiresManifestLoad = {
      restartable: true,
      seekable: true,
      playable: false,
      none: false
    };

    var requiredTransferFormat = transferFormat === TransferFormats.HLS || transferFormat === undefined;
    return requiredTransferFormat && windowType !== WindowTypes.STATIC && requiresManifestLoad[liveSupport];
  }

  function refresh (onSuccess, onError) {
    loadManifest(serverDate, {onSuccess: onSuccess, onError: onError});
  }

  function loadManifest (serverDate, callbacks) {
    var onManifestLoadSuccess = function (manifestData) {
      time = manifestData.time;
      transferFormat = manifestData.transferFormat;
      callbacks.onSuccess();
    };

    var failoverError = function () {
      callbacks.onError({error: 'manifest'});
    };

    var onManifestLoadError = function () {
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

  function generateTime () {
    return time;
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

  function getCurrentCdn () {
    if (mediaSources.length > 0) {
      return mediaSources[0].cdn.toString();
    }

    return '';
  }

  function availableCdns () {
    return mediaSources.map(function (mediaSource) {
      return mediaSource.cdn;
    });
  }

  function updateDebugOutput () {
    DebugTool.keyValue({key: 'available cdns', value: availableCdns()});
    DebugTool.keyValue({key: 'current cdn', value: getCurrentCdn()});
    DebugTool.keyValue({key: 'url', value: getCurrentUrl()});
  }

  return function () {
    return {
      init: init,
      failover: failover,
      refresh: refresh,
      currentSource: getCurrentUrl,
      availableSources: availableUrls,
      time: generateTime
    };
  };
});
