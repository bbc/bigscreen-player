require(
  [
    'bigscreenplayer/dynamicwindowutils'
  ],
    function (DynamicWindowUtils) {
      describe('isAtStartOfRange', function () {
        it('returns true if we are at the beginning of the playback range within a threshhold', function () {
          // fail();
          var isAtStart = DynamicWindowUtils.isAtStartOfRange(10, 10);

          expect(isAtStart).toBeTrue();
        });
      });
    }
);
