require(
  [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/playbackstrategy/strategypicker'
  ],
  function (WindowTypes, StrategyPicker) {
    var isUHD = true;
    var previousPlaybackConfig = window.bigscreenPlayer;

    function setWindowBigscreenPlayerConfig (config) {
      window.bigscreenPlayer = config;
    }

    describe('Strategy Picker', function () {
      beforeEach(function () {
        window.bigscreenPlayer = {};
        setWindowBigscreenPlayerConfig({playbackStrategy: 'hybridstrategy'});
      });

      afterEach(function () {
        setWindowBigscreenPlayerConfig(previousPlaybackConfig);
      });

      it('Causes MSE Strategy to be picked if there are no configured exceptions', function () {
        expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('msestrategy');
      });

      it('Causes TAL Strategy to be picked if uhd is an exception', function () {
        setWindowBigscreenPlayerConfig({mseExceptions: ['uhd']});

        expect(StrategyPicker(WindowTypes.STATIC, isUHD)).toBe('nativestrategy');
      });

      it('Causes MSE Strategy to be picked if uhd is an exception but asset is not UHD', function () {
        setWindowBigscreenPlayerConfig({mseExceptions: ['uhd']});

        expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('msestrategy');
      });

      describe('WindowTypes', function () {
        it('Causes MSE Strategy to be picked if asset is STATIC window and there is no exception for staticWindow', function () {
          setWindowBigscreenPlayerConfig({mseExceptions: ['testException']});

          expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('msestrategy');
        });

        it('Causes TAL Strategy to be picked if asset is STATIC window and there is an exception for staticWindow', function () {
          setWindowBigscreenPlayerConfig({mseExceptions: ['staticWindow']});

          expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('nativestrategy');
        });

        it('Causes MSE Strategy to be picked if asset is SLIDING window and there is no exception for slidingWindow', function () {
          setWindowBigscreenPlayerConfig({mseExceptions: ['testException']});

          expect(StrategyPicker(WindowTypes.SLIDING, !isUHD)).toBe('msestrategy');
        });

        it('Causes TAL Strategy to be picked if asset is SLIDING window and there is an exception for slidingWindow', function () {
          setWindowBigscreenPlayerConfig({mseExceptions: ['slidingWindow']});

          expect(StrategyPicker(WindowTypes.SLIDING, !isUHD)).toBe('nativestrategy');
        });

        it('Causes MSE Strategy to be picked if asset is GROWING window and there is no exception for growingWindow', function () {
          setWindowBigscreenPlayerConfig({mseExceptions: ['testException']});

          expect(StrategyPicker(WindowTypes.GROWING, !isUHD)).toBe('msestrategy');
        });

        it('Causes TAL Strategy to be picked if asset is GROWING and there is an exception for growingWindow', function () {
          setWindowBigscreenPlayerConfig({mseExceptions: ['growingWindow']});

          expect(StrategyPicker(WindowTypes.GROWING, !isUHD)).toBe('nativestrategy');
        });
      });
    });
  }
);
