require(
  [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/mediasources',
    'squire'
  ],
    function (WindowTypes, LiveSupport, MediaSources, Squire) {
      describe('Native Strategy', function () {
        var nativeStrategy;
        var html5player;
        var livePlayer;
        var mediaPlayer;

        var mockLegacyAdapter;
        var mockDevice;
        var mockConfig = 'config';

        var mediaKind = 'mediaKind';
        var playbackElement = 'playbackElement';
        var isUHD = 'isUHD';
        var mediaSources;

        beforeEach(function (done) {
          var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);
          mediaSources = new MediaSources([{url: 'http://a', cdn: 'supplierA'}], new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, mediaSourceCallbacks);

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
            'bigscreenplayer/playbackstrategy/modifiers/html5': html5player,
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
          nativeStrategy(mediaSources, windowType, mediaKind, playbackElement, isUHD, mockDevice);

          expect(html5player).toHaveBeenCalledWith(mockConfig);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(mediaSources, windowType, playbackElement, isUHD, mockConfig, mediaPlayer);
        });

        it('calls LegacyAdapter with a live media player when called for a GROWING window', function () {
          var windowType = WindowTypes.GROWING;
          nativeStrategy(mediaSources, windowType, mediaKind, playbackElement, isUHD, mockDevice);

          expect(html5player).toHaveBeenCalledWith(mockConfig);
          expect(livePlayer).toHaveBeenCalledWith(mediaPlayer, mockConfig, WindowTypes.GROWING, mediaSources);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(mediaSources, windowType, playbackElement, isUHD, mockConfig, mediaPlayer);
        });

        it('calls LegacyAdapter with a live media player when called for a SLIDING window', function () {
          var windowType = WindowTypes.SLIDING;
          nativeStrategy(mediaSources, windowType, mediaKind, playbackElement, isUHD, mockDevice);

          expect(html5player).toHaveBeenCalledWith(mockConfig);
          expect(livePlayer).toHaveBeenCalledWith(mediaPlayer, mockConfig, WindowTypes.SLIDING, mediaSources);

          expect(mockLegacyAdapter).toHaveBeenCalledWith(mediaSources, windowType, playbackElement, isUHD, mockConfig, mediaPlayer);
        });
      });
    });
