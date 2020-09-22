require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/samsungmaple',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
  function (samsungMapleMediaPlayer, MediaPlayerBase) {
    describe('Samsung Maple', function () {
      var mockPlayerPlugin = {
        ResumePlay: function () {},
        SetDisplayArea: function () {},
        Play: function () {},
        Pause: function () {},
        Resume: function () {},
        Stop: function () {},
        JumpForward: function () {},
        JumpBackward: function () {},
        GetDuration: function () {}
      };
      var player;
      var recentEvents;

      function eventCallbackReporter (event) {
        recentEvents.push(event.type);
      }

      beforeEach(function () {
        spyOn(document, 'getElementById').and.returnValue(mockPlayerPlugin);
        spyOn(mockPlayerPlugin, 'ResumePlay');
        spyOn(mockPlayerPlugin, 'Play');
        spyOn(mockPlayerPlugin, 'Pause').and.returnValue(1);
        spyOn(mockPlayerPlugin, 'Stop');
        spyOn(mockPlayerPlugin, 'JumpForward').and.returnValue(1);
        spyOn(mockPlayerPlugin, 'JumpBackward').and.returnValue(1);
        spyOn(mockPlayerPlugin, 'GetDuration').and.returnValue(100000);
        spyOn(mockPlayerPlugin, 'Resume');

        player = samsungMapleMediaPlayer();
        recentEvents = [];
        player.addEventCallback(this, eventCallbackReporter);
      });

      describe('beginPlaybackFrom', function () {
        it('should call ResumePlay on the player plugin if in a stopped state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          player.beginPlaybackFrom(0);

          expect(mockPlayerPlugin.ResumePlay).toHaveBeenCalledTimes(1);
        });
      });

      describe('beginPlayback', function () {
        it('should call Play on the player plugin if in a stopped state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          player.beginPlayback();

          expect(mockPlayerPlugin.Play).toHaveBeenCalledTimes(1);
        });
      });

      describe('pause', function () {
        it('should emit a paused event if in a playing state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          player.beginPlayback();
          player.toPlaying();
          player.pause();

          expect(recentEvents).toContain(MediaPlayerBase.EVENT.PAUSED);
        });
      });

      describe('resume', function () {
        it('should emit a playing event if in a paused state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          player.beginPlayback();
          player.toPaused();
          player.resume();

          expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING);
        });
      });

      describe('stop', function () {
        it('should emit a stopped event if in a playing state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          player.beginPlayback();
          player.toPlaying();
          player.stop();

          expect(mockPlayerPlugin.Stop).toHaveBeenCalledTimes(1);
          expect(recentEvents).toContain(MediaPlayerBase.EVENT.STOPPED);
        });
      });

      describe('reset', function () {
        it('should call Stop on the player plugin if in a stopped state', function () {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
          player.reset();

          expect(mockPlayerPlugin.Stop).toHaveBeenCalledTimes(1);
        });
      });

      describe('playFrom', function () {
        describe('in a playing state', function () {
          it('should call JumpForward on the player plugin if seeking forwards', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
            player.beginPlayback();
            window.SamsungMapleOnCurrentPlayTime(0);
            window.SamsungMapleOnStreamInfoReady();
            player.toPlaying();
            recentEvents = [];
            player.playFrom(20);

            expect(mockPlayerPlugin.JumpForward).toHaveBeenCalledTimes(1);
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
          });

          it('should call JumpBackwards on the player plugin if seeking backwards', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
            player.beginPlaybackFrom(20);
            window.SamsungMapleOnCurrentPlayTime(20000);
            window.SamsungMapleOnStreamInfoReady();
            player.toPlaying();
            recentEvents = [];
            player.playFrom(0);

            expect(mockPlayerPlugin.JumpBackward).toHaveBeenCalledTimes(1);
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
          });

          it('should not attempt to seek if seeking close to current time', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
            player.beginPlayback();
            window.SamsungMapleOnCurrentPlayTime(0);
            window.SamsungMapleOnStreamInfoReady();
            player.toPlaying();
            recentEvents = [];
            player.playFrom(1.5);

            expect(mockPlayerPlugin.JumpForward).toHaveBeenCalledTimes(0);
            expect(mockPlayerPlugin.JumpBackward).toHaveBeenCalledTimes(0);
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.PLAYING);
          });
        });

        describe('in a paused state', function () {
          it('should call JumpForward and Resume on the player plugin if seeking forwards', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType');
            player.beginPlayback();
            window.SamsungMapleOnCurrentPlayTime(0);
            window.SamsungMapleOnStreamInfoReady();
            player.toPaused();
            recentEvents = [];
            player.playFrom(20);

            expect(mockPlayerPlugin.JumpForward).toHaveBeenCalledTimes(1);
            expect(mockPlayerPlugin.Resume).toHaveBeenCalledTimes(1);
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
          });
        });
      });
    });
  }
);
