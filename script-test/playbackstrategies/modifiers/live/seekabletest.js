require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'squire'
  ],
    function (MediaPlayerBase, Squire) {
      var sourceContainer = document.createElement('div');
      var player;
      var seekableMediaConstructor;
      var seekableMediaPlayer;

      function wrapperTests (action) {
        seekableMediaPlayer[action]();

        expect(player[action]).toHaveBeenCalled();
      }

      function getLivePlayer (config, logger) {
        seekableMediaPlayer = seekableMediaConstructor(config, logger);
      }

      describe('Seekable HMTL5 Live Player', function () {
        beforeEach(function (done) {
          var injector = new Squire();

          player = jasmine.createSpyObj('player',
            ['beginPlayback', 'initialiseMedia', 'stop', 'reset', 'getState', 'getSource', 'getMimeType',
              'addEventCallback', 'removeEventCallback', 'removeAllEventCallbacks', 'getPlayerElement', 'pause',
              'resume', 'beginPlaybackFrom', 'playFrom', 'getCurrentTime', 'getSeekableRange', 'toPaused',
              'toPlaying']);

          function mockMediaPlayer () {
            return player;
          }

          injector.mock({'bigscreenplayer/playbackstrategy/modifiers/html5': mockMediaPlayer});

          injector.require(['bigscreenplayer/playbackstrategy/modifiers/live/seekable'], function (mediaPlayer) {
            seekableMediaConstructor = mediaPlayer;
            done();
          });
        });

        describe('methods call the appropriate media player methods', function () {
          beforeEach(function () {
            getLivePlayer();
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
            wrapperTests('getState');
          });

          it('calls getSource on the media player', function () {
            wrapperTests('getSource');
          });

          it('calls getMimeType on the media player', function () {
            wrapperTests('getMimeType');
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
        });

        describe('Restartable features', function () {
          it('begins playback with the desired offset', function () {
            getLivePlayer();
            var offset = 10;

            seekableMediaPlayer.beginPlaybackFrom(offset);

            expect(player.beginPlaybackFrom).toHaveBeenCalledWith(offset);
          });

          it('should respect config forcing playback from the end of the window', function () {
            var config = {
              streaming: {
                overrides: {
                  forceBeginPlaybackToEndOfWindow: true
                }
              }
            };
            getLivePlayer(config);

            seekableMediaPlayer.beginPlayback();

            expect(player.beginPlaybackFrom).toHaveBeenCalledWith(Infinity);
          });

          it('should playback normally if no config values are inhibiting', function () {
            var config = {
              streaming: {
                overrides: {
                  forceBeginPlaybackToEndOfWindow: false
                }
              }
            };
            getLivePlayer(config);

            seekableMediaPlayer.beginPlayback();

            expect(player.beginPlayback).not.toHaveBeenCalledWith(Infinity);
          });
        });

        describe('calls the mediaplayer with the correct media Type', function () {
          beforeEach(function () {
            getLivePlayer();
          });

          it('all non-live and live video and audio', function () {
            seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, '', '', sourceContainer);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);

            seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, '', '', sourceContainer);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);

            seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);

            seekableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_AUDIO, '', '', sourceContainer);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);
          });
        });

        describe('Internal Methods to monitor buffering', function () {
          var mockCallback = [];
          beforeEach(function () {
            jasmine.clock().install();
            jasmine.clock().mockDate();

            getLivePlayer();

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
            // Buffering and time out tests here
          it('calls resume when approaching the start of the buffer', function () {
            seekableMediaPlayer.beginPlaybackFrom(20);
            seekableMediaPlayer.pause({disableAutoResume: false});

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).toHaveBeenCalledWith();
          });

          it('does not call resume when approaching the start of the buffer with the disableAutoResume option', function () {
            seekableMediaPlayer.beginPlaybackFrom(20);
            seekableMediaPlayer.pause({disableAutoResume: true});

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).not.toHaveBeenCalledWith();
          });

          it('does not call resume if paused after the auto resume point', function () {
            seekableMediaPlayer.beginPlaybackFrom(20);
            seekableMediaPlayer.pause();

            jasmine.clock().tick(2 * 1000);

            expect(player.resume).not.toHaveBeenCalledWith();
          });

          it('does not autoplay if the video is no longer paused', function () {
            seekableMediaPlayer.beginPlaybackFrom(20);
            seekableMediaPlayer.pause();

            for (var index = 0; index < mockCallback.length; index++) {
              mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING});
            }

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).not.toHaveBeenCalledTimes(2);
          });

          it('Calls resume when paused is called multiple times', function () {
            seekableMediaPlayer.beginPlayback();
            seekableMediaPlayer.pause();

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

          it('calls autoresume immeditetly if paused after an autoresume', function () {
            seekableMediaPlayer.beginPlaybackFrom(20);
            seekableMediaPlayer.pause();

            jasmine.clock().tick(12 * 1000);

            player.getSeekableRange.and.returnValue({start: 12});

            seekableMediaPlayer.pause();

            jasmine.clock().tick(1);

            expect(player.resume).toHaveBeenCalledTimes(1);
            expect(player.toPaused).toHaveBeenCalledTimes(1);
            expect(player.toPlaying).toHaveBeenCalledTimes(1);
          });

          it('does not calls autoresume immeditetly if paused after an autoresume with disableAutoResume options', function () {
            seekableMediaPlayer.beginPlaybackFrom(20);
            seekableMediaPlayer.pause({disableAutoResume: true});

            jasmine.clock().tick(12 * 1000);
            player.getSeekableRange.and.returnValue({start: 12});

            jasmine.clock().tick(1);

            expect(player.resume).not.toHaveBeenCalledTimes(1);
          });

          it('autoresume is not cancelled by a paused event state', function () {
            seekableMediaPlayer.beginPlaybackFrom(20);
            seekableMediaPlayer.pause();

            for (var index = 0; index < mockCallback.length; index++) {
              mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED});
            }

            jasmine.clock().tick(12 * 1000);

            expect(player.resume).toHaveBeenCalledTimes(1);
          });

          it('will fake pause if attempting to pause at the start of playback ', function () {
            player.getCurrentTime.and.returnValue(0);
            seekableMediaPlayer.beginPlayback();
            seekableMediaPlayer.pause();

            expect(player.toPaused).toHaveBeenCalledTimes(1);
            expect(player.toPlaying).toHaveBeenCalledTimes(1);
          });
        });
      });
    });

