require(
  [
    'squire'
  ],
  function (Squire) {
    'use strict';

    describe('Manifest Loader', function () {
      var loadUrl = jasmine.createSpy('loadUrl');

      var injector = new Squire();
      var manifestLoader, playbackData;

      beforeEach(function (done) {
        injector.mock({
          'bigscreenplayer/utils/loadurl': loadUrl
        });
        injector.require(['bigscreenplayer/manifest/manifestloader'], function (ManifestLoader) {
          manifestLoader = ManifestLoader();
          playbackData = createPlaybackData();
          done();
        });
      });

      afterEach(function () {
        loadUrl.calls.reset();
      });

      describe('With HLS media', function () {
        it('Picks the first HLS url', function () {
          var hlsUrl = 'first.m3u8';
          playbackData.media.urls = [{ url: 'something_else' }, { url: hlsUrl }, { url: 'next.m3u8' }];
          manifestLoader.load(playbackData.media.urls, undefined, undefined, {});

          expect(loadUrl).toHaveBeenCalledWith(hlsUrl, jasmine.anything());
        });
      });

      describe('With Dash Media', function () {
        it('Picks the first dash url', function () {
          var dashUrl = 'first.mpd';
          playbackData.media.urls = [{ url: 'something_else' }, { url: dashUrl }, { url: 'next.mpd' }];
          manifestLoader.load(playbackData.media.urls, undefined, undefined, {});

          expect(loadUrl).toHaveBeenCalledWith(dashUrl, jasmine.anything());
        });
      });

      describe('With neither Dash or HLS', function () {
        it('Calls error when no hls urls found', function () {
          var callbackSpies = {
            onError: jasmine.createSpy('error callback')
          };
          var data = createPlaybackData();
          data.media.urls = [{ url: 'bad_url' }];
          manifestLoader.load(data.media.urls, undefined, undefined, callbackSpies);

          expect(callbackSpies.onError).toHaveBeenCalledWith('Invalid media url');
        });
      });

      xdescribe('On manifestDataSource load', function () {
        var callbackSpies, server;

        var dashResponse = '<?xml version="1.0" encoding="utf-8"?> <MPD xmlns="urn:mpeg:dash:schema:mpd:2011"></MPD>';
        var hlsMasterResponse = '#EXTM3U\n' +
          '#EXT-X-VERSION:2\n' +
          '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2255680,CODECS="mp4a.40.2,avc1.100.31",RESOLUTION=1024x576\n' +
          'live.m3u8\n' +
          '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=433540,CODECS="mp4a.40.2,avc1.66.30",RESOLUTION=384x216\n' +
          'bar.m3u8\n';
        var hlsLiveResponse = 'hls live playlist';
        var hlsInvalidResponse = '#EXTM3U\n' +
          '#EXT-X-VERSION:2\n';

        beforeEach(function () {
          // re-require ManifestDataSource as previous tests Squire'd this in.
          var ManifestDataSource = require('bigscreen/app/playback/manifestdatasource');
          manifestDataSource = ManifestDataSource();

          server = sinon.fakeServer.create();

          callbackSpies = {
            onSuccess: jasmine.createSpy('success callback'),
            onError: jasmine.createSpy('error callback')
          };
        });

        afterEach(function () {
          server.restore();
        });

        describe('DASH manifest fetching', function () {
          it('Calls success when network returns a DASH response', function () {
            server.respondWith('GET', 'http://foo.bar/test.mpd', [200, { 'Content-Type': 'application/dash+xml' }, dashResponse]);
            manifestDataSource.load([{ url: 'http://foo.bar/test.mpd' }], callbackSpies);
            server.respond();

            var parser = new DOMParser();
            var expectedDOM = parser.parseFromString(dashResponse, 'application/xml');

            expect(callbackSpies.onSuccess).toHaveBeenCalledWith(expectedDOM, 'mpd');
          });

          it('Calls error when response is invalid', function () {
            server.respondWith('GET', 'http://foo.bar/test.mpd', [200, {}, '']);
            manifestDataSource.load([{ url: 'http://foo.bar/test.mpd' }], callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve DASH XML response');
          });

          it('Calls error when network request fails', function () {
            server.respondWith('GET', 'http://foo.bar/test.mpd', [404, {}, '']);
            manifestDataSource.load([{ url: 'http://foo.bar/test.mpd' }], callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve DASH manifest');
          });
        });

        describe('HLS manifest fetching', function () {
          it('Calls success when network returns a HLS live playlist response', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsMasterResponse]);
            server.respondWith('GET', 'http://foo.bar/live.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsLiveResponse]);
            manifestDataSource.load([{ url: 'http://foo.bar/test.m3u8' }], callbackSpies);
            server.respond();
            server.respond(); // need to respond twice, once for each unique url (above)

            expect(callbackSpies.onSuccess).toHaveBeenCalledWith(hlsLiveResponse, 'm3u8');
          });

          it('calls error when network request fails', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [404, { 'Content-Type': 'application/vnd.apple.mpegurl' }, '']);
            manifestDataSource.load([{ url: 'http://foo.bar/test.m3u8' }], callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve HLS master playlist');
          });

          it('calls error if not valid HLS response', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsInvalidResponse]);
            manifestDataSource.load([{ url: 'http://foo.bar/test.m3u8' }], callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve HLS master playlist');
          });

          it('calls error when HLS live playlist response is invalid', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsMasterResponse]);
            server.respondWith('GET', 'http://foo.bar/live.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, '']);
            manifestDataSource.load([{ url: 'http://foo.bar/test.m3u8' }], callbackSpies);
            server.respond();
            server.respond(); // need to respond twice, once for each unique url (above)

            expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve HLS live playlist');
          });

          it('calls error when network request for HLS live playlist fails', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsMasterResponse]);
            server.respondWith('GET', 'http://foo.bar/live.m3u8', [404, { 'Content-Type': 'application/vnd.apple.mpegurl' }, '']);
            manifestDataSource.load([{ url: 'http://foo.bar/test.m3u8' }], callbackSpies);
            server.respond();
            server.respond(); // need to respond twice, once for each unique url (above)

            expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve HLS live playlist');
          });
        });
      });

      function createPlaybackData () {
        return {
          playbackType: 'live_restart',
          media: {
            urls: [{ url: 'url0.m3u8' }]
          },
          episode: {
            whatIsOn: [{
              scheduled_start: '2015-07-07T09:55:10Z'
            }]
          }
        };
      }
    });
  });
