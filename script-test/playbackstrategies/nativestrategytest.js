require(
  [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'squire'
  ],
    function (WindowTypes, LiveSupport, Squire) {
      describe('Native Strategy', function () {
        var nativeStrategy;
        var html5player;
        var livePlayer;
        var mediaPlayer;

        var mockLegacyAdapter;
        var mockDevice;
        var mockConfig = 'config';

        var mediaKind = 'mediaKind';
        var timeData = 'timeData';
        var playbackElement = 'playbackElement';
        var isUHD = 'isUHD';

        beforeEach(function (done) {
          var injector = new Squire();

          mockDevice = jasmine.createSpyObj('mockDevice', ['getConfig', 'getLogger']);

          mockLegacyAdapter = jasmine.createSpy('LegacyAdapter');
          mediaPlayer = jasmine.createSpy('MediaPlayer');
          html5player = jasmine.createSpy('Html5Player');
          livePlayer = jasmine.createSpy('LivePlayer');

          html5player.and.returnValue(mediaPlayer);
          livePlayer.and.returnValue(mediaPlayer);

          mockDevice.getConfig.and.returnValue(
            mockConfig
          );

          injector.mock({
            'bigscreenplayer/playbackstrategy/legacyplayeradapter': mockLegacyAdapter,
            'bigscreenplayer/playbackstrategy/modifiers/mediaplayer': html5player,
            'bigscreenplayer/playbackstrategy/modifiers/live/playable': livePlayer
          });

          injector.require(['bigscreenplayer/playbackstrategy/nativestrategy'], function (strategy) {
            nativeStrategy = strategy;
            done();
          });
        });

        afterEach(function () {
          window.bigscreenPlayer.liveSupport = LiveSupport.PLAYABLE;
        });

        it('calls LegacyAdapter with a static media player when called for STATIC window', function () {
          var windowType = WindowTypes.STATIC;
          nativeStrategy(windowType, mediaKind, timeData, playbackElement, isUHD, mockDevice);

          expect(html5player).toHaveBeenCalledWith(mockConfig);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, mediaKind, timeData, playbackElement, isUHD, mockConfig, mediaPlayer);
        });

        it('calls LegacyAdapter with a live media player when called for a GROWING window', function () {
          var windowType = WindowTypes.GROWING;
          nativeStrategy(windowType, mediaKind, timeData, playbackElement, isUHD, mockDevice);

          expect(html5player).toHaveBeenCalledWith(mockConfig);
          expect(livePlayer).toHaveBeenCalledWith(mediaPlayer, mockConfig, WindowTypes.GROWING, timeData);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, mediaKind, timeData, playbackElement, isUHD, mockConfig, mediaPlayer);
        });

        it('calls LegacyAdapter with a live media player when called for a SLIDING window', function () {
          var windowType = WindowTypes.SLIDING;
          nativeStrategy(windowType, mediaKind, timeData, playbackElement, isUHD, mockDevice);

          expect(html5player).toHaveBeenCalledWith(mockConfig);
          expect(livePlayer).toHaveBeenCalledWith(mediaPlayer, mockConfig, WindowTypes.SLIDING, timeData);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, mediaKind, timeData, playbackElement, isUHD, mockConfig, mediaPlayer);
        });
      });
    });
