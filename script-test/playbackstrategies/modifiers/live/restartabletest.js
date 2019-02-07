require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'squire'
  ],
      function (MediaPlayerBase, Squire) {
        var sourceContainer = document.createElement('div');
        var player;
        var restartableMediaConstructor;
        var restartableMediaPlayer;

        function wrapperTests (action) {
          restartableMediaPlayer[action]();

          expect(player[action]).toHaveBeenCalled();
        }

        function getLivePlayer (config, logger) {
          restartableMediaPlayer = restartableMediaConstructor(config, logger);
        }

        describe('restartable HMTL5 Live Player', function () {
          beforeEach(function (done) {
            var injector = new Squire();

            player = jasmine.createSpyObj('player',
              ['beginPlayback', 'initialiseMedia', 'stop', 'reset', 'getState', 'getSource', 'getMimeType',
                'addEventCallback', 'removeEventCallback', 'removeAllEventCallbacks', 'getPlayerElement', 'pause',
                'resume', 'beginPlaybackFrom' ]);

            function mockMediaPlayer () {
              return player;
            }

            injector.mock({'bigscreenplayer/playbackstrategy/modifiers/html5': mockMediaPlayer});

            injector.require(['bigscreenplayer/playbackstrategy/modifiers/live/restartable'], function (mediaPlayer) {
              restartableMediaConstructor = mediaPlayer;
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
              restartableMediaPlayer.addEventCallback(thisArg, callback);

              expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback);
            });

            it('calls removeEventCallback on the media player', function () {
              var thisArg = 'arg';
              var callback = function () { return; };
              restartableMediaPlayer.removeEventCallback(thisArg, callback);

              expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback);
            });

            it('calls removeAllEventCallbacks on the media player', function () {
              wrapperTests('removeAllEventCallbacks');
            });

            it('calls getPlayerElement on the media player', function () {
              wrapperTests('getPlayerElement');
            });

            it('calls pause on the media player', function () {
              wrapperTests('pause');
            });
          });

          describe('calls the mediaplayer with the correct media Type', function () {
            beforeEach(function () {
              getLivePlayer();
            });

            it('all non-live and live video and audio', function () {
              restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, '', '', sourceContainer);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);

              restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, '', '', sourceContainer);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);

              restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);

              restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_AUDIO, '', '', sourceContainer);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);
            });
          });

          describe('Restartable features', function () {
            it('begins playback with the desired offset', function () {
              getLivePlayer();
              var offset = 10;

              restartableMediaPlayer.beginPlaybackFrom(offset);

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

              restartableMediaPlayer.beginPlayback();

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

              restartableMediaPlayer.beginPlayback();

              expect(player.beginPlayback).not.toHaveBeenCalledWith(Infinity);
            });
          });

          describe('Internal Methods to monitor buffering', function () {
            var mockCallback = [];
            beforeEach(function () {
              jasmine.clock().install();
              jasmine.clock().mockDate();

              getLivePlayer();

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
              restartableMediaPlayer.beginPlaybackFrom(20);
              restartableMediaPlayer.pause({disableAutoResume: false});

              jasmine.clock().tick(12 * 1000);

              expect(player.resume).toHaveBeenCalledWith();
            });

            it('does not call resume when approaching the start of the buffer with the disableAutoResume option', function () {
              restartableMediaPlayer.beginPlaybackFrom(20);
              restartableMediaPlayer.pause({disableAutoResume: true});

              jasmine.clock().tick(12 * 1000);

              expect(player.resume).not.toHaveBeenCalledWith();
            });

            it('does not call resume if paused after the auto resume point', function () {
              restartableMediaPlayer.beginPlaybackFrom(20);
              restartableMediaPlayer.pause();

              jasmine.clock().tick(2 * 1000);

              expect(player.resume).not.toHaveBeenCalledWith();
            });

            it('does not autoplay if the video is no longer paused', function () {
              restartableMediaPlayer.beginPlaybackFrom(20);
              restartableMediaPlayer.pause();

              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING});
              }

              jasmine.clock().tick(12 * 1000);

              expect(player.resume).not.toHaveBeenCalledTimes(2);
            });

            it('Calls resume when paused is called multiple times', function () {
              restartableMediaPlayer.beginPlayback();
              restartableMediaPlayer.pause();

              var event = {state: MediaPlayerBase.STATE.PLAYING, currentTime: 25};
              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index](event);
              }

              restartableMediaPlayer.pause();

              event.currentTime = 30;
              for (index = 0; index < mockCallback.length; index++) {
                mockCallback[index](event);
              }

              restartableMediaPlayer.pause();
              // uses real time to determine pause intervals
              // if debugging the time to the buffer will be decreased by the time spent.
              jasmine.clock().tick(22 * 1000);

              expect(player.resume).toHaveBeenCalledTimes(1);
            });

            it('calls autoresume immeditetly if paused after an autoresume', function () {
              restartableMediaPlayer.beginPlaybackFrom(20);
              restartableMediaPlayer.pause();

              jasmine.clock().tick(12 * 1000);

              restartableMediaPlayer.pause();

              jasmine.clock().tick(1);

              expect(player.resume).toHaveBeenCalledTimes(2);
            });

            it('autoresume is not cancelled by a paused event state', function () {
              restartableMediaPlayer.beginPlaybackFrom(20);
              restartableMediaPlayer.pause();

              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED});
              }

              jasmine.clock().tick(12 * 1000);

              expect(player.resume).toHaveBeenCalledTimes(1);
            });

            it('time spend buffering is deducted when considering time to autoresume', function () {
              restartableMediaPlayer.beginPlaybackFrom(20);

              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.BUFFERING, currentTime: 20});
              }

              jasmine.clock().tick(11 * 1000);

              for (index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING, currentTime: 20});
              }

              restartableMediaPlayer.pause();

              jasmine.clock().tick(1 * 1000);

              expect(player.resume).toHaveBeenCalledTimes(1);
            });
          });

          describe('behaves approapriately near the start of the window', function () {
             // tests for buffering near the start of the window
          });
        });
      });
