require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/cehtml',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
  function (CehtmlMediaPlayer, MediaPlayerBase) {
    describe('cehtml Base', function () {
      var player;
      var mockMediaElement;
      var sourceContainer;

      var recentEvents;

      function eventCallbackReporter (event) {
        recentEvents.push(event.type);
      }

      var config = {
        streaming: {
          overrides: {
            forceBeginPlaybackToEndOfWindow: true
          }
        }
      };

      beforeEach(function () {
        jasmine.clock().install();
        jasmine.clock().mockDate();

        mockMediaElement = jasmine.createSpyObj('mediaElement', ['play', 'seek', 'remove', 'stop']);
        mockMediaElement.style = {};
        spyOn(document, 'createElement').and.returnValue(mockMediaElement);
        spyOn(document, 'getElementsByTagName').and.returnValue([jasmine.createSpyObj('body', ['insertBefore'])]);

        sourceContainer = document.createElement('div');

        recentEvents = [];

        player = CehtmlMediaPlayer(config);
        player.addEventCallback(this, eventCallbackReporter);
        player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
      });

      afterEach(function () {
        jasmine.clock().uninstall();
      });

      describe('Seek attempted and finished events', function () {
        afterEach(function () {
          delete window.bigscreenPlayer.overrides;
        });

        it('Seek Attempted Event Emitted On Initialise Media If The State Is Empty', function () {
          expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);
        });

        it('Seek Finished Event Emitted On Status Update When Time is Within Sentinel Threshold And The State is Playing', function () {
          expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);

          player.beginPlaybackFrom(0);

          mockMediaElement.playState = 4; // BUFFERING
          mockMediaElement.onPlayStateChange();

          mockMediaElement.playState = 1; // PLAYING
          mockMediaElement.onPlayStateChange();

          mockMediaElement.playPosition = 0;
          for (var i = 0; i < 6; i++) {
            mockMediaElement.playPosition += 500;
            jasmine.clock().tick(500);
          }

          expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
        });

        it('Seek Finished Event Is Emitted Only Once', function () {
          player.beginPlaybackFrom(0);

          mockMediaElement.playState = 4; // BUFFERING
          mockMediaElement.onPlayStateChange();

          mockMediaElement.playState = 1; // PLAYING
          mockMediaElement.onPlayStateChange();

          mockMediaElement.playPosition = 0;
          for (var i = 0; i < 6; i++) {
            mockMediaElement.playPosition += 500;
            jasmine.clock().tick(500);
          }

          expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);

          recentEvents = [];
          mockMediaElement.playPosition += 500;
          jasmine.clock().tick(500);

          expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
        });

        it('Seek Finished Event Is Emitted After restartTimeout When Enabled', function () {
          window.bigscreenPlayer.overrides = {
            restartTimeout: 10000
          };

          player = CehtmlMediaPlayer();
          player.addEventCallback(this, eventCallbackReporter);
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

          expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);

          player.beginPlaybackFrom(0);

          mockMediaElement.playState = 4; // BUFFERING
          mockMediaElement.onPlayStateChange();

          mockMediaElement.playState = 1; // PLAYING
          mockMediaElement.onPlayStateChange();

          mockMediaElement.playPosition = 0;
          var numberOfLoops = 10000 / 500;
          for (var i = 0; i < numberOfLoops - 1; i++) {
            mockMediaElement.playPosition += 500;
            jasmine.clock().tick(500);

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
          }

          mockMediaElement.playPosition += 1000;
          jasmine.clock().tick(1000);

          expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
        });
      });

      describe('addEventCallback', function () {
        it('should call the callback on update', function () {
          var spy = jasmine.createSpy('callback');

          player.addEventCallback(this, spy);
          player.beginPlayback();

          expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'buffering' }));
        });
      });

      describe('removeEventCallback', function () {
        it('should remove the callback', function () {
          var spy = jasmine.createSpy('callback');

          player.addEventCallback(this, spy);
          player.removeEventCallback(this, spy);
          player.beginPlayback();

          expect(spy).not.toHaveBeenCalled();
        });
      });

      describe('removeAllEventCallbacks', function () {
        it('should remove all the callbacks', function () {
          var spy = jasmine.createSpy('callback');

          player.addEventCallback(this, spy);
          player.removeAllEventCallbacks();
          player.beginPlayback();

          expect(spy).not.toHaveBeenCalled();
        });
      });

      describe('resume', function () {
        it('should call through to play if paused', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();
          player.pause();

          mockMediaElement.play.calls.reset();

          expect(mockMediaElement.play).not.toHaveBeenCalled();

          player.resume();

          expect(mockMediaElement.play).toHaveBeenCalledWith(1);
        });

        it('should do nothing if playing', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();

          mockMediaElement.play.calls.reset();

          player.resume();

          expect(mockMediaElement.play).not.toHaveBeenCalled();
        });
      });

      describe('playFrom', function () {
        it('should seek to the required time', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();

          player.playFrom(10);

          expect(mockMediaElement.seek).toHaveBeenCalledWith(10000);
        });

        it('should clamp to within the seekable range', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.playTime = 10000;
          mockMediaElement.onPlayStateChange();

          player.playFrom(1000000000);

          expect(mockMediaElement.seek).toHaveBeenCalledWith(8900);
        });
      });

      describe('beginPlayback', function () {
        it('should call play on the media element', function () {
          player.beginPlayback();

          expect(mockMediaElement.play).toHaveBeenCalledWith(1);
        });

        it('should not call play if playing', function () {
          player.beginPlayback();

          mockMediaElement.play.calls.reset();

          player.beginPlayback();

          expect(mockMediaElement.play).not.toHaveBeenCalled();
        });
      });

      describe('beginPlaybackFrom', function () {
        it('should call play and then seek on the media element', function () {
          player.beginPlaybackFrom(10);
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();

          expect(mockMediaElement.play).toHaveBeenCalledWith(1);
          expect(mockMediaElement.seek).toHaveBeenCalledWith(10000);
        });

        it('should call play or seek if playing', function () {
          player.beginPlaybackFrom(10);
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();

          mockMediaElement.play.calls.reset();
          mockMediaElement.seek.calls.reset();

          player.beginPlaybackFrom(10);

          expect(mockMediaElement.play).not.toHaveBeenCalledWith();
          expect(mockMediaElement.seek).not.toHaveBeenCalledWith();
        });
      });

      describe('pause', function () {
        it('should call pause on the media element', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();

          mockMediaElement.play.calls.reset();
          player.pause();

          expect(mockMediaElement.play).toHaveBeenCalledWith(0);
        });

        it('should not call pause if paused', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();

          player.pause();

          mockMediaElement.play.calls.reset();
          player.pause();

          expect(mockMediaElement.play).not.toHaveBeenCalled();
        });
      });

      describe('stop', function () {
        it('should call stop on the media element', function () {
          player.beginPlayback();
          player.stop();

          expect(mockMediaElement.stop).toHaveBeenCalledWith();
        });

        it('should not call stop if playback has not started', function () {
          player.stop();

          expect(mockMediaElement.stop).not.toHaveBeenCalled();
        });

        it('should not call stop if already stopped', function () {
          player.beginPlayback();
          player.stop();

          mockMediaElement.stop.calls.reset();
          player.stop();

          expect(mockMediaElement.stop).not.toHaveBeenCalled();
        });
      });

      describe('getSource', function () {
        it('should return the source', function () {
          expect(player.getSource()).toBe('testUrl');
        });
      });

      describe('getMimeType', function () {
        it('should return the mimeType', function () {
          expect(player.getMimeType()).toBe('testMimeType');
        });
      });

      describe('getSeekableRange', function () {
        it('should return the seekable range', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.playTime = 10000;
          mockMediaElement.onPlayStateChange();

          expect(player.getSeekableRange()).toEqual({start: 0, end: 10});
        });
      });

      describe('getMediaDuration', function () {
        it('should return the media duration', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.playTime = 10000;
          mockMediaElement.onPlayStateChange();

          expect(player.getMediaDuration()).toEqual(10);
        });
      });

      describe('getState', function () {
        it('should return the state', function () {
          expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.onPlayStateChange();

          expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
        });
      });

      describe('getPlayerElement', function () {
        it('should return the media element', function () {
          expect(player.getPlayerElement()).toBe(mockMediaElement);
        });
      });

      describe('getDuration', function () {
        it('should retrun the media duration for vod', function () {
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.playTime = 10000;
          mockMediaElement.onPlayStateChange();

          expect(player.getDuration()).toBe(10);
        });

        it('should retrun the inifinty for live', function () {
          player.reset();
          player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
          player.beginPlayback();
          mockMediaElement.playState = 1;
          mockMediaElement.playTime = 10000;
          mockMediaElement.onPlayStateChange();

          expect(player.getDuration()).toBe(Infinity);
        });
      });
    });
  });
