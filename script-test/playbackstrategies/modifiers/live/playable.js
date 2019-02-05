/*
 *  playable live modfifier is just a wrapper around html5
 *  So no further logical testing is required for unit tests
 *  providing that hml5 is properly tested
 */

require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase',
    'squire'
  ],
    function (MediaPlayerBase, Squire) {
      var sourceContainer = document.createElement('div');
      var player;
      var playableMediaPlayer;

      describe('Playable HMTL5 Live Player', function () {
        beforeEach(function (done) {
          var injector = new Squire();

          player = jasmine.createSpyObj('player',
            ['beginPlayback', 'initialiseMedia', 'stop', 'reset', 'getState', 'getSource', 'getMimeType',
              'addEventCallback', 'removeEventCallback', 'removeAllEventCallbacks', 'getPlayerElement']);

          function mockMediaPlayer () {
            return player;
          }

          injector.mock({'bigscreenplayer/playbackstrategy/modifiers/html5': mockMediaPlayer});

          injector.require(['bigscreenplayer/playbackstrategy/modifiers/live/playable'], function (mediaPlayer) {
            playableMediaPlayer = mediaPlayer();
            done();
          });
        });

        describe('methods call the appropriate media player methods', function () {
          it('calls beginPlayback on the media player', function () {
            playableMediaPlayer.beginPlayback();

            expect(player.beginPlayback).toHaveBeenCalledTimes(1);
          });

          it('calls initialiseMedia on the media player', function () {
            playableMediaPlayer.initialiseMedia();

            expect(player.initialiseMedia).toHaveBeenCalledTimes(1);
          });

          it('calls stop on the media player', function () {
            playableMediaPlayer.stop();

            expect(player.stop).toHaveBeenCalledTimes(1);
          });

          it('calls reset on the media player', function () {
            playableMediaPlayer.reset();

            expect(player.reset).toHaveBeenCalledTimes(1);
          });

          it('calls getState on the media player', function () {
            playableMediaPlayer.getState();

            expect(player.getState).toHaveBeenCalledTimes(1);
          });

          it('calls getSource on the media player', function () {
            playableMediaPlayer.getSource();

            expect(player.getSource).toHaveBeenCalledTimes(1);
          });

          it('calls getMimeType on the media player', function () {
            playableMediaPlayer.getMimeType();

            expect(player.getMimeType).toHaveBeenCalledTimes(1);
          });

          it('calls addEventCallback on the media player', function () {
            var thisArg = 'arg';
            var callback = function () { return; };
            playableMediaPlayer.addEventCallback(thisArg, callback);

            expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback);
          });

          it('calls removeEventCallback on the media player', function () {
            var thisArg = 'arg';
            var callback = function () { return; };
            playableMediaPlayer.removeEventCallback(thisArg, callback);

            expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback);
          });

          it('calls removeAllEventCallbacks on the media player', function () {
            playableMediaPlayer.removeAllEventCallbacks();

            expect(player.removeAllEventCallbacks).toHaveBeenCalledTimes(1);
          });

          it('calls getPlayerElement on the media player', function () {
            playableMediaPlayer.getPlayerElement();

            expect(player.getPlayerElement).toHaveBeenCalledTimes(1);
          });
        });

        describe('calls the mediaplayer with the correct media Type', function () {
          it('when is an audio stream', function () {
            var mediaType = MediaPlayerBase.TYPE.AUDIO;
            playableMediaPlayer.initialiseMedia(mediaType, null, null, sourceContainer, null);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_AUDIO, null, null, sourceContainer, null);
          });

          it('when is an video stream', function () {
            var mediaType = MediaPlayerBase.TYPE.VIDEO;
            playableMediaPlayer.initialiseMedia(mediaType, null, null, sourceContainer, null);

            expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, null, null, sourceContainer, null);
          });
        });
      });
    });
