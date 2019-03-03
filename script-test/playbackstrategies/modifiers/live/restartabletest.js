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

        function initialiseRestartableMediaPlayer (config, logger) {
          restartableMediaPlayer = restartableMediaConstructor(config, logger);
        }

        describe('restartable HMTL5 Live Player', function () {
          function wrapperTests (action, expectedReturn) {
            if (expectedReturn) {
              player[action].and.returnValue(expectedReturn);

              expect(restartableMediaPlayer[action]()).toBe(expectedReturn);
            } else {
              restartableMediaPlayer[action]();

              expect(player[action]).toHaveBeenCalledTimes(1);
            }
          }

          beforeEach(function (done) {
            var injector = new Squire();

            player = jasmine.createSpyObj('player',
              ['beginPlayback', 'initialiseMedia', 'stop', 'reset', 'getState', 'getSource', 'getMimeType',
                'addEventCallback', 'removeEventCallback', 'removeAllEventCallbacks', 'getPlayerElement', 'pause',
                'resume', 'beginPlaybackFrom', 'getCurrentTime']);

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
              initialiseRestartableMediaPlayer();
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
              wrapperTests('getPlayerElement', 'thisPlayerElement');
            });

            it('calls pause on the media player', function () {
              wrapperTests('pause');
            });
          });

          describe('should not have methods for', function () {
            function isUndefined (action) {
              expect(restartableMediaPlayer[action]).not.toBeDefined();
            }

            beforeEach(function () {
              initialiseRestartableMediaPlayer();
            });

            it('playFrom', function () {
              isUndefined('playFrom');
            });

            it('getCurrentTime', function () {
              isUndefined('getCurrentTime');
            });

            it('getSeekableRange', function () {
              isUndefined('getSeekableRange');
            });
          });

          describe('calls the mediaplayer with the correct media Type', function () {
            beforeEach(function () {
              initialiseRestartableMediaPlayer();
            });

            it('for static video', function () {
              restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, '', '', sourceContainer);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);
            });

            it('for live video', function () {
              restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, '', '', sourceContainer, undefined);
            });

            it('for static audio', function () {
              restartableMediaPlayer.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, '', '', sourceContainer);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_AUDIO, '', '', sourceContainer, undefined);
            });
          });

          describe('Restartable features', function () {
            it('begins playback with the desired offset', function () {
              initialiseRestartableMediaPlayer();
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
              initialiseRestartableMediaPlayer(config);

              restartableMediaPlayer.beginPlayback();

              expect(player.beginPlaybackFrom).toHaveBeenCalledWith(Infinity);
            });
          });

          describe('Pausing and Auto-Resume', function () {
            var mockCallback = [];

            function startPlaybackAndPause (startTime, disableAutoResume) {
              restartableMediaPlayer.beginPlaybackFrom(startTime);
              restartableMediaPlayer.pause({disableAutoResume: disableAutoResume});
            }

            beforeEach(function () {
              jasmine.clock().install();
              jasmine.clock().mockDate();

              player.addEventCallback.and.callFake(function (self, callback) {
                mockCallback.push(callback);
              });

              initialiseRestartableMediaPlayer();
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

              jasmine.clock().tick(12 * 1000);

              expect(player.resume).not.toHaveBeenCalledWith();
            });

            it('does not call resume if paused after the autoresume point', function () {
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

              expect(player.resume).not.toHaveBeenCalledTimes(2);
            });

            it('Calls resume when paused is called multiple times', function () {
              startPlaybackAndPause(0, false);

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

            it('calls auto-resume immeditetly if paused after an autoresume', function () {
              startPlaybackAndPause(20, false);

              jasmine.clock().tick(12 * 1000);

              restartableMediaPlayer.pause();

              jasmine.clock().tick(1);

              expect(player.resume).toHaveBeenCalledTimes(2);
            });

            it('auto-resume is not cancelled by a paused event state', function () {
              startPlaybackAndPause(20, false);

              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED});
              }

              jasmine.clock().tick(12 * 1000);

              expect(player.resume).toHaveBeenCalledTimes(1);
            });

            it('will fake pause if attempting to pause at the start of playback ', function () {
              startPlaybackAndPause(0, false);

              jasmine.clock().tick(1);

              expect(player.pause).toHaveBeenCalledTimes(1);
              expect(player.resume).toHaveBeenCalledTimes(1);
            });

            it('does not calls autoresume immeditetly if paused after an auto-resume with disableAutoResume options', function () {
              startPlaybackAndPause(20, true);

              jasmine.clock().tick(12 * 1000);

              jasmine.clock().tick(1);

              expect(player.resume).not.toHaveBeenCalledTimes(1);
            });

            it('time spend buffering is deducted when considering time to auto-resume', function () {
              restartableMediaPlayer.beginPlaybackFrom(20);

              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.BUFFERING, currentTime: 20});
              }

              jasmine.clock().tick(11 * 1000);

              for (index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING, currentTime: 20});
              }

              restartableMediaPlayer.pause();

              jasmine.clock().tick(3 * 1000);

              expect(player.resume).toHaveBeenCalledTimes(1);
            });
          });
        });
      });
