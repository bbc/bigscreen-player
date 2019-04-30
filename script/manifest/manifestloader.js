define(
  'bigscreenplayer/manifest/manifestloader', [
    'bigscreenplayer/manifest/manifestparser',
    'bigscreenplayer/models/transferformats',
    'bigscreenplayer/utils/loadurl'
  ],
  function (ManifestParser, TransferFormats, LoadUrl) {
    'use strict';

    function ManifestLoader () {
      var aborted = false;
      var dateWithOffset;

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

      function retrieveDashManifest (url, callbacks) {
        var xhr = LoadUrl(
          url,
          {
            method: 'GET',
            headers: {},
            onLoad: function () {
              try {
                if (xhr.responseXML) {
                  callbacks.onSuccess({
                    transferFormat: TransferFormats.DASH,
                    time: ManifestParser(xhr.responseXML, 'mpd', dateWithOffset).parse()
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

      function retrieveHLSManifest (url, callbacks) {
        LoadUrl(
          url,
          {
            method: 'GET',
            headers: {},
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
                loadLivePlaylist(streamUrl, callbacks);
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

      function loadLivePlaylist (url, callbacks) {
        LoadUrl(
          url,
          {
            method: 'GET',
            headers: {},
            onLoad: function (responseText) {
              if (responseText) {
                callbacks.onSuccess({
                  transferFormat: TransferFormats.HLS,
                  time: ManifestParser(responseText, 'm3u8', dateWithOffset).parse()
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
        load: function (mediaUrls, serverDate, newDevice, callbacks) {
          var hlsUrl = filterHLS(mediaUrls)[0];
          var dashUrl = filterDash(mediaUrls)[0];
          dateWithOffset = serverDate;

          if (aborted) {
            aborted = false;
            return;
          }

          if (hlsUrl) {
            retrieveHLSManifest(hlsUrl, callbacks);
          } else if (dashUrl) {
            retrieveDashManifest(dashUrl, callbacks);
          } else {
            callbacks.onError('Invalid media url');
          }
        },
        abort: function () {
          aborted = true;
        }
      };
    }

    return ManifestLoader;
  }
);
