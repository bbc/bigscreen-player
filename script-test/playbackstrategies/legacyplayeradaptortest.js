require(
  [
    'squire',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/mediasources',
    'bigscreenplayer/models/livesupport'
  ],
  function (Squire, WindowTypes, MediaState, MediaSources, LiveSupport) {
    var MediaPlayerEvent = {
      STOPPED: 'stopped', // Event fired when playback is stopped
      BUFFERING: 'buffering', // Event fired when playback has to suspend due to buffering
      PLAYING: 'playing', // Event fired when starting (or resuming) playing of the media
      PAUSED: 'paused', // Event fired when media playback pauses
      COMPLETE: 'complete', // Event fired when media playback has reached the end of the media
      ERROR: 'error', // Event fired when an error condition occurs
      STATUS: 'status', // Event fired regularly during play
      SEEK_ATTEMPTED: 'seek-attempted', // Event fired when a device using a seekfinishedemitevent modifier sets the source
      SEEK_FINISHED: 'seek-finished' // Event fired when a device using a seekfinishedemitevent modifier has seeked successfully
    };

    var MediaPlayerState = {
      EMPTY: 'EMPTY', // No source set
      STOPPED: 'STOPPED', // Source set but no playback
      BUFFERING: 'BUFFERING', // Not enough data to play, waiting to download more
      PLAYING: 'PLAYING', // Media is playing
      PAUSED: 'PAUSED', // Media is paused
      COMPLETE: 'COMPLETE', // Media has reached its end point
      ERROR: 'ERROR' // An error occurred
    };

    describe('Legacy Playback Adapter', function () {
      var legacyAdaptor;
      var squiredLegacyAdaptor;
      var mediaPlayer;
      var videoContainer;
      var eventCallbacks;
      var mockGlitchCurtainInstance;
      var testTimeCorrection = 0;

      var cdnArray = [];

      var injector = new Squire();

      var mockGlitchCurtainConstructorInstance = function () {
        return mockGlitchCurtainInstance;
      };

      beforeEach(function (done) {
        mockGlitchCurtainInstance = jasmine.createSpyObj('mockGlitchCurtain', ['showCurtain', 'hideCurtain', 'tearDown']);
        mediaPlayer = jasmine.createSpyObj('mediaPlayer', ['addEventCallback', 'initialiseMedia', 'beginPlayback',
          'getState', 'resume', 'getPlayerElement', 'getSeekableRange',
          'reset', 'stop', 'removeAllEventCallbacks', 'getSource',
          'getMimeType', 'beginPlaybackFrom', 'playFrom', 'pause', 'setPlaybackRate', 'getPlaybackRate']);

        injector.mock({
          'bigscreenplayer/playbackstrategy/liveglitchcurtain': mockGlitchCurtainConstructorInstance
        });
        injector.require(['bigscreenplayer/playbackstrategy/legacyplayeradapter'], function (LegacyAdaptor) {
          squiredLegacyAdaptor = LegacyAdaptor;
          done();
        });
      });

      afterEach(function () {
        delete window.bigscreenPlayer.overrides;
        mockGlitchCurtainInstance.showCurtain.calls.reset();
        mockGlitchCurtainInstance.hideCurtain.calls.reset();
        mockGlitchCurtainInstance.tearDown.calls.reset();
        testTimeCorrection = 0;
      });

      // Options = windowType, playableDevice, timeCorrection, deviceReplacement, isUHD
      function setUpLegacyAdaptor (opts) {
        var mockMediaSources = {
          time: function () {
            return {correction: testTimeCorrection};
          },
          currentSource: function () {
            return cdnArray[0].url;
          }
        };

        var options = opts || {};

        cdnArray.push({url: 'testcdn1/test/', cdn: 'cdn1'});

        var windowType = options.windowType || WindowTypes.STATIC;

        mediaPlayer.addEventCallback.and.callFake(function (component, callback) {
          eventCallbacks = function (event) {
            callback.call(component, event);
          };
        });

        videoContainer = document.createElement('div');
        videoContainer.id = 'app';
        document.body.appendChild(videoContainer);
        legacyAdaptor = squiredLegacyAdaptor(mockMediaSources, windowType, videoContainer, options.isUHD, mediaPlayer);
      }
      describe('transitions', function () {
        it('should pass back possible transitions', function () {
          setUpLegacyAdaptor();

          expect(legacyAdaptor.transitions).toEqual(jasmine.objectContaining({
            canBePaused: jasmine.any(Function),
            canBeStopped: jasmine.any(Function),
            canBeginSeek: jasmine.any(Function),
            canResume: jasmine.any(Function)
          }));
        });
      });

      describe('load', function () {
        it('should initialise the media player', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.load('video/mp4', 0);

          expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith('video', cdnArray[0].url, 'video/mp4', videoContainer, jasmine.any(Object));
        });

        it('should begin playback from the passed in start time + time correction if we are watching live on a restartable device', function () {
          testTimeCorrection = 10;
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('video/mp4', 50);

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(60);
        });

        it('should begin playback at the live point if no start time is passed in and we are watching live on a playable device', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, playableDevice: true});

          legacyAdaptor.load('video/mp4', undefined);

          expect(mediaPlayer.beginPlayback).toHaveBeenCalledWith();
        });

        it('should begin playback from the passed in start time if we are watching vod', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.load('video/mp4', 50);

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(50);
        });

        it('should begin playback from if no start time is passed in when watching vod', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.load('video/mp4', undefined);

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(0);
        });

        it('should disable sentinels if we are watching UHD and configured to do so', function () {
          window.bigscreenPlayer.overrides = {
            liveUhdDisableSentinels: true
          };

          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, isUHD: true});

          legacyAdaptor.load('video/mp4', undefined);

          var properties = mediaPlayer.initialiseMedia.calls.mostRecent().args[4];

          expect(properties.disableSentinels).toEqual(true);
        });

        it('should disable seek sentinels if we are configured to do so', function () {
          window.bigscreenPlayer.overrides = {
            disableSeekSentinel: true
          };

          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load(cdnArray, 'video/mp4', undefined);

          var properties = mediaPlayer.initialiseMedia.calls.mostRecent().args[4];

          expect(properties.disableSeekSentinel).toEqual(true);
        });
      });

      describe('play', function () {
        describe('if the player supports playFrom()', function () {
          it('should play from 0 if the stream has ended', function () {
            setUpLegacyAdaptor();

            eventCallbacks({type: MediaPlayerEvent.COMPLETE});

            legacyAdaptor.play();

            expect(mediaPlayer.playFrom).toHaveBeenCalledWith(0);
          });

          it('should play from the current time if we are not ended, paused or buffering', function () {
            setUpLegacyAdaptor();

            eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

            legacyAdaptor.play();

            expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);
          });

          it('should play from the current time on live if we are not ended, paused or buffering', function () {
            testTimeCorrection = 10;
            setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

            eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

            legacyAdaptor.play();

            expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);
          });
        });

        describe('if the player does not support playFrom()', function () {
          beforeEach(function () { delete mediaPlayer.playFrom; });

          it('should not throw an error', function () {
            setUpLegacyAdaptor();

            eventCallbacks({type: MediaPlayerEvent.COMPLETE});

            legacyAdaptor.play();
          });

          it('should do nothing if we are not ended, paused or buffering', function () {
            setUpLegacyAdaptor();

            eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

            legacyAdaptor.play();
          });

          it('should do nothing on live if we are not ended, paused or buffering', function () {
            testTimeCorrection = 10;
            setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

            eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

            legacyAdaptor.play();
          });
        });

        it('should resume if the player is in a paused or buffering state', function () {
          setUpLegacyAdaptor();

          mediaPlayer.getState.and.returnValue(MediaPlayerState.PAUSED);

          legacyAdaptor.play();

          expect(mediaPlayer.resume).toHaveBeenCalledWith();
        });
      });

      describe('pause', function () {
        it('should pause when we don\'t need to delay a call to pause', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.pause({disableAutoResume: false});

          expect(mediaPlayer.pause).toHaveBeenCalledWith({disableAutoResume: false});
        });

        it('should not pause when we need to delay a call to pause', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('application/dash+xml', undefined);

          legacyAdaptor.setCurrentTime(10);

          mediaPlayer.getState.and.returnValue(MediaPlayerState.BUFFERING);

          legacyAdaptor.pause({disableAutoResume: false});

          expect(mediaPlayer.pause).not.toHaveBeenCalledWith({disableAutoResume: false});
        });
      });

      describe('isPaused', function () {
        it('should be set to false once we have loaded', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.load('video/mp4', undefined);

          expect(legacyAdaptor.isPaused()).toEqual(false);
        });

        it('should be set to false when we call play', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.play();

          expect(legacyAdaptor.isPaused()).toEqual(false);
        });

        it('should be set to false when we get a playing event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.PLAYING});

          expect(legacyAdaptor.isPaused()).toEqual(false);
        });

        it('should be set to false when we get a time update event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.STATUS});

          expect(legacyAdaptor.isPaused()).toEqual(false);
        });

        it('should be set to true when we get a paused event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          expect(legacyAdaptor.isPaused()).toEqual(true);
        });

        it('should be set to true when we get a ended event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(legacyAdaptor.isPaused()).toEqual(true);
        });
      });

      describe('isEnded', function () {
        it('should be set to false on initialisation of the strategy', function () {
          setUpLegacyAdaptor();

          expect(legacyAdaptor.isEnded()).toEqual(false);
        });

        it('should be set to true when we get an ended event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(legacyAdaptor.isEnded()).toEqual(true);
        });

        it('should be set to false when we a playing event is recieved', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.PLAYING});

          expect(legacyAdaptor.isEnded()).toEqual(false);
        });

        it('should be set to false when we get a waiting event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.BUFFERING});

          expect(legacyAdaptor.isEnded()).toEqual(false);
        });

        it('should be set to true when we get a completed event then false when we start initial buffering from playing', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(legacyAdaptor.isEnded()).toEqual(true);

          eventCallbacks({type: MediaPlayerEvent.BUFFERING});

          expect(legacyAdaptor.isEnded()).toBe(false);
        });
      });

      describe('getDuration', function () {
        it('should be set to 0 on initialisation', function () {
          setUpLegacyAdaptor();

          expect(legacyAdaptor.getDuration()).toEqual(0);
        });

        it('should be updated by the playing event duration when the duration is undefined or 0', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10});

          expect(legacyAdaptor.getDuration()).toEqual(10);
        });

        it('should use the local duration when the value is not undefined or 0', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10});

          expect(legacyAdaptor.getDuration()).toEqual(10);

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 20});

          expect(legacyAdaptor.getDuration()).toEqual(10);
        });
      });

      describe('getPlayerElement', function () {
        it('should return the mediaPlayer element', function () {
          setUpLegacyAdaptor();

          var videoElement = document.createElement('video');

          mediaPlayer.getPlayerElement.and.returnValue(videoElement);

          expect(legacyAdaptor.getPlayerElement()).toEqual(videoElement);
        });
      });

      describe('getSeekableRange', function () {
        it('should return the start as 0 and the end as the duration for vod', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, duration: 10});

          expect(legacyAdaptor.getSeekableRange()).toEqual({start: 0, end: 10});
        });

        it('should return the start/end from the player - time correction', function () {
          testTimeCorrection = 10;
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, playableDevice: false});

          mediaPlayer.getSeekableRange.and.returnValue({start: 110, end: 1010});

          expect(legacyAdaptor.getSeekableRange()).toEqual({start: 100, end: 1000});
        });

        it('should return the start/end from the player when the time correction is 0', function () {
          testTimeCorrection = 0;
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING, playableDevice: false});

          mediaPlayer.getSeekableRange.and.returnValue({start: 100, end: 1000});

          expect(legacyAdaptor.getSeekableRange()).toEqual({start: 100, end: 1000});
        });
      });

      describe('getCurrentTime', function () {
        it('should be set when we get a playing event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.PLAYING, currentTime: 10});

          expect(legacyAdaptor.getCurrentTime()).toEqual(10);
        });

        it('should be set with time correction when we get a playing event', function () {
          testTimeCorrection = 5;
          setUpLegacyAdaptor({windowType: WindowTypes.STATIC});

          eventCallbacks({type: MediaPlayerEvent.PLAYING, currentTime: 10});

          expect(legacyAdaptor.getCurrentTime()).toEqual(5);
        });

        it('should be set when we get a time update event', function () {
          setUpLegacyAdaptor();

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

          expect(legacyAdaptor.getCurrentTime()).toEqual(10);
        });

        it('should be set with time correction when we get a time update event', function () {
          testTimeCorrection = 5;
          setUpLegacyAdaptor({windowType: WindowTypes.STATIC});

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10});

          expect(legacyAdaptor.getCurrentTime()).toEqual(5);
        });
      });

      describe('setCurrentTime', function () {
        it('should set isEnded to false', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.setCurrentTime(10);

          expect(legacyAdaptor.isEnded()).toEqual(false);
        });

        it('should update currentTime to the time value passed in', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.setCurrentTime(10);

          expect(legacyAdaptor.getCurrentTime()).toEqual(10);
        });

        // eslint-disable-next-line jasmine/no-suite-dupes
        describe('if the player supports playFrom()', function () {
          it('should seek to the time value passed in', function () {
            setUpLegacyAdaptor();

            legacyAdaptor.setCurrentTime(10);

            expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);
          });

          it('should seek to the time value passed in + time correction', function () {
            testTimeCorrection = 10;
            setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

            legacyAdaptor.setCurrentTime(10);

            expect(mediaPlayer.playFrom).toHaveBeenCalledWith(20);
          });

          it('should pause after a seek if we were in a paused state, not watching dash and on a capable device', function () {
            setUpLegacyAdaptor();

            eventCallbacks({type: MediaPlayerEvent.PAUSED});

            legacyAdaptor.setCurrentTime(10);

            expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);

            expect(mediaPlayer.pause).toHaveBeenCalledWith();
          });

          it('should not pause after a seek if we are not on capable device and watching a dash stream', function () {
            setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

            legacyAdaptor.load('application/dash+xml', undefined);

            eventCallbacks({type: MediaPlayerEvent.PAUSED});

            legacyAdaptor.setCurrentTime(10);

            expect(mediaPlayer.playFrom).toHaveBeenCalledWith(10);

            expect(mediaPlayer.pause).not.toHaveBeenCalledWith();
          });
        });

        // eslint-disable-next-line jasmine/no-suite-dupes
        describe('if the player does not support playFrom()', function () {
          beforeEach(function () { delete mediaPlayer.playFrom; });

          // eslint-disable-next-line jasmine/no-spec-dupes
          it('should not throw an error', function () {
            setUpLegacyAdaptor();

            legacyAdaptor.setCurrentTime(10);
          });

          it('should not throw an error for live', function () {
            testTimeCorrection = 10;
            setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

            legacyAdaptor.setCurrentTime(10);
          });

          it('should remain paused if we were in a paused state, not watching dash and on a capable device', function () {
            setUpLegacyAdaptor();

            eventCallbacks({type: MediaPlayerEvent.PAUSED});

            legacyAdaptor.setCurrentTime(10);

            expect(legacyAdaptor.isPaused()).toEqual(true);
          });

          it('should not pause after a no-op seek if we are not on capable device and watching a dash stream', function () {
            setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

            legacyAdaptor.load('application/dash+xml', undefined);

            eventCallbacks({type: MediaPlayerEvent.PAUSED});

            legacyAdaptor.setCurrentTime(10);

            expect(mediaPlayer.pause).not.toHaveBeenCalledWith();
          });
        });
      });

      describe('Playback Rate', function () {
        it('calls through to the mediaPlayers setPlaybackRate function', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.setPlaybackRate(2);

          expect(mediaPlayer.setPlaybackRate).toHaveBeenCalledWith(2);
        });

        it('calls through to the mediaPlayers getPlaybackRate function and returns correct value', function () {
          setUpLegacyAdaptor();
          mediaPlayer.getPlaybackRate.and.returnValue(1.5);

          var rate = legacyAdaptor.getPlaybackRate();

          expect(mediaPlayer.getPlaybackRate).toHaveBeenCalled();
          expect(rate).toEqual(1.5);
        });

        it('getPlaybackRate returns 1.0 if mediaPlayer does not have getPlaybackRate function', function () {
          mediaPlayer = jasmine.createSpyObj('mediaPlayer', ['addEventCallback']);
          setUpLegacyAdaptor();

          expect(legacyAdaptor.getPlaybackRate()).toEqual(1.0);
        });
      });

      describe('reset', function () {
        it('should reset the player', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.reset();

          expect(mediaPlayer.reset).toHaveBeenCalledWith();
        });

        it('should stop the player if we are not in an unstoppable state', function () {
          setUpLegacyAdaptor();

          legacyAdaptor.reset();

          expect(mediaPlayer.stop).toHaveBeenCalledWith();
        });

        it('should not stop the player if we in an unstoppable state', function () {
          setUpLegacyAdaptor();

          mediaPlayer.getState.and.returnValue(MediaPlayerState.EMPTY);

          legacyAdaptor.reset();

          expect(mediaPlayer.stop).not.toHaveBeenCalledWith();
        });
      });

      describe('tearDown', function () {
        beforeEach(function () {
          setUpLegacyAdaptor();

          legacyAdaptor.tearDown();
        });

        it('should remove all event callbacks', function () {
          expect(mediaPlayer.removeAllEventCallbacks).toHaveBeenCalledWith();
        });

        it('should set isPaused to true', function () {
          expect(legacyAdaptor.isPaused()).toEqual(true);
        });

        it('should return isEnded as false', function () {
          expect(legacyAdaptor.isEnded()).toEqual(false);
        });
      });

      describe('live glitch curtain', function () {
        beforeEach(function () {
          window.bigscreenPlayer.overrides = {
            showLiveCurtain: true
          };
        });

        it('should show curtain for a live restart and we get a seek-attempted event', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('video/mp4', 10);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalledWith();
        });

        it('should show curtain for a live restart to 0 and we get a seek-attempted event', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('video/mp4', 0);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalledWith();
        });

        it('should not show curtain when playing from the live point and we get a seek-attempted event', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('video/mp4');

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).not.toHaveBeenCalled();
        });

        it('should show curtain when the forceBeginPlaybackToEndOfWindow config is set and the playback type is live', function () {
          window.bigscreenPlayer.overrides.forceBeginPlaybackToEndOfWindow = true;

          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalledWith();
        });

        it('should not show curtain when the config overide is not set and we are playing live', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).not.toHaveBeenCalled();
        });

        it('should hide the curtain when we get a seek-finished event', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('video/mp4', 0);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          expect(mockGlitchCurtainInstance.showCurtain).toHaveBeenCalledWith();

          eventCallbacks({type: MediaPlayerEvent.SEEK_FINISHED});

          expect(mockGlitchCurtainInstance.hideCurtain).toHaveBeenCalledWith();
        });

        it('should tear down the curtain on strategy tearDown if it has been shown', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('video/mp4', 0);

          eventCallbacks({type: MediaPlayerEvent.SEEK_ATTEMPTED});

          legacyAdaptor.tearDown();

          expect(mockGlitchCurtainInstance.tearDown).toHaveBeenCalledWith();
        });
      });

      describe('dash live on error after exiting seek', function () {
        it('should have called reset on the player', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          // set up the values handleErrorOnExitingSeek && exitingSeek so they are truthy then fire an error event so we restart.
          legacyAdaptor.load('application/dash+xml', undefined);

          legacyAdaptor.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.reset).toHaveBeenCalledWith();
        });

        it('should initialise the player', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('application/dash+xml', undefined);

          legacyAdaptor.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.initialiseMedia).toHaveBeenCalledWith('video', cdnArray[0].url, 'application/dash+xml', videoContainer, jasmine.any(Object));
        });

        it('should begin playback from the currentTime', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('application/dash+xml', undefined);

          legacyAdaptor.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(10);
        });

        it('should begin playback from the currentTime + time correction', function () {
          testTimeCorrection = 10;
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('application/dash+xml', undefined);

          legacyAdaptor.setCurrentTime(10);

          eventCallbacks({type: MediaPlayerEvent.ERROR});

          expect(mediaPlayer.beginPlaybackFrom).toHaveBeenCalledWith(20);
        });
      });

      describe('delay pause until after seek', function () {
        it('should pause the player if we were in a paused state on dash live', function () {
          setUpLegacyAdaptor({windowType: WindowTypes.SLIDING});

          legacyAdaptor.load('application/dash+xml', undefined);

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          legacyAdaptor.setCurrentTime(10);

          expect(mediaPlayer.pause).not.toHaveBeenCalledWith();

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: {start: 5}});

          expect(mediaPlayer.pause).toHaveBeenCalledWith();
        });

        it('should pause the player if we were in a paused state for devices with known issues', function () {
          window.bigscreenPlayer.overrides = {
            pauseOnExitSeek: true
          };

          setUpLegacyAdaptor();

          legacyAdaptor.load('video/mp4', undefined);

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          legacyAdaptor.setCurrentTime(10);

          expect(mediaPlayer.pause).not.toHaveBeenCalledWith();

          eventCallbacks({type: MediaPlayerEvent.STATUS, currentTime: 10, seekableRange: {start: 5}});

          expect(mediaPlayer.pause).toHaveBeenCalledWith();
        });
      });

      describe('events', function () {
        it('should publish a playing event', function () {
          setUpLegacyAdaptor();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          legacyAdaptor.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.PLAYING});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING);
        });

        it('should publish a paused event', function () {
          setUpLegacyAdaptor();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          legacyAdaptor.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.PAUSED});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED);
        });

        it('should publish a buffering event', function () {
          setUpLegacyAdaptor();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          legacyAdaptor.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.BUFFERING});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING);
        });

        it('should publish an ended event', function () {
          setUpLegacyAdaptor();

          var eventCallbackSpy = jasmine.createSpy('eventSpy');
          legacyAdaptor.addEventCallback(this, eventCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.COMPLETE});

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED);
        });

        it('should publish a time update event', function () {
          setUpLegacyAdaptor();

          var timeUpdateCallbackSpy = jasmine.createSpy('eventSpy');
          legacyAdaptor.addTimeUpdateCallback(this, timeUpdateCallbackSpy);

          eventCallbacks({type: MediaPlayerEvent.STATUS});

          expect(timeUpdateCallbackSpy).toHaveBeenCalledWith();
        });
      });
    });
  });
