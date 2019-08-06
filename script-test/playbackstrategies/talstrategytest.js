require(
  [
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/mediasources',
    'bigscreenplayer/models/livesupport',
    'squire'
  ],
  function (WindowTypes, MediaSources, LiveSupport, Squire) {
    describe('TAL Strategy', function () {
      var injector = new Squire();
      var TalStrategy;
      var mediaPlayer;

      var mockLegacyAdapter;
      var mockDevice;
      var mediaSources;

      beforeEach(function (done) {
        var mediaSourceCallbacks = jasmine.createSpyObj('mediaSourceCallbacks', ['onSuccess', 'onError']);
        mediaSources = new MediaSources([{url: 'http://a', cdn: 'supplierA'}], new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, mediaSourceCallbacks);

        mockDevice = jasmine.createSpyObj('mockDevice', ['getMediaPlayer', 'getLivePlayer', 'getConfig']);
        mediaPlayer = jasmine.createSpyObj('mockMediaPlayer', ['addEventCallback']);

        mockLegacyAdapter = jasmine.createSpy('legacyAdapter');

        mockDevice.getMediaPlayer.and.returnValue(mediaPlayer);
        mockDevice.getLivePlayer.and.returnValue(mediaPlayer);

        injector.mock({'bigscreenplayer/playbackstrategy/legacyplayeradapter': mockLegacyAdapter});

        injector.require(['bigscreenplayer/playbackstrategy/talstrategy'], function (strategy) {
          TalStrategy = strategy;
          done();
        });
      });

      it('calls LegacyAdapter with a static media player when called for STATIC window', function () {
        TalStrategy(mediaSources, WindowTypes.STATIC, null, null, null, mockDevice);

        // getMediaPlayer is called to get a non-live player
        expect(mockDevice.getMediaPlayer).toHaveBeenCalledWith();
      });

      it('calls LegacyAdapter with a live media player when called for a GROWING window', function () {
        TalStrategy(mediaSources, WindowTypes.GROWING, null, null, null, mockDevice);

        // getMediaPlayer is called to get a non-live player
        expect(mockDevice.getLivePlayer).toHaveBeenCalledWith();
      });

      it('calls LegacyAdapter with a live media player when called for a SLIDING window', function () {
        TalStrategy(mediaSources, WindowTypes.SLIDING, null, null, null, mockDevice);

        // getMediaPlayer is called to get a non-live player
        expect(mockDevice.getLivePlayer).toHaveBeenCalledWith();
      });
    });
  });
