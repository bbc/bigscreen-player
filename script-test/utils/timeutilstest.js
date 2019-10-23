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
          jasmine.clock().mockDate(new Date('2019-10-22T10:55:24.952Z'));
        });

        afterEach(function () {
          jasmine.clock().uninstall();
        });

        it('should return the relative time in seconds including the time a user spent seeking', function () {
          var time = 4895.142446990982;
          var dvrInfoRangeStart = new Date('2019-10-22T08:54:24.006Z') / 1000;
          var timeCorrection = new Date('2019-10-22T08:29:20.247Z') / 1000;
          var pausedTime = new Date('2019-10-22T10:55:24.045Z');

          expect(TimeUtils.calculateSlidingWindowSeekOffset(time, dvrInfoRangeStart, timeCorrection, pausedTime)).toBe(3390.476446931839);
        });

        it('should return the time passed in as an argument if paused time is 0', function () {
          var time = 4895.142446990982;
          var dvrInfoRangeStart = new Date('2019-10-22T08:54:24.006Z') / 1000;
          var timeCorrection = new Date('2019-10-22T08:29:20.247Z') / 1000;
          var pausedTime = 0;

          expect(TimeUtils.calculateSlidingWindowSeekOffset(time, dvrInfoRangeStart, timeCorrection, pausedTime)).toBe(time);
        });
      });
    });
  }
);
