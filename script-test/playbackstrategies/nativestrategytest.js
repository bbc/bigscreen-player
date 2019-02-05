require(
  [
    'bigscreenplayer/models/windowtypes',
    'squire'
  ],
    function (WindowTypes, Squire) {
      describe('Native Strategy', function () {
        var nativeStrategy;
        var html5player;
        var livePlayer;
        var mediaPlayer;

        var mockLegacyAdapter;
        var mockDevice;
        var mockLogger = 'logger';
        var mockConfig = 'config';

        beforeEach(function (done) {
          var injector = new Squire();

          mockDevice = jasmine.createSpyObj('mockDevice', ['getConfig', 'getLogger']);

          mockLegacyAdapter = jasmine.createSpy('LegacyAdapter');
          html5player = jasmine.createSpy('Html5Player');
          livePlayer = jasmine.createSpy('LivePlayer');

          html5player.and.returnValue(mediaPlayer);
          livePlayer.and.returnValue(mediaPlayer);

          mockDevice.getLogger.and.returnValue(
            mockLogger
          );

          mockDevice.getConfig.and.returnValue(
            mockConfig
          );

          injector.mock({
            'bigscreenplayer/playbackstrategy/legacyplayeradapter': mockLegacyAdapter,
            'bigscreenplayer/playbackstrategy/modifiers/html5': html5player,
            'bigscreenplayer/playbackstrategy/modifiers/live/playable': livePlayer
          });

          injector.require(['bigscreenplayer/playbackstrategy/nativestrategy'], function (strategy) {
            nativeStrategy = strategy;
            done();
          });
        });

        it('calls LegacyAdapter with a static media player when called for STATIC window', function () {
          var windowType = WindowTypes.STATIC;
          nativeStrategy(windowType, null, null, null, null, mockDevice);

          expect(html5player).toHaveBeenCalledWith(mockLogger);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, null, null, null, null, mockConfig, mediaPlayer);
        });

        it('calls LegacyAdapter with a live media player when called for a GROWING window', function () {
          var windowType = WindowTypes.GROWING;
          nativeStrategy(windowType, null, null, null, null, mockDevice);

          expect(livePlayer).toHaveBeenCalledWith(mockConfig, mockLogger);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, null, null, null, null, mockConfig, mediaPlayer);
        });

        it('calls LegacyAdapter with a live media player when called for a SLIDING window', function () {
          var windowType = WindowTypes.SLIDING;
          nativeStrategy(windowType, null, null, null, null, mockDevice);

          expect(livePlayer).toHaveBeenCalledWith(mockConfig, mockLogger);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, null, null, null, null, mockConfig, mediaPlayer);
        });
      });
    });

