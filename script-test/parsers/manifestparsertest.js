require(
  [
    'bigscreenplayer/parsers/manifestparser',
    'testdata/dashmanifests'
  ],
  function (ManifestParser, DashManifests) {
    describe('ManifestParser', function () {
      var dashManifests;
      beforeEach(function () {
        dashManifests = new DashManifests();
      });

      afterEach(function () {
      });

      describe('DASH mpd', function () {
        it('returns correct data for sliding window manifest', function () {
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

        it('returns ')
      });
    });
  });
