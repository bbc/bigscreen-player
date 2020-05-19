require(
  [
    'bigscreenplayer/dynamicwindowutils'
  ],
    function (DynamicWindowUtils) {
      describe('shouldAutoResume', function () {
        it('returns true if we are at the beginning of the playback range', function () {
          var isAtStart = DynamicWindowUtils.shouldAutoResume(10, 10);

          expect(isAtStart).toBeTrue();
        });

        it('returns true if we are at the beginning of the playback range within a threshhold', function () {
          var isAtStart = DynamicWindowUtils.shouldAutoResume(15, 10);

          expect(isAtStart).toBeTrue();
        });

        it('returns true if we are at the beginning of the playback range at the threshhold', function () {
          var isAtStart = DynamicWindowUtils.shouldAutoResume(18, 10);

          expect(isAtStart).toBeTrue();
        });

        it('returns false if we are after the beginning and the threshhold', function () {
          var isAtStart = DynamicWindowUtils.shouldAutoResume(20, 10);

          expect(isAtStart).toBeFalse();
        });
      });
    }
);
