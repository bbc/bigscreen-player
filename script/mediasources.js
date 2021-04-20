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
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/models/livesupport'
  ],
  function (PlaybackUtils, WindowTypes, Plugins, PluginEnums, PluginData, DebugTool, ManifestLoader, PlaybackStrategy, TransferFormats, LiveSupport) {
    'use strict';
    return function () {
      var mediaSources;
      var windowType;
      var liveSupport;
      var serverDate;
      var time = {};
      var transferFormat;
      var subtitlesSources;
      // Default 5000 can be overridden with media.subtitlesRequestTimeout
      var subtitlesRequestTimeout = 5000;

      function init (media, newServerDate, newWindowType, newLiveSupport, callbacks) {
        if (media.urls === undefined || media.urls.length === 0) {
          throw new Error('Media Sources urls are undefined');
        }

        if (callbacks === undefined ||
          callbacks.onSuccess === undefined ||
          callbacks.onError === undefined) {
          throw new Error('Media Sources callbacks are undefined');
        }

        if (media.subtitlesRequestTimeout) {
          subtitlesRequestTimeout = media.subtitlesRequestTimeout;
        }

        windowType = newWindowType;
        liveSupport = newLiveSupport;
        serverDate = newServerDate;
        mediaSources = media.urls ? PlaybackUtils.cloneArray(media.urls) : [];
        subtitlesSources = media.captions ? PlaybackUtils.cloneArray(media.captions) : [];

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

      function failoverSubtitles (postFailoverAction, failoverErrorAction) {
        if (subtitlesSources.length > 1) {
          subtitlesSources.shift();
          updateDebugOutput();
          if (postFailoverAction) { postFailoverAction(); }
        } else {
          if (failoverErrorAction) { failoverErrorAction(); }
        }
      }

      function shouldFailover (failoverParams) {
        if (isFirstManifest(failoverParams.serviceLocation)) {
          return false;
        }
        var aboutToEnd = failoverParams.duration && failoverParams.currentTime > failoverParams.duration - 5;
        var shouldStaticFailover = windowType === WindowTypes.STATIC && !aboutToEnd;
        var shouldLiveFailover = windowType !== WindowTypes.STATIC;
        return isFailoverInfoValid(failoverParams) && hasSourcesToFailoverTo() && (shouldStaticFailover || shouldLiveFailover);
      }

      function stripQueryParamsAndHash (url) {
        return typeof (url) === 'string' ? url.split(/[?#]/)[0] : url;
      }

      // we don't want to failover on the first playback
      // the serviceLocation is set to our first cdn url
      // see manifest modifier - generateBaseUrls
      function isFirstManifest (serviceLocation) {
        // Matches anything between *:// and / or the end of the line
        var hostRegex = /\w+?:\/\/(.*?)(?:\/|$)/;

        var serviceLocNoQueryHash = stripQueryParamsAndHash(serviceLocation);
        var currUrlNoQueryHash = stripQueryParamsAndHash(getCurrentUrl());

        var serviceLocationHost = hostRegex.exec(serviceLocNoQueryHash);
        var currentUrlHost = hostRegex.exec(currUrlNoQueryHash);

        return serviceLocationHost && currentUrlHost
          ? serviceLocationHost[1] === currentUrlHost[1]
          : serviceLocNoQueryHash === currUrlNoQueryHash;
      }

      function isFailoverInfoValid (failoverParams) {
        var infoValid = typeof failoverParams === 'object' &&
                    typeof failoverParams.errorMessage === 'string' &&
                    typeof failoverParams.isBufferingTimeoutError === 'boolean';

        if (!infoValid) {
          DebugTool.error('failoverInfo is not valid');
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

      function getCurrentSubtitlesUrl () {
        if (subtitlesSources.length > 0) {
          return subtitlesSources[0].url.toString();
        }

        return '';
      }

      function getCurrentSubtitlesSegmentLength () {
        if (subtitlesSources.length > 0) {
          return subtitlesSources[0].segmentLength;
        }

        return undefined;
      }

      function getSubtitlesRequestTimeout () {
        return subtitlesRequestTimeout;
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
          isBufferingTimeoutError: failoverInfo.isBufferingTimeoutError,
          cdn: mediaSources[0].cdn,
          newCdn: mediaSources[1].cdn
        });
        Plugins.interface.onErrorHandled(evt);
      }

      function availableCdns () {
        return mediaSources.map(function (mediaSource) {
          return mediaSource.cdn;
        });
      }

      function availableSubtitlesCdns () {
        return subtitlesSources.map(function (subtitleSource) {
          return subtitleSource.cdn;
        });
      }

      function updateDebugOutput () {
        DebugTool.keyValue({key: 'available cdns', value: availableCdns()});
        DebugTool.keyValue({key: 'url', value: getCurrentUrl()});

        DebugTool.keyValue({key: 'available subtitle cdns', value: availableSubtitlesCdns()});
        DebugTool.keyValue({key: 'subtitles url', value: getCurrentSubtitlesUrl()});
      }

      return {
        init: init,
        failover: failover,
        failoverSubtitles: failoverSubtitles,
        refresh: refresh,
        currentSource: getCurrentUrl,
        currentSubtitlesSource: getCurrentSubtitlesUrl,
        currentSubtitlesSegmentLength: getCurrentSubtitlesSegmentLength,
        subtitlesRequestTimeout: getSubtitlesRequestTimeout,
        availableSources: availableUrls,
        time: generateTime
      };
    };
  });
