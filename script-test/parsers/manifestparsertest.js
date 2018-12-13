require(
  [
    'bigscreenplayer/parsers/manifestparser',
    'testdata/dashmanifests'
  ],
  function (ManifestParser, DashManifests) {
    describe('ManifestParser', function () {
      beforeEach(function () {

      });

      afterEach(function () {
      });

      fdescribe('DASH mpd', function () {
        it('Returns the live window start time, live window end time and time correction', function () {
          var manifest = DashManifests.slidingWindow;
          var manifestParser = new ManifestParser(manifest, 'mpd');
          var liveWindowData = manifestParser.parse();

          expect(liveWindowData).toEqual({
            liveWindowStart: 12345,
            liveWindowEnd: 123456,
            timeCorrection: 3454343
          });
        });
      });

      describe('HLS playlist', function () {
        it('Returns the live window start time, live window end time and time correction', function () {
          fail();
        });
      });
    });
  });
