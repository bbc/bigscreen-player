require(
  ['bigscreenplayer/utils/timeutils'],
  function (TimeUtils) {
    'use strict';
    describe('Time utils', function () {
      describe('Duration to seconds', function () {
        var testCases = {
          'PT2H': 7200,
          'PT2H30S': 7230,
          'PT2H30M30S': 9030,
          'PT30M30S': 1830,
          'PT30S': 30,
          'PT58M59.640S': 3539.64,
          'P1DT12H': undefined, // Technically valid, but code does not handle days
          'PT1D': undefined,
          '': undefined,
          'foobar': undefined
        };
        function testDurationToSeconds (duration) {
          it('Converts duration of ' + duration + ' to ' + testCases[duration] + ' seconds', function () {
            expect(TimeUtils.durationToSeconds(duration)).toBe(testCases[duration]);
          });
        }
        for (var duration in testCases) {
          testDurationToSeconds(duration);
        }
      });

      describe('Calculate Sliding Window Seek Offset', function () {
        beforeEach(function () {
          jasmine.clock().mockDate(new Date(1571741724952));
        });

        afterEach(function () {
          jasmine.clock().uninstall();
        });

        it('should return the relative time in seconds including the time a user spent seeking', function () {
          var time = 4895.142446990982;
          var dvrInfoRangeStart = 1571734464.006;
          var timeCorrection = 1571732960.247;
          var slidingWindowPausedTime = 1571741724045;

          expect(TimeUtils.calculateSlidingWindowSeekOffset(time, dvrInfoRangeStart, timeCorrection, slidingWindowPausedTime)).toBe(3390.476446931839);
        });
      });
    });
  }
);
