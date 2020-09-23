require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/samsungstreaming',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
  function (samsungStreamingMediaPlayer, MediaPlayerBase) {
    describe('Samsung Streaming', function () {
      var mockPlayerPlugin = {
        Execute: function () {},
        OnEvent: function () {},
        Open: function () {},
        Close: function () {}
      };

      var player;
      var recentEvents;

      function eventCallbackReporter (event) {
        recentEvents.push(event.type);
      }

      beforeEach(function () {
        spyOn(document, 'getElementById').and.callFake(function (id) {
          if (id === 'sefPlayer') {
            return mockPlayerPlugin;
          }
        });
        spyOn(mockPlayerPlugin, 'Execute').and.returnValue(1);

        player = samsungStreamingMediaPlayer();
        recentEvents = [];
        player.addEventCallback(this, eventCallbackReporter);
      });

      describe('beginPlaybackFrom', function () {
        it('should call Execute on the player plugin if in a stopped state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          recentEvents = [];
          mockPlayerPlugin.Execute.calls.reset();
          player.beginPlaybackFrom(0);

          expect(mockPlayerPlugin.Execute).toHaveBeenCalledTimes(1);
          expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
        });
      });

      describe('beginPlayback', function () {
        it('should call Execute on the player plugin in a stopped state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          recentEvents = [];
          mockPlayerPlugin.Execute.calls.reset();
          player.beginPlayback();

          expect(mockPlayerPlugin.Execute).toHaveBeenCalledTimes(1);
          expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
        });
      });
    });
  }
);
