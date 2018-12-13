require(
  [
    'bigscreenplayer/parsers/manifestparser',
    'testdata/dashmanifests',
    'testdata/hlsmanifests'
  ],
  function (ManifestParser, DashManifests, HlsManifests) {
    describe('ManifestParser', function () {
      var dashManifests;
      var hlsManifests;

      beforeEach(function () {
        dashManifests = new DashManifests();
        hlsManifests = new HlsManifests();
      });

      afterEach(function () {
      });

      describe('DASH mpd', function () {
        it('returns correct data for sliding window dash manifest', function () {
          var manifest = dashManifests.slidingWindow();
          var manifestParser = new ManifestParser(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({
            windowStartTime: 1544691536160,
            windowEndTime: 1544698736160, // time provided....  - 60000 (one minute in millis) - (1000 * 184320 /48000) (One segment of video content in the example mpd)
            timeCorrection: 1544691536.16
          });
        });

        it('returns correct data for growing window manifest', function () {
          var manifest = dashManifests.growingWindow();
          var manifestParser = new ManifestParser(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({
            windowStartTime: 1544695200000, // availabilityStartTime (because there is no timeShiftBufferDepth)
            windowEndTime: 1544698796160, // time provided....  - (1000 * 3.84) (One segment of video content in the example mpd)
            timeCorrection: 0
          });
        });

        it('returns an error if manifest data has bad data in the attributes', function () {
          var manifest = dashManifests.badAttributes();
          var manifestParser = new ManifestParser(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({error: 'Error parsing DASH manifest attributes'});
        });

        it('returns an error if manifest data is malformed', function () {
          var manifest = 'not an MPD';
          var manifestParser = new ManifestParser(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({error: 'Error parsing DASH manifest'});
        });
      });

      describe('HLS m3u8', function () {
        it('returns correct data for sliding window hls manifest', function () {
          var manifest = hlsManifests.slidingWindow();
          var manifestParser = new ManifestParser(manifest, 'm3u8', new Date('2018-12-13T11:00:00.000000Z'));
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({
            windowStartTime: 1436259310000,
            windowEndTime: 1436259342000
          });
        });

        it('returns and error if manifest has an invalid start date', function () {
          var manifest = hlsManifests.invalidDate();
          var manifestParser = new ManifestParser(manifest, 'm3u8', new Date('2018-12-13T11:00:00.000000Z'));
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({error: 'Error parsing HLS manifest'});
        });

        it('returns an error if hls manifest data is malformed', function () {
          var manifest = 'not an valid manifest';
          var manifestParser = new ManifestParser(manifest, 'm3u8', new Date('2018-12-13T11:00:00.000000Z'));
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({error: 'Error parsing HLS manifest'});
        });
      });
    });
  });
