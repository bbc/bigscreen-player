require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'bigscreenplayer/playbackstrategy/modifiers/live/restartable',
    'bigscreenplayer/models/windowtypes'
  ],
      function (MediaPlayerBase, RestartableMediaPlayer, WindowTypes) {
        var sourceContainer = document.createElement('div');
        var player;
        var restartableMediaPlayer;

        function initialiseRestartableMediaPlayer (config, windowType) {
          windowType = windowType || WindowTypes.SLIDING;
          restartableMediaPlayer = RestartableMediaPlayer(player, config, windowType);
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

          beforeEach(function () {
            player = jasmine.createSpyObj('player',
              ['beginPlayback', 'initialiseMedia', 'stop', 'reset', 'getState', 'getSource', 'getMimeType',
                'addEventCallback', 'removeEventCallback', 'removeAllEventCallbacks', 'getPlayerElement', 'pause',
                'resume', 'beginPlaybackFrom', 'getSeekableRange']);
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

              expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, jasmine.any(Function));
            });

            it('calls removeEventCallback on the media player', function () {
              var thisArg = 'arg';
              var callback = function () { return; };
              restartableMediaPlayer.addEventCallback(thisArg, callback);
              restartableMediaPlayer.removeEventCallback(thisArg, callback);

              expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, jasmine.any(Function));
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
          });

          describe('should use fake time for', function () {
            var timeUpdate;

            beforeEach(function () {
              jasmine.clock().install();
              jasmine.clock().mockDate();

              player.addEventCallback.and.callFake(function (self, callback) {
                timeUpdate = callback;
              });

              initialiseRestartableMediaPlayer();
              restartableMediaPlayer.addEventCallback(this, function () {});
              player.getSeekableRange.and.returnValue({start: 0, end: 100});
            });

            afterEach(function () {
              jasmine.clock().uninstall();
            });

            describe('getCurrentTime', function () {
              it('should be set on first time update to the end of the seekable range', function () {
                restartableMediaPlayer.beginPlayback();

                expect(restartableMediaPlayer.getCurrentTime()).toBe(undefined);

                timeUpdate({ state: MediaPlayerBase.STATE.PLAYING });

                expect(restartableMediaPlayer.getCurrentTime()).toBe(100);
              });

              it('should start at supplied time', function () {
                restartableMediaPlayer.beginPlaybackFrom(10);

                expect(restartableMediaPlayer.getCurrentTime()).toBe(10);
              });

              it('should increase when playing', function () {
                restartableMediaPlayer.beginPlaybackFrom(10);

                timeUpdate({ state: MediaPlayerBase.STATE.PLAYING });

                jasmine.clock().tick(1000);

                timeUpdate({ state: MediaPlayerBase.STATE.PLAYING });

                expect(restartableMediaPlayer.getCurrentTime()).toBe(11);
              });

              it('should not increase when paused', function () {
                restartableMediaPlayer.beginPlaybackFrom(10);
                timeUpdate({ state: MediaPlayerBase.STATE.PAUSED });

                jasmine.clock().tick(1000);

                timeUpdate({ state: MediaPlayerBase.STATE.PLAYING });

                expect(restartableMediaPlayer.getCurrentTime()).toBe(10);
              });
            });

            describe('getSeekableRange', function () {
              it('should start at the window time', function () {
                restartableMediaPlayer.beginPlaybackFrom(0);

                timeUpdate({ state: MediaPlayerBase.STATE.PLAYING });

                expect(restartableMediaPlayer.getSeekableRange()).toEqual({ start: 0, end: 100 });
              });

              it('should increase with time', function () {
                restartableMediaPlayer.beginPlaybackFrom(0);

                timeUpdate({ state: MediaPlayerBase.STATE.PLAYING });

                jasmine.clock().tick(1000);

                expect(restartableMediaPlayer.getSeekableRange()).toEqual({ start: 1, end: 101 });
              });

              it('should not increase start for growing', function () {
                initialiseRestartableMediaPlayer({}, WindowTypes.GROWING);
                restartableMediaPlayer.beginPlaybackFrom(0);
                timeUpdate({ state: MediaPlayerBase.STATE.PLAYING });
                jasmine.clock().tick(1000);

                expect(restartableMediaPlayer.getSeekableRange()).toEqual({ start: 0, end: 101 });
              });
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

              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING});
              }

              restartableMediaPlayer.pause({disableAutoResume: disableAutoResume});

              for (index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PAUSED});
              }
            }

            beforeEach(function () {
              jasmine.clock().install();
              jasmine.clock().mockDate();

              player.addEventCallback.and.callFake(function (self, callback) {
                mockCallback.push(callback);
              });

              initialiseRestartableMediaPlayer();

              player.getSeekableRange.and.returnValue({start: 0, end: 100});

              for (var index = 0; index < mockCallback.length; index++) {
                mockCallback[index]({state: MediaPlayerBase.STATE.PLAYING});
              }
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
