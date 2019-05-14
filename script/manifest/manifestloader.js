define(
  'bigscreenplayer/manifest/manifestloader', [
    'bigscreenplayer/manifest/manifestparser',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/utils/loadurl'
  ],
  function (ManifestParser, TransferFormats, LoadUrl) {
    'use strict';

    function filterHLS (urls) {
      var filtered = [];
      for (var i = 0; i < urls.length; i++) {
        var isHLS = /\.m3u8($|\?.*$)/.test(urls[i].url);
        if (isHLS) {
          filtered.push(urls[i].url);
        }
      }
      return filtered;
    }

    function filterDash (urls) {
      var filtered = [];
      for (var i = 0; i < urls.length; i++) {
        var isDash = /\.mpd($|\?.*$)/.test(urls[i].url);
        if (isDash) {
          filtered.push(urls[i].url);
        }
      }
      return filtered;
    }

    function retrieveDashManifest (url, dateWithOffset, callbacks) {
      var xhr = LoadUrl(
        url,
        {
          method: 'GET',
          headers: {},
          timeout: 10000,
          onLoad: function () {
            try {
              if (xhr.responseXML) {
                callbacks.onSuccess({
                  transferFormat: TransferFormats.DASH,
                  time: ManifestParser.parse(xhr.responseXML, 'mpd', dateWithOffset)
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
          onLoad: function (responseText) {
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
          onLoad: function (responseText) {
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
      load: function (mediaUrls, serverDate, callbacks) {
        var hlsUrl = filterHLS(mediaUrls)[0];
        var dashUrl = filterDash(mediaUrls)[0];

        if (hlsUrl) {
          retrieveHLSManifest(hlsUrl, serverDate, callbacks);
        } else if (dashUrl) {
          retrieveDashManifest(dashUrl, serverDate, callbacks);
        } else {
          callbacks.onError('Invalid media url');
        }
      }
    };
  }
);
