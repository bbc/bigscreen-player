require(
  [
    'squire',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/mediastate'
  ],
  function (Squire, WindowTypes, MediaState) {
    var MediaPlayerEvent = {
      STOPPED: 'stopped',   // Event fired when playback is stopped
      BUFFERING: 'buffering', // Event fired when playback has to suspend due to buffering
      PLAYING: 'playing',   // Event fired when starting (or resuming) playing of the media
      PAUSED: 'paused',    // Event fired when media playback pauses
      COMPLETE: 'complete',  // Event fired when media playback has reached the end of the media
      ERROR: 'error',     // Event fired when an error condition occurs
      STATUS: 'status',    // Event fired regularly during play
      SEEK_ATTEMPTED: 'seek-attempted', // Event fired when a device using a seekfinishedemitevent modifier sets the source
      SEEK_FINISHED: 'seek-finished'    // Event fired when a device using a seekfinishedemitevent modifier has seeked successfully
    };

    var MediaPlayerState = {
      EMPTY: 'EMPTY',     // No source set
      STOPPED: 'STOPPED',   // Source set but no playback
      BUFFERING: 'BUFFERING', // Not enough data to play, waiting to download more
      PLAYING: 'PLAYING',   // Media is playing
      PAUSED: 'PAUSED',    // Media is paused
      COMPLETE: 'COMPLETE',  // Media has reached its end point
      ERROR: 'ERROR'      // An error occurred
    };

    describe('TAL Playback Strategy', function () {
      var talStrategy;
      var squiredTalStrategy;
      var mediaPlayer;
      var videoContainer;
      var eventCallbacks;

      var device = {
        getMediaPlayer: function () {
          return mediaPlayer;
        },
        getLivePlayer: function () {
          return mediaPlayer;
        },
        getConfig: function () {
          return {
            brand: 'default',
            model: 'webkit'
          };
        }
      };

      var injector = new Squire();

      var mockGlitchCurtainInstance = jasmine.createSpyObj('mockGlitchCurtain', ['showCurtain', 'hideCurtain', 'tearDown']);

      var mockGlitchCurtainConstructorInstance = function () {
        return mockGlitchCurtainInstance;
      };

      beforeEach(function (done) {
        injector.mock({
          'bigscreenplayer/playbackstrategy/liveglitchcurtain': mockGlitchCurtainConstructorInstance
        });
        injector.require(['bigscreenplayer/playbackstrategy/talstrategy'], function (TALStrategy) {
          squiredTalStrategy = TALStrategy;
          done();
        });
      });

      afterEach(function () {
        mockGlitchCurtainInstance.showCurtain.calls.reset();
        mockGlitchCurtainInstance.hideCurtain.calls.reset();
        mockGlitchCurtainInstance.tearDown.calls.reset();
      });

      // Options = windowType, playableDevice, timeCorrection, deviceReplacement, isUHD
      function setUpTalStrategy (opts) {
        var options = opts || {};

        var talDevice = options.deviceReplacement || device;

        var timeData = {correction: options.timeCorrection || 0};
        var windowType = options.windowType || WindowTypes.STATIC;
        var playableMediaPlayer = ['addEventCallback', 'initialiseMedia', 'beginPlayback', 'getState', 'resume', 'getPlayerElement', 'getSeekableRange', 'reset', 'stop', 'removeAllEventCallbacks', 'getSource', 'getMimeType'];
        var seekableMediaPlayer = playableMediaPlayer.concat(['beginPlaybackFrom', 'playFrom', 'pause']);

        mediaPlayer = jasmine.createSpyObj('mediaPlayer', options.playableDevice ? playableMediaPlayer : seekableMediaPlayer);

        mediaPlayer.addEventCallback.and.callFake(function (component, callback) {
          eventCallbacks = function (event) {
            callback.call(component, event);
          };
        });

        videoContainer = document.createElement('div');
        videoContainer.id = 'app';
        document.body.appendChild(videoContainer);

        talStrategy = squiredTalStrategy(windowType, undefined, timeData, videoContainer, options.isUHD, talDevice);
      }
      describe('transitions', function () {
        it('should pass back possible transitions', function () {
          setUpTalStrategy();

          expect(talStrategy.transitions).toEqual(jasmine.objectContaining({
            canBePaused: jasmine.any(Function),
            canBeStopped: jasmine.any(Function),
            canBeginSeek: jasmine.any(Function),
            canResume: jasmine.any(Function)
          }));
        });
      });

      describe('load', function () {
        it('should initialise the media player', function () {
          setUpTalStrategy();

          talStrategy.load('src', 'video/mp4', 0);

          expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith('video', 'src', 'video/mp4', videoContainer, jasmine.any(Object));
        });

        it('should begin playback from the passed in start time + time correction if we are watching live on a restartable device', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING, timeCorrection: 10});

          talStrategy.load('src', 'video/mp4', 50);

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(60);
        });

        it('should begin playback at the live point if no start time is passed in and we are watching live on a playable device', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING, playableDevice: true});

          talStrategy.load('src', 'video/mp4', undefined);

          expect(mediaPlayer.beginPlayback).toHaveBeenCalledWith();
        });

        it('should begin playback from the passed in start time if we are watching vod', function () {
          setUpTalStrategy();

          talStrategy.load('src', 'video/mp4', 50);

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(50);
        });

        it('should begin playback from if no start time is passed in when watching vod', function () {
          setUpTalStrategy();

          talStrategy.load('src', 'video/mp4', undefined);

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(0);
        });

        it('should disable sentinals if we are watching UHD and configured to do so', function () {
          var deviceReplacement = {
            getMediaPlayer: function () {
              return mediaPlayer;
            },
            getLivePlayer: function () {
              return mediaPlayer;
            },
            getConfig: function () {
              return {
                brand: 'default',
                model: 'webkit',
                streaming: {
                  liveUhdDisableSentinels: true
                }
              };
            }
          };

          setUpTalStrategy({windowType: WindowTypes.SLIDING, deviceReplacement: deviceReplacement, isUHD: true});

          talStrategy.load('src', 'video/mp4', undefined);

          var properties = mediaPlayer.initialiseMedia.calls.mostRecent().args[4];

          expect(properties.disableSentinels).toEqual(true);
        });
      });

      describe('play', function () {
        it('should play from 0 if the stream has ended', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          talStrategy.play();

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(0);
        });

        it('should resume if the player is in a paused or buffering state', function () {
          setUpTalStrategy();

          mediaPlayer.getState.and.returnValue(MediaPlayerState.PAUSED);

          talStrategy.play();

          expect(mediaPlayer.resume).toHaveBeenCalledWith();
        });

        it('should play from the current time if we are not ended, paused or buffering', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

          talStrategy.play();

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);
        });

        it('should play from the current time on live if we are not ended, paused or buffering', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING, timeCorrection: 10});

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

          talStrategy.play();

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);
        });
      });

      describe('pause', function () {
        it('should pause when we don\'t need to delay a call to pause', function () {
          setUpTalStrategy();

          talStrategy.pause({disableAutoResume: false});

          expect(mediaPlayer.pause).toHaveBeenCalledWith({disableAutoResume: false});
        });

        it('should not pause when we need to delay a call to pause', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'application/dash+xml', undefined);

          talStrategy.setCurrentTime(10);

          mediaPlayer.getState.and.returnValue(MediaPlayerState.BUFFERING);

          talStrategy.pause({disableAutoResume: false});

          expect(mediaPlayer.pause).not.toHaveBeenCalledWith({disableAutoResume: false});
        });
      });

      describe('isPaused', function () {
        it('should be set to false once we have loaded', function () {
          setUpTalStrategy();

          talStrategy.load('src', 'video/mp4', undefined);

          expect(talStrategy.isPaused()).toEqual(false);
        });

        it('should be set to false when we call play', function () {
          setUpTalStrategy();

          talStrategy.play();

          expect(talStrategy.isPaused()).toEqual(false);
        });

        it('should be set to false when we get a playing event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PLAYING});

          expect(talStrategy.isPaused()).toEqual(false);
        });

        it('should be set to false when we get a time update event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.STATUS});

          expect(talStrategy.isPaused()).toEqual(false);
        });

        it('should be set to true when we get a paused event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          expect(talStrategy.isPaused()).toEqual(true);
        });

        it('should be set to true when we get a ended event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(talStrategy.isPaused()).toEqual(true);
        });
      });

      describe('isEnded', function () {
        it('should be set to false on initialisation of the strategy', function () {
          setUpTalStrategy();

          expect(talStrategy.isEnded()).toEqual(false);
        });

        it('should be set to true when we get an ended event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(talStrategy.isEnded()).toEqual(true);
        });

        it('should be set to false when we get a playing event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PLAYING});

          expect(talStrategy.isEnded()).toEqual(false);
        });

        it('should be set to false when we get a waiting event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.BUFFERING});

          expect(talStrategy.isEnded()).toEqual(false);
        });

        it('should be set to true when we get a completed event then false when we start initial buffering from playing', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(talStrategy.isEnded()).toEqual(true);

          eventCallbacks({type: MediaPlayerEvent.BUFFERING});

          expect(talStrategy.isEnded()).toBe(false);
        });
      });

      describe('getDuration', function () {
        it('should be set to 0 on initialisation', function () {
          setUpTalStrategy();

          expect(talStrategy.getDuration()).toEqual(0);
        });

        it('should be updated by the playing event duration when the duration is undefined or 0', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10});

          expect(talStrategy.getDuration()).toEqual(10);
        });

        it('should use the local duration when the value is not undefined or 0', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10});

          expect(talStrategy.getDuration()).toEqual(10);

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 20});

          expect(talStrategy.getDuration()).toEqual(10);
        });
      });

      describe('getPlayerElement', function () {
        it('should return the mediaPlayer element', function () {
          setUpTalStrategy();

          var videoElement = document.createElement('video');

          mediaPlayer.getPlayerElement.and.returnValue(videoElement);

          expect(talStrategy.getPlayerElement()).toEqual(videoElement);
        });
      });

      describe('getSeekableRange', function () {
        it('should return the start as 0 and the end as the duration for vod', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10});

          expect(talStrategy.getSeekableRange()).toEqual({start: 0, end: 10});
        });

        it('should return the start/end from the player - time correction', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING, playableDevice: false, timeCorrection: 10});

          mediaPlayer.getSeekableRange.and.returnValue({start: 110, end: 1010});

          expect(talStrategy.getSeekableRange()).toEqual({start: 100, end: 1000});
        });

        it('should return the start/end from the player when the time correction is 0', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING, playableDevice: false, timeCorrection: 0});

          mediaPlayer.getSeekableRange.and.returnValue({start: 100, end: 1000});

          expect(talStrategy.getSeekableRange()).toEqual({start: 100, end: 1000});
        });
      });

      describe('getCurrentTime', function () {
        it('should be set to 0 on initialisation', function () {
          setUpTalStrategy();

          expect(talStrategy.getCurrentTime()).toEqual(0);
        });

        it('should be set when we get a playing event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, currentTime: 10});

          expect(talStrategy.getCurrentTime()).toEqual(10);
        });

        it('should be set with time correction when we get a playing event', function () {
          setUpTalStrategy({windowType: WindowTypes.STATIC, timeCorrection: 5});

          eventCallbacks({type: MediaPlayerEvent.PLAYING, currentTime: 10});

          expect(talStrategy.getCurrentTime()).toEqual(5);
        });

        it('should be set when we get a time update event', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

          expect(talStrategy.getCurrentTime()).toEqual(10);
        });

        it('should be set with time correction when we get a time update event', function () {
          setUpTalStrategy({windowType: WindowTypes.STATIC, timeCorrection: 5});

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

          expect(talStrategy.getCurrentTime()).toEqual(5);
        });
      });

      describe('setCurrentTime', function () {
        it('should set isEnded to false', function () {
          setUpTalStrategy();

          talStrategy.setCurrentTime(10);

          expect(talStrategy.isEnded()).toEqual(false);
        });

        it('should update currentTime to the time value passed in', function () {
          setUpTalStrategy();

          talStrategy.setCurrentTime(10);

          expect(talStrategy.getCurrentTime()).toEqual(10);
        });

        it('should seek to the time value passed in', function () {
          setUpTalStrategy();

          talStrategy.setCurrentTime(10);

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);
        });

        it('should seek to the time value passed in + time correction', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING, timeCorrection: 10});

          talStrategy.setCurrentTime(10);

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(20);
        });

        it('should pause after a seek if we were in a paused state, not watching dash and on a capable device', function () {
          setUpTalStrategy();

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          talStrategy.setCurrentTime(10);

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);

          expect(mediaPlayer.pause).toHaveBeenCalledWith();
        });

        it('should not pause after a seek if we are not on capable device and watching a dash stream', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'application/dash+xml', undefined);

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          talStrategy.setCurrentTime(10);

          expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);

          expect(mediaPlayer.pause).not.toHaveBeenCalledWith();
        });
      });

      describe('reset', function () {
        it('should reset the player', function () {
          setUpTalStrategy();

          talStrategy.reset();

          expect(mediaPlayer.reset).toHaveBeenCalledWith();
        });

        it('should stop the player if we are not in an unstoppable state', function () {
          setUpTalStrategy();

          talStrategy.reset();

          expect(mediaPlayer.stop).toHaveBeenCalledWith();
        });

        it('should not stop the player if we in an unstoppable state', function () {
          setUpTalStrategy();

          mediaPlayer.getState.and.returnValue(MediaPlayerState.EMPTY);

          talStrategy.reset();

          expect(mediaPlayer.stop).not.toHaveBeenCalledWith();
        });
      });

      describe('tearDown', function () {
        beforeEach(function () {
          setUpTalStrategy();

          talStrategy.tearDown();
        });

        it('should remove all event callbacks', function () {
          expect(mediaPlayer.removeAllEventCallbacks).toHaveBeenCalledWith();
        });

        it('should set isPaused to true', function () {
          expect(talStrategy.isPaused()).toEqual(true);
        });

        it('should set isEnded to false', function () {
          expect(talStrategy.isEnded()).toEqual(false);
        });
      });

      describe('live glitch curtain', function () {
        it('should show curtain for a live restart and we get a seek-attempted event', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'video/mp4', 10);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalled();
        });

        it('should show curtain for a live restart to 0 and we get a seek-attempted event', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'video/mp4', 0);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalled();
        });

        it('should not show curtain when playing from the live point and we get a seek-attempted event', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'video/mp4');

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).not.toHaveBeenCalled();
        });

        it('should show curtain when the forceBeginPlaybackToEndOfWindow config is set and the playback type is live', function () {
          var deviceReplacement = {
            getMediaPlayer: function () {
              return mediaPlayer;
            },
            getLivePlayer: function () {
              return mediaPlayer;
            },
            getConfig: function () {
              return {
                brand: 'default',
                model: 'webkit',
                streaming: {
                  overrides: {
                    forceBeginPlaybackToEndOfWindow: true
                  }
                }
              };
            }
          };

          setUpTalStrategy({windowType: WindowTypes.SLIDING, deviceReplacement: deviceReplacement});

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalled();
        });

        it('should not show curtain when the config overide is not set and we are playing live', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).not.toHaveBeenCalled();
        });

        it('should hide the curtain when we get a seek-finished event', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'video/mp4', 0);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalled();

          eventCallbacks({type: MediaPlayerEvent.SEEK_FINISHED});

          expect(mockGlitchCurtainInstance.hideCurtain).toHaveBeenCalled();
        });

        it('should tear down the curtain on strategy tearDown if it has been shown', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'video/mp4', 0);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          talStrategy.tearDown();

          expect(mockGlitchCurtainInstance.tearDown).toHaveBeenCalled();
        });
      });

      describe('dash live on error after exiting seek', function () {
        it('should reset the player', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          // set up the values handleErrorOnExitingSeek && exitingSeek so they are truthy then fire an error event so we restart.
          talStrategy.load('src', 'application/dash+xml', undefined);

          talStrategy.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.reset).toHaveBeenCalledWith();
        });

        it('should initialise the player', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'application/dash+xml', undefined);

          talStrategy.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith('video', 'src', 'application/dash+xml', videoContainer, jasmine.any(Object));
        });

        it('should begin playback from the currentTime', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'application/dash+xml', undefined);

          talStrategy.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(10);
        });

        it('should begin playback from the currentTime + time correction', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING, timeCorrection: 10});

          talStrategy.load('src', 'application/dash+xml', undefined);

          talStrategy.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(20);
        });
      });

      describe('delay pause until after seek', function () {
        it('should pause the player if we were in a paused state on dash live', function () {
          setUpTalStrategy({windowType: WindowTypes.SLIDING});

          talStrategy.load('src', 'application/dash+xml', undefined);

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          talStrategy.setCurrentTime(10);

          expect(mediaPlayer.pause).not.toHaveBeenCalledWith();

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: {start: 5}});

          expect(mediaPlayer.pause).toHaveBeenCalledWith();
        });

        it('should pause the player if we were in a paused state for devices with known issues', function () {
          var deviceReplacement = {
            getMediaPlayer: function () {
              return mediaPlayer;
            },
            getLivePlayer: function () {
              return mediaPlayer;
            },
            getConfig: function () {
              return {
                brand: 'default',
                model: 'webkit',
                capabilities: ['playFailsAfterPauseOnExitSeek']
              };
            }
          };
          setUpTalStrategy({deviceReplacement: deviceReplacement});

          talStrategy.load('src', 'video/mp4', undefined);

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          talStrategy.setCurrentTime(10);

          expect(mediaPlayer.pause).not.toHaveBeenCalledWith();

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: {start: 5}});

          expect(mediaPlayer.pause).toHaveBeenCalledWith();
        });
      });

      describe('events', function () {
        it('should publish a playing event', function () {
          setUpTalStrategy();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          talStrategy.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.PLAYING});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING);
        });

        it('should publish a paused event', function () {
          setUpTalStrategy();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          talStrategy.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED);
        });

        it('should publish a buffering event', function () {
          setUpTalStrategy();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          talStrategy.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.BUFFERING});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING);
        });

        it('should publish an ended event', function () {
          setUpTalStrategy();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          talStrategy.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED);
        });

        it('should publish a time update event', function () {
          setUpTalStrategy();

          var timeUpdateCallbackSpy = jasmine.createSpy('eventSpy');
          talStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.STATUS});

          expect(timeUpdateCallbackSpy).toHaveBeenCalledWith();
        });

        it('should publish an error event with history', function () {
          jasmine.clock().install();
          jasmine.clock().mockDate(new Date(Date.parse('2018-08-01T14:00:00.000Z')));

          setUpTalStrategy();

          var errorCallbackSpy = jasmine.createSpy('errorSpy');
          talStrategy.addErrorCallback(this, errorCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.PLAYING});
          jasmine.clock().tick(1000);
          eventCallbacks({type: MediaPlayerEvent.PAUSED});
          jasmine.clock().tick(1000);
          eventCallbacks({type: MediaPlayerEvent.BUFFERING});
          jasmine.clock().tick(1000);
          eventCallbacks({type: MediaPlayerEvent.ERROR, errorMessage: 'error'});

          var args = errorCallbackSpy.calls.mostRecent().args[0];

          expect(errorCallbackSpy).toHaveBeenCalledWith(jasmine.any(Object));
          expect(args.type).toEqual('error');
          expect(args.errorProperties.error_mssg).toEqual('error');
          expect(args.errorProperties.event_history_1).toEqual('buffering');
          expect(args.errorProperties.event_history_time_1).toEqual(1000);
          expect(args.errorProperties.event_history_2).toEqual('paused');
          expect(args.errorProperties.event_history_time_2).toEqual(2000);
          expect(args.errorProperties.hasOwnProperty('event_history_3')).toEqual(false);
          expect(args.errorProperties.hasOwnProperty('event_history_time_3')).toEqual(false);

          jasmine.clock().uninstall();
        });
      });
    });
  });
