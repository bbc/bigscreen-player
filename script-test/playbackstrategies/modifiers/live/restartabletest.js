require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'squire'
  ],
      function (MediaPlayerBase, Squire) {
        var sourceContainer = document.createElement('div');
        var player;
        var playableMediaPlayer;

        describe('restartable HMTL5 Live Player', function () {
          function getLivePlayer (config, logger) {
            return playableMediaPlayer(config, logger);
          }

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
              playableMediaPlayer = mediaPlayer;
              done();
            });
          });

          describe('methods call the appropriate media player methods', function () {
            var livePlayer;
            // var logger = jasmine.createSpy('logger');

            beforeEach(function () {
              var config;
              var logger;
              livePlayer = getLivePlayer(config, logger);
            });

            it('calls beginPlayback on the media player', function () {
              livePlayer.beginPlayback();

              expect(player.beginPlayback).toHaveBeenCalledTimes(1);
            });

            it('calls initialiseMedia on the media player', function () {
              livePlayer.initialiseMedia();

              expect(player.initialiseMedia).toHaveBeenCalledTimes(1);
            });

            it('calls stop on the media player', function () {
              livePlayer.stop();

              expect(player.stop).toHaveBeenCalledTimes(1);
            });

            it('calls reset on the media player', function () {
              livePlayer.reset();

              expect(player.reset).toHaveBeenCalledTimes(1);
            });

            it('calls getState on the media player', function () {
              livePlayer.getState();

              expect(player.getState).toHaveBeenCalledTimes(1);
            });

            it('calls getSource on the media player', function () {
              livePlayer.getSource();

              expect(player.getSource).toHaveBeenCalledTimes(1);
            });

            it('calls getMimeType on the media player', function () {
              livePlayer.getMimeType();

              expect(player.getMimeType).toHaveBeenCalledTimes(1);
            });

            it('calls addEventCallback on the media player', function () {
              var thisArg = 'arg';
              var callback = function () { return; };
              livePlayer.addEventCallback(thisArg, callback);

              expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback);
            });

            it('calls removeEventCallback on the media player', function () {
              var thisArg = 'arg';
              var callback = function () { return; };
              livePlayer.removeEventCallback(thisArg, callback);

              expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback);
            });

            it('calls removeAllEventCallbacks on the media player', function () {
              livePlayer.removeAllEventCallbacks();

              expect(player.removeAllEventCallbacks).toHaveBeenCalledTimes(1);
            });

            it('calls getPlayerElement on the media player', function () {
              livePlayer.getPlayerElement();

              expect(player.getPlayerElement).toHaveBeenCalledTimes(1);
            });

            it('calls pause on the media player', function () {
              livePlayer.pause();

              expect(player.pause).toHaveBeenCalledTimes(1);
            });

            it('calls getPlayerElement on the media player', function () {
              livePlayer.resume();

              expect(player.resume).toHaveBeenCalledTimes(1);
            });
          });

          describe('calls the mediaplayer with the correct media Type', function () {
            var livePlayer;

            beforeEach(function () {
              var config;
              var logger;
              livePlayer = getLivePlayer(config, logger);
            });

            it('when is an audio stream', function () {
              var mediaType = MediaPlayerBase.TYPE.AUDIO;
              livePlayer.initialiseMedia(mediaType, null, null, sourceContainer, null);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_AUDIO, null, null, sourceContainer, null);
            });

            it('when is an video stream', function () {
              var mediaType = MediaPlayerBase.TYPE.VIDEO;
              livePlayer.initialiseMedia(mediaType, null, null, sourceContainer, null);

              expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, null, null, sourceContainer, null);
            });
          });

          describe('Restartable features', function () {
            it('begins playback with the desired offset', function () {
              var livePlayer = getLivePlayer();
              var offset = 10;

              livePlayer.beginPlaybackFrom(offset);

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
              var livePlayer = getLivePlayer(config);

              livePlayer.beginPlayback();

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
              var livePlayer = getLivePlayer(config, null);

              livePlayer.beginPlayback();

              expect(player.beginPlayback).not.toHaveBeenCalledWith(Infinity);
            });
          });
        });
      });
