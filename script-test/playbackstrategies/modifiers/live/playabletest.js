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

      function wrapperTests (action) {
        playableMediaPlayer[action]();

        expect(player[action]).toHaveBeenCalled();
      }

      function isUndefined (action) {
        expect(playableMediaPlayer[action]).not.toBeDefined();
      }

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
          wrapperTests('addEventCallback', 'args', function () { return; });
        });

        it('calls removeEventCallback on the media player', function () {
          wrapperTests('removeEventCallback', 'args', function () { return; });
        });

        it('calls removeAllEventCallbacks on the media player', function () {
          wrapperTests('removeAllEventCallbacks');
        });

        it('calls getPlayerElement on the media player', function () {
          wrapperTests('getPlayerElement');
        });

        describe('should not have methods for', function () {
          it('beginPlaybackFrom', function () {
            isUndefined('beginPlaybackFrom');
          });

          it('playFrom', function () {
            isUndefined('playFrom');
          });

          it('pause', function () {
            isUndefined('pause');
          });

          it('resume', function () {
            isUndefined('resume');
          });

          it('getCurrentTime', function () {
            isUndefined('getCurrentTime');
          });

          it('paugetSeekableRangese', function () {
            isUndefined('getSeekableRange');
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
