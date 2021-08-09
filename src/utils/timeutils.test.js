import TimeUtils from './timeutils';

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
    const realDateNow = global.Date.now;

    beforeEach(function () {
      global.Date.now = () => new Date('2019-10-22T10:59:20.000Z');
    });

    afterEach(function () {
      global.Date.now = realDateNow;
    });

    it('should return the relative time in seconds including the time a user spent seeking', function () {
      var time = 4000;

      // Note the 5 minute (300 second difference)
      var dvrInfoRangeStart = new Date('2019-10-22T09:00:00.000Z') / 1000;
      var timeCorrection = new Date('2019-10-22T08:55:00.000Z') / 1000;

      var pausedTime = new Date('2019-10-22T10:59:00.000Z');
      // mock Date.now is 20 seconds later. Slow seeking!

      expect(TimeUtils.calculateSlidingWindowSeekOffset(time, dvrInfoRangeStart, timeCorrection, pausedTime)).toBe(3680);
    });

    it('should return the relative time in seconds if paused time is 0', function () {
      var time = 4000;

      // Note the 5 minute (300 second difference)
      var dvrInfoRangeStart = new Date('2019-10-22T09:00:00.000Z') / 1000;
      var timeCorrection = new Date('2019-10-22T08:55:00.000Z') / 1000;
      var pausedTime = 0;

      expect(TimeUtils.calculateSlidingWindowSeekOffset(time, dvrInfoRangeStart, timeCorrection, pausedTime)).toBe(3700);
    });
  });
});
