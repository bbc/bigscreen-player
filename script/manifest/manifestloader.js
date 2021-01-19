define(
  'bigscreenplayer/manifest/manifestloader', [
    'bigscreenplayer/manifest/manifestparser',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/utils/loadurl'
  ],
  function (ManifestParser, TransferFormats, LoadUrl) {
    'use strict';

    function retrieveDashManifest (url, dateWithOffset, callbacks) {
      LoadUrl(
        url,
        {
          method: 'GET',
          headers: {},
          timeout: 10000,
          onLoad: function (responseXML, responseText, status) {
            try {
              if (responseXML) {
                callbacks.onSuccess({
                  transferFormat: TransferFormats.DASH,
                  time: ManifestParser.parse(responseXML, 'mpd', dateWithOffset),
                  manifest: responseXML
                });
              } else {
                callbacks.onError('Unable to retrieve DASH XML response');
              }
            } catch (ex) {
              callbacks.onError('Unable to retrieve DASH XML response');
            }
          },
          onError: function () {
            callbacks.onError('Network error: Unable to retrieve DASH manifest');
          }
        }
      );
    }

    function retrieveHLSManifest (url, dateWithOffset, callbacks) {
      LoadUrl(
        url,
        {
          method: 'GET',
          headers: {},
          timeout: 10000,
          onLoad: function (responseXML, responseText) {
            var streamUrl;
            if (responseText) {
              streamUrl = getStreamUrl(responseText);
            }
            if (streamUrl) {
              if (!/^http/.test(streamUrl)) {
                var parts = url.split('/');
                parts.pop();
                parts.push(streamUrl);
                streamUrl = parts.join('/');
              }
              loadLivePlaylist(streamUrl, dateWithOffset, callbacks);
            } else {
              callbacks.onError('Unable to retrieve HLS master playlist');
            }
          },
          onError: function () {
            callbacks.onError('Network error: Unable to retrieve HLS master playlist');
          }
        }
      );
    }

    function loadLivePlaylist (url, dateWithOffset, callbacks) {
      LoadUrl(
        url,
        {
          method: 'GET',
          headers: {},
          timeout: 10000,
          onLoad: function (responseXML, responseText) {
            if (responseText) {
              callbacks.onSuccess({
                transferFormat: TransferFormats.HLS,
                time: ManifestParser.parse(responseText, 'm3u8', dateWithOffset)
              });
            } else {
              callbacks.onError('Unable to retrieve HLS live playlist');
            }
          },
          onError: function () {
            callbacks.onError('Network error: Unable to retrieve HLS live playlist');
          }
        }
      );
    }

    function getStreamUrl (data) {
      var match = /#EXT-X-STREAM-INF:.*[\n\r]+(.*)[\n\r]?/.exec(data);
      if (match) {
        return match[1];
      }
    }

    return {
      load: function (mediaUrl, serverDate, callbacks) {
        if (/\.m3u8($|\?.*$)/.test(mediaUrl)) {
          retrieveHLSManifest(mediaUrl, serverDate, callbacks);
        } else if (/\.mpd($|\?.*$)/.test(mediaUrl)) {
          retrieveDashManifest(mediaUrl, serverDate, callbacks);
        } else {
          callbacks.onError('Invalid media url');
        }
      }
    };
  }
);
