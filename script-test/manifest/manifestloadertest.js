require(
  [
    'squire',
    'sinon',
    'bigscreenplayer/manifest/manifestloader',
    'bigscreenplayer/models/transferformats'
  ],
  function (Squire, Sinon, ManifestLoader, TransferFormats) {
    'use strict';

    describe('Manifest Loader', function () {
      var loadUrl = jasmine.createSpy('loadUrl');

      var injector = new Squire();
      var mockedLoader;

      beforeEach(function (done) {
        injector.mock({
          'bigscreenplayer/utils/loadurl': loadUrl
        });
        injector.require(['bigscreenplayer/manifest/manifestloader'], function (ManifestLoader) {
          mockedLoader = ManifestLoader;
          done();
        });
      });

      afterEach(function () {
        loadUrl.calls.reset();
      });

      describe('With HLS media', function () {
        it('Picks the first HLS url', function () {
          var hlsUrl = 'first.m3u8';
          var urls = [{ url: 'something_else' }, { url: hlsUrl }, { url: 'next.m3u8' }];
          mockedLoader.load(urls, undefined, {});

          expect(loadUrl).toHaveBeenCalledWith(hlsUrl, jasmine.anything());
        });
      });

      describe('With Dash Media', function () {
        it('Picks the first dash url', function () {
          var dashUrl = 'first.mpd';
          var urls = [{ url: 'something_else' }, { url: dashUrl }, { url: 'next.mpd' }];
          mockedLoader.load(urls, undefined, {});

          expect(loadUrl).toHaveBeenCalledWith(dashUrl, jasmine.anything());
        });
      });

      describe('With neither Dash or HLS', function () {
        it('Calls error when no hls urls found', function () {
          var callbackSpies = {
            onError: jasmine.createSpy('error callback')
          };
          var urls = [{ url: 'bad_url' }];
          mockedLoader.load(urls, undefined, callbackSpies);

          expect(callbackSpies.onError).toHaveBeenCalledWith('Invalid media url');
        });
      });

      describe('On manifestDataSource load', function () {
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
          server = Sinon.fakeServer.create();

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
            ManifestLoader.load([{ url: 'http://foo.bar/test.mpd' }], undefined, callbackSpies);
            server.respond();

            var expectedResponse = {
              transferFormat: TransferFormats.DASH,
              time: jasmine.any(Object)
            };

            expect(callbackSpies.onSuccess).toHaveBeenCalledWith(expectedResponse);
          });

          it('Calls error when response is invalid', function () {
            server.respondWith('GET', 'http://foo.bar/test.mpd', [200, {}, '']);
            ManifestLoader.load([{ url: 'http://foo.bar/test.mpd' }], undefined, callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve DASH XML response');
          });

          it('Calls error when network request fails', function () {
            server.respondWith('GET', 'http://foo.bar/test.mpd', [404, {}, '']);
            ManifestLoader.load([{ url: 'http://foo.bar/test.mpd' }], undefined, callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve DASH manifest');
          });
        });

        describe('HLS manifest fetching', function () {
          it('Calls success when network returns a HLS live playlist response', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsMasterResponse]);
            server.respondWith('GET', 'http://foo.bar/live.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsLiveResponse]);
            ManifestLoader.load([{ url: 'http://foo.bar/test.m3u8' }], undefined, callbackSpies);
            server.respond();
            server.respond(); // need to respond twice, once for each unique url (above)

            var expectedResponse = {
              transferFormat: TransferFormats.HLS,
              time: jasmine.any(Object)
            };

            expect(callbackSpies.onSuccess).toHaveBeenCalledWith(expectedResponse);
          });

          it('calls error when network request fails', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [404, { 'Content-Type': 'application/vnd.apple.mpegurl' }, '']);
            ManifestLoader.load([{ url: 'http://foo.bar/test.m3u8' }], undefined, callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve HLS master playlist');
          });

          it('calls error if not valid HLS response', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsInvalidResponse]);
            ManifestLoader.load([{ url: 'http://foo.bar/test.m3u8' }], undefined, callbackSpies);
            server.respond();

            expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve HLS master playlist');
          });

          it('calls error when HLS live playlist response is invalid', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsMasterResponse]);
            server.respondWith('GET', 'http://foo.bar/live.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, '']);
            ManifestLoader.load([{ url: 'http://foo.bar/test.m3u8' }], undefined, callbackSpies);
            server.respond();
            server.respond(); // need to respond twice, once for each unique url (above)

            expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve HLS live playlist');
          });

          it('calls error when network request for HLS live playlist fails', function () {
            server.respondWith('GET', 'http://foo.bar/test.m3u8', [200, { 'Content-Type': 'application/vnd.apple.mpegurl' }, hlsMasterResponse]);
            server.respondWith('GET', 'http://foo.bar/live.m3u8', [404, { 'Content-Type': 'application/vnd.apple.mpegurl' }, '']);
            ManifestLoader.load([{ url: 'http://foo.bar/test.m3u8' }], undefined, callbackSpies);
            server.respond();
            server.respond(); // need to respond twice, once for each unique url (above)

            expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve HLS live playlist');
          });
        });
      });
    });
  });
