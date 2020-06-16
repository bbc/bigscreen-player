require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/playbackstrategy/modifiers/live/seekable',
    'bigscreenplayer/models/windowtypes'
  ],
    function (MediaPlayerBase, SeekableMediaPlayer, WindowTypes) {
      var sourceContainer = document.createElement('div');
      var player;
      var seekableMediaPlayer;

      function wrapperTests (action, expectedReturn) {
        if (expectedReturn) {
          player[action].and.returnValue(expectedReturn);

          expect(seekableMediaPlayer[action]()).toBe(expectedReturn);
        } else {
          seekableMediaPlayer[action]();

          expect(player[action]).toHaveBeenCalledTimes(1);
        }
      }

      function initialiseSeekableMediaPlayer (config, windowType) {
        seekableMediaPlayer = SeekableMediaPlayer(player, config, windowType);
      }

      describe('Seekable HMTL5 Live Player', function () {
        beforeEach(function () {
          player = jasmine.createSpyObj('player',
            ['beginPlayback', 'initialiseMedia', 'stop', 'reset', 'getState', 'getSource', 'getMimeType',
              'addEventCallback', 'removeEventCallback', 'removeAllEventCallbacks', 'getPlayerElement', 'pause',
              'resume', 'beginPlaybackFrom', 'playFrom', 'getCurrentTime', 'getSeekableRange', 'toPaused',
              'toPlaying']);
        });

        describe('methods call the appropriate media player methods', function () {
          beforeEach(function () {
            initialiseSeekableMediaPlayer();
          });

          it('calls beginPlayback on the media player', function () {
            wrapperTests('beginPlayback');
          });

          it('calls initialiseMedia on the media player', function () {
            wrapperTests('initialiseMedia');
          });

          it('calls beginPlayingFrom on the media player', function () {
            var arg = 0;
            seekableMediaPlayer.beginPlaybackFrom(arg);

            expect(player.beginPlaybackFrom).toHaveBeenCalledWith(arg);
          });

          it('calls playFrom on the media player', function () {
            var arg = 0;
            seekableMediaPlayer.playFrom(arg);

            expect(player.playFrom).toHaveBeenCalledWith(arg);
          });

          it('calls stop on the media player', function () {
            wrapperTests('stop');
          });

          it('calls reset on the media player', function () {
            wrapperTests('reset');
          });

          it('calls getState on the media player', function () {
            wrapperTests('getState', 'thisState');
          });

          it('calls getSource on the media player', function () {
            wrapperTests('getSource', 'thisSource');
          });

          it('calls getMimeType on the media player', function () {
            wrapperTests('getMimeType', 'thisMimeType');
          });

          it('calls addEventCallback on the media player', function () {
            var thisArg = 'arg';
            var callback = function () { return; };
            seekableMediaPlayer.addEventCallback(thisArg, callback);

            expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback);
          });

          it('calls removeEventCallback on the media player', function () {
            var thisArg = 'arg';
            var callback = function () { return; };
            seekableMediaPlayer.removeEventCallback(thisArg, callback);

            expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback);
          });

          it('calls removeAllEventCallbacks on the media player', function () {
            wrapperTests('removeAllEventCallbacks');
          });

          it('calls getPlayerElement on the media player', function () {
            wrapperTests('getPlayerElement');
          });

          it('calls pause on the media player', function () {
            player.getSeekableRange.and.returnValue({start: 0});

            wrapperTests('pause');
          });

          it('calls getCurrentTime on media player', function () {
            wrapperTests('getCurrentTime', 'thisTime');
          });

          it('calls getSeekableRange on media player', function () {
            wrapperTests('getSeekableRange', 'thisRange');
          });
        });

        describe('Seekable features', function () {
          it('should respect config forcing playback from the end of the window', function () {
            var config = {
              streaming: {
                overrides: {
                  forceBeginPlaybackToEndOfWindow: true
                }
              }
            };
            initialiseSeekableMediaPlayer(config);

            seekableMediaPlayer.beginPlayback();

            expect(player.beginPlaybackFrom).toHaveBeenCalledWith(Infinity);
          });
        });

        describe('calls the mediaplayer with the correct media Type', function () {
          beforeEach(function () {
            initialiseSeekableMediaPlayer();
          });

          it('for static video', function () {
            seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, '', '', sourceContainer);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);
          });

          it('for live video', function () {
            seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);
          });

          it('for static audio', function () {
            seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, '', '', sourceContainer);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_AUDIO, '', '', sourceContainer, undefined);
          });
        });

        describe('Pausing and Auto-Resume', function () {
          var mockCallback = [];

          function startPlaybackAndPause (startTime, disableAutoResume) {
            seekableMediaPlayer.beginPlaybackFrom(startTime || 0);
            seekableMediaPlayer.pause({disableAutoResume: disableAutoResume});
          }

          beforeEach(function () {
            jasmine.clock().install();
            jasmine.clock().mockDate();

            initialiseSeekableMediaPlayer(undefined, WindowTypes.SLIDING);

            player.getSeekableRange.and.returnValue({start: 0});
            player.getCurrentTime.and.returnValue(20);

            player.addEventCallback.and.callFake(function (self, callback) {
              mockCallback.push(callback);
            });
          });

          afterEach(function () {
            jasmine.clock().uninstall();
            mockCallback = [];
          });

          it('calls resume when approaching the start of the buffer', function () {
            startPlaybackAndPause(20, false);

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).toHaveBeenCalledWith();
          });

          it('does not call resume when approaching the start of the buffer with the disableAutoResume option', function () {
            startPlaybackAndPause(20, true);

            jasmine.clock().tick(11 * 1000);

            expect(player.resume).not.toHaveBeenCalledWith();
          });

          it('does not call resume if paused after the auto resume point', function () {
            startPlaybackAndPause(20, false);

            jasmine.clock().tick(11 * 1000);

            expect(player.resume).not.toHaveBeenCalledWith();
          });

          it('does not auto-resume if the video is no longer paused', function () {
            startPlaybackAndPause(20, false);

            for (var index = 0; index < mockCallback.length; index++) {
              mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING});
            }

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).not.toHaveBeenCalled();
          });

          it('Calls resume when paused is called multiple times', function () {
            startPlaybackAndPause(0, false);

            var event = {state: MediaPlayerBase.STATE.PLAYING, currentTime: 25};
            for (var index = 0; index < mockCallback.length; index++) {
              mockCallback[index](event);
            }

            seekableMediaPlayer.pause();

            event.currentTime = 30;
            for (index = 0; index < mockCallback.length; index++) {
              mockCallback[index](event);
            }

            seekableMediaPlayer.pause();
            // uses real time to determine pause intervals
            // if debugging the time to the buffer will be decreased by the time spent.
            jasmine.clock().tick(22 * 1000);

            expect(player.resume).toHaveBeenCalledTimes(1);
          });

          it('calls auto-resume immeditetly if paused after an autoresume', function () {
            startPlaybackAndPause(20, false);

            jasmine.clock().tick(12 * 1000);

            player.getSeekableRange.and.returnValue({start: 12});

            seekableMediaPlayer.pause();

            jasmine.clock().tick(1);

            expect(player.resume).toHaveBeenCalledTimes(1);
            expect(player.toPaused).toHaveBeenCalledTimes(1);
            expect(player.toPlaying).toHaveBeenCalledTimes(1);
          });

          it('does not calls autoresume immeditetly if paused after an auto-resume with disableAutoResume options', function () {
            startPlaybackAndPause(20, true);

            jasmine.clock().tick(12 * 1000);
            player.getSeekableRange.and.returnValue({start: 12});

            jasmine.clock().tick(1);

            expect(player.resume).not.toHaveBeenCalledTimes(1);
          });

          it('auto-resume is not cancelled by a paused event state', function () {
            startPlaybackAndPause(20, false);

            for (var index = 0; index < mockCallback.length; index++) {
              mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED});
            }

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).toHaveBeenCalledTimes(1);
          });

          it('auto-resume is not cancelled by a status event', function () {
            startPlaybackAndPause(20, false);

            for (var index = 0; index < mockCallback.length; index++) {
              mockCallback[index]({type: MediaPlayerBase.EVENT.STATUS});
            }

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).toHaveBeenCalledTimes(1);
          });

          it('will fake pause if attempting to pause at the start of playback ', function () {
            player.getCurrentTime.and.returnValue(0);
            startPlaybackAndPause(0, false);

            expect(player.toPaused).toHaveBeenCalledTimes(1);
            expect(player.toPlaying).toHaveBeenCalledTimes(1);
          });

          it('time spend buffering is deducted when considering time to auto-resume', function () {
            startPlaybackAndPause(0, false);

            seekableMediaPlayer.resume();
            player.resume.calls.reset();

            for (var index = 0; index < mockCallback.length; index++) {
              mockCallback[index]({state: MediaPlayerBase.STATE.BUFFERING, currentTime: 20});
            }

            jasmine.clock().tick(11 * 1000);

            for (index = 0; index < mockCallback.length; index++) {
              mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING, currentTime: 20});
            }
            player.getSeekableRange.and.returnValue({start: 20});

            seekableMediaPlayer.pause();

            jasmine.clock().tick(3 * 1000);

            expect(player.toPlaying).toHaveBeenCalledTimes(1);
          });

          it('does not calls autoresume immeditetly if paused after an auto-resume with disableAutoResume options', function () {
            startPlaybackAndPause(20, true);

            jasmine.clock().tick(12 * 1000);

            jasmine.clock().tick(1);

            expect(player.resume).not.toHaveBeenCalledTimes(1);
          });

          it('Should auto resume when paused after a seek', function () {
            player.getSeekableRange.and.returnValue({start: 0});
            player.getCurrentTime.and.returnValue(100);

            startPlaybackAndPause(100, false);

            player.getCurrentTime.and.returnValue(50);
            player.getState.and.returnValue(MediaPlayerBase.STATE.PAUSED);

            seekableMediaPlayer.playFrom(50);

            jasmine.clock().tick(42 * 1000);

            expect(player.resume).toHaveBeenCalledTimes(1);
          });
        });
      });
    });

