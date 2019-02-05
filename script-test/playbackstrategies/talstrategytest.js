require(
  [
    'bigscreenplayer/models/windowtypes',
    'squire'
  ],
  function (WindowTypes, Squire) {
    describe('TAL Strategy', function () {
      var TalStrategy;
      var mediaPlayer;

      var mockLegacyAdapter;
      var mockDevice;
      var mockConfig = 'config';

      beforeEach(function (done) {
        var injector = new Squire();
        mockDevice = jasmine.createSpyObj('mockDevice', ['getMediaPlayer', 'getLivePlayer', 'getConfig']);
        mediaPlayer = jasmine.createSpyObj('mockMediaPlayer', ['addEventCallback']);

        mockDevice.getMediaPlayer.and.returnValue(mediaPlayer);
        mockDevice.getLivePlayer.and.returnValue(mediaPlayer);
        mockDevice.getConfig.and.returnValue(mockConfig);

        mockLegacyAdapter = jasmine.createSpy('LegacyAdapter');

        injector.mock({'bigscreenplayer/playbackstrategy/legacyplayeradapter': mockLegacyAdapter});

        injector.require(['bigscreenplayer/playbackstrategy/talstrategy'], function (strategy) {
          TalStrategy = strategy;
          done();
        });
      });

      it('calls LegacyAdapter with a static media player when called for STATIC window', function () {
        var windowType = WindowTypes.STATIC;
        TalStrategy(windowType, null, null, null, null, mockDevice);

        // getMediaPlayer is called to get a non-live player
        expect(mockDevice.getMediaPlayer).toHaveBeenCalledWith();
        expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, null, null, null, null, mockConfig, mediaPlayer);
      });

      it('calls LegacyAdapter with a live media player when called for a GROWING window', function () {
        var windowType = WindowTypes.GROWING;
        TalStrategy(windowType, null, null, null, null, mockDevice);

        // getMediaPlayer is called to get a non-live player
        expect(mockDevice.getLivePlayer).toHaveBeenCalledWith();
        expect(mockLegacyAdapter). toHaveBeenCalledWith(windowType, null, null, null, null, mockConfig, mediaPlayer);
      });

      it('calls LegacyAdapter with a live media player when called for a SLIDING window', function () {
        var windowType = WindowTypes.SLIDING;
        TalStrategy(windowType, null, null, null, null, mockDevice);

        // getMediaPlayer is called to get a non-live player
        expect(mockDevice.getLivePlayer).toHaveBeenCalledWith();

        expect(mockLegacyAdapter).toHaveBeenCalledWith(windowType, null, null, null, null, mockConfig, mediaPlayer);
      });
    });
  });
