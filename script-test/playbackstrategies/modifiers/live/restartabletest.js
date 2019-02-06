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
              // Buffering and time out tests here
          });

          describe('behaves approapriately near the start of the window', function () {
             // tests for buffering near the start of the window
          });
        });
      });
