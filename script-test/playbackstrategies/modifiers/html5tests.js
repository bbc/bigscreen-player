require(
  [
    'squire',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
    function (Squire, MediaPlayerBase) {
      describe('HTML5 Base', function () {
        var injector = new Squire();
        var html5Player;
        var sourceContainer;
        var player;
        var mockSourceElement;
        var mockVideoMediaElement;
        var mockAudioMediaElement;
        var metaDataCallback;
        var finishedBufferingCallback;
        var errorCallback;
        var endedCallback;
        var waitingCallback;

        var logger = jasmine.createSpyObj('logger', ['warn', 'debug', 'error']);

        mockSourceElement = document.createElement('source');
        mockVideoMediaElement = document.createElement('video');
        mockAudioMediaElement = document.createElement('audio');

        function playFromNearCurrentTime (currentTime, targetTime) {
          player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

          player.beginPlaybackFrom(0);
          metaDataCallback();
          finishedBufferingCallback();

          expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

          waitingCallback();

          mockVideoMediaElement.currentTime = currentTime;

          expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);

          player.playFrom(targetTime);
          finishedBufferingCallback();

          expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
        }

        beforeEach(function (done) {
          mockSourceElement = document.createElement('source');
          mockVideoMediaElement = document.createElement('video');
          mockAudioMediaElement = document.createElement('audio');

          logger = jasmine.createSpyObj('logger', ['warn', 'debug', 'error']);
          sourceContainer = document.createElement('div');

          injector.require(['bigscreenplayer/playbackstrategy/modifiers/html5'], function (SquiredHtml5) {
            html5Player = SquiredHtml5;
            done();
          });
        });

        describe('tests', function () {
          beforeEach(function () {
            player = html5Player(logger);
            spyOn(player, 'toPaused').and.callThrough();

            spyOn(document, 'createElement').and.callFake(function (type) {
              if (type === 'source') {
                return mockSourceElement;
              } else if (type === 'video') {
                return mockVideoMediaElement;
              } else {
                return mockAudioMediaElement;
              }
            });

            spyOn(mockVideoMediaElement, 'addEventListener').and.callFake(function (name, methodCall) {
              if (name === 'loadedmetadata') {
                metaDataCallback = methodCall;
              } else if (name === 'canplay') {
                finishedBufferingCallback = methodCall;
              } else if (name === 'error') {
                errorCallback = methodCall;
              } else if (name === 'ended') {
                endedCallback = methodCall;
              } else if (name === 'waiting') {
                waitingCallback = methodCall;
              }
            });

            spyOn(mockAudioMediaElement, 'addEventListener').and.callFake(function (name, methodCall) {
              if (name === 'loadedmetadata') {
                metaDataCallback = methodCall;
              } else if (name === 'canplay') {
                finishedBufferingCallback = methodCall;
              } else if (name === 'error') {
                errorCallback = methodCall;
              } else if (name === 'ended') {
                endedCallback = methodCall;
              } else if (name === 'waiting') {
                waitingCallback = methodCall;
              }
            });

            spyOn(mockVideoMediaElement, 'play');
            spyOn(mockVideoMediaElement, 'load');
            spyOn(mockVideoMediaElement, 'pause');
          });

          afterEach(function () {
            player = null;
          });

          describe('Initialise Media', function () {
            it('Creates a video element when called with type VIDEO', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {});

              expect(document.createElement).toHaveBeenCalledTimes(2);
              expect(document.createElement).toHaveBeenCalledWith('video', 'mediaPlayerVideo');
            });

            it('Creates an audio element when called with type AUDIO', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, null, null, sourceContainer, {});

              expect(document.createElement).toHaveBeenCalledTimes(2);
              expect(document.createElement).toHaveBeenCalledWith('audio', 'mediaPlayerAudio');
            });

            it('Creates a video element when called with type LIVE_VIDEO', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, null, null, sourceContainer, {});

              expect(document.createElement).toHaveBeenCalledTimes(2);
              expect(document.createElement).toHaveBeenCalledWith('video', 'mediaPlayerVideo');
            });

            it('Creates an audio element when called with type LIVE_AUDIO', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_AUDIO, null, null, sourceContainer, {});

              expect(document.createElement).toHaveBeenCalledTimes(2);
              expect(document.createElement).toHaveBeenCalledWith('audio', 'mediaPlayerAudio');
            });

            it('The created video element is passed into the source container', function () {
              spyOn(sourceContainer, 'appendChild');

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {});

              expect(sourceContainer.appendChild).toHaveBeenCalledWith(mockVideoMediaElement);
            });

            it('The Audio element is passed into the source container', function () {
              spyOn(sourceContainer, 'appendChild');

              player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, null, null, sourceContainer, {});

              expect(sourceContainer.appendChild).toHaveBeenCalledWith(mockAudioMediaElement);
            });

            it('Source url is present on the source element', function () {
              var url = 'http://url/';

              spyOn(mockVideoMediaElement, 'appendChild').and.callThrough();

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, url, null, sourceContainer, {});

              expect(mockVideoMediaElement.appendChild).toHaveBeenCalledWith(mockSourceElement);
              expect(mockVideoMediaElement.children[0].src).toBe(url);
            // Keeps returning a filepath rather than the actual passed in value.
            });
          });

          describe('Reset and Stop', function () {
            it('Video is removed from the DOM', function () {
              spyOn(sourceContainer, 'appendChild').and.callThrough();
              spyOn(sourceContainer, 'removeChild').and.callThrough();

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {});

              expect(sourceContainer.appendChild).toHaveBeenCalledWith(mockVideoMediaElement);

              player.reset();

              expect(sourceContainer.removeChild).toHaveBeenCalledWith(mockVideoMediaElement);
              expect(sourceContainer.children[0]).not.toBe(mockVideoMediaElement);
            });

            it('Audio is removed from the DOM', function () {
              spyOn(sourceContainer, 'appendChild').and.callThrough();
              spyOn(sourceContainer, 'removeChild').and.callThrough();

              player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, null, null, sourceContainer, {});

              expect(sourceContainer.appendChild).toHaveBeenCalledWith(mockAudioMediaElement);

              player.reset();

              expect(sourceContainer.removeChild).toHaveBeenCalledWith(mockAudioMediaElement);
              expect(sourceContainer.children[0]).not.toBe(mockAudioMediaElement);
            });

            it('Source element is removed from the media element', function () {
              spyOn(mockVideoMediaElement, 'removeChild').and.callThrough();

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, null, null, sourceContainer, {});

              player.reset();

              expect(mockVideoMediaElement.removeChild).toHaveBeenCalledWith(mockSourceElement);
            });

            it(' Reset Unloads Media Element Source As Per Guidelines', function () {
                // Guidelines in HTML5 video spec, section 4.8.10.15:
                // http://www.w3.org/TR/2011/WD-html5-20110405/video.html#best-practices-for-authors-using-media-elements

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              mockVideoMediaElement.load.calls.reset();
              spyOn(mockVideoMediaElement, 'removeAttribute');

              player.reset();

              expect(mockVideoMediaElement.removeAttribute).toHaveBeenCalledWith('src');
              expect(mockVideoMediaElement.removeAttribute).toHaveBeenCalledTimes(1);
              expect(mockVideoMediaElement.load).toHaveBeenCalledTimes(1);
            });

            it(' Calling Stop In Stopped State Does Not Call Pause On The Device', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.stop();

              expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();
            });
          });

          describe('seekable range', function () {
            it('If duration and seekable range is missing get seekable range returns undefined and logs a warning', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              metaDataCallback();
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(undefined);

              player.beginPlayback();

              expect(player.getSeekableRange()).toBe(undefined);
              expect(logger.warn).toHaveBeenCalledWith('No \'duration\' or \'seekable\' on media element');
            });

            it('Seekable Range Takes Precedence Over Duration On Media Element', function () {
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(60);

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 30;
                },
                length: 2
              });

              metaDataCallback({start: 10, end: 30});

              expect(player.getSeekableRange()).toEqual({ start: 10, end: 30 });
              expect(mockVideoMediaElement.duration).toBe(60);
            });

            it('Seekable Is Not Used Until Metadata Is Set', function () {
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(undefined);

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlayback();

              expect(player.getSeekableRange()).toEqual(undefined);

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 30;
                },
                length: 2
              });

              metaDataCallback({start: 10, end: 30});

              expect(player.getSeekableRange()).toEqual({ start: 10, end: 30 });
            });

            it(' Get Seekable Range Gets End Time From Duration When No Seekable Property', function () {
              metaDataCallback();
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(60);

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlayback();
              metaDataCallback({start: 0, end: 30});

              expect(player.getSeekableRange()).toEqual({start: 0, end: 60});
            });

            it(' Get Seekable Range Gets End Time From First Time Range In Seekable Property', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 30;
                },
                length: 2
              });
              metaDataCallback({start: 10, end: 30});

              expect(player.getSeekableRange()).toEqual({ start: 10, end: 30 });
            });
          });

          describe('Media Element', function () {
            it('Video Element Is Full Screen', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              expect(mockVideoMediaElement.style.position).toEqual('absolute');
              expect(mockVideoMediaElement.style.top).toEqual('0px');
              expect(mockVideoMediaElement.style.left).toEqual('0px');
              expect(mockVideoMediaElement.style.width).toEqual('100%');
              expect(mockVideoMediaElement.style.height).toEqual('100%');
              expect(mockVideoMediaElement.style.zIndex).toEqual('');
            });

            it(' Autoplay Is Turned Off On Media Element Creation', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              expect(mockVideoMediaElement.autoplay).toEqual(false);
            });

            it(' Error Event From Media Element Causes Error Log With Code And Error Message In Event', function () {
              var errorMessage = 'This is a test error';

              spyOnProperty(mockVideoMediaElement, 'error').and.returnValue({code: errorMessage});

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              errorCallback();

              expect(logger.error).toHaveBeenCalledWith('Media element error code: ' + errorMessage);
            });

            it(' Error Event From Source Element Causes Error Log And Error Message In Event', function () {
              var sourceError;
              spyOn(mockSourceElement, 'addEventListener').and.callFake(function (name, methodCall) {
                if (name === 'error') {
                  sourceError = methodCall;
                }
              });

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              sourceError();

              expect(logger.error).toHaveBeenCalledWith('Media source element error');
            });

            it(' Pause Passed Through To Media Element When In Playing State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              metaDataCallback({});

              player.beginPlayback();
              player.pause();

              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Pause Not Passed From Media Element To Media Player On User Pause From Buffering', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

            // We dont fire the metadata ready callback so it stays in the buffering state
              player.beginPlayback();

              mockVideoMediaElement.pause();

              expect(player.toPaused).toHaveBeenCalledTimes(0);
            });

            it(' Pause Not Passed From Media Element To Media Player On User Pause From Playing', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              metaDataCallback({});

              player.beginPlayback();

              mockVideoMediaElement.pause();

              expect(player.toPaused).toHaveBeenCalledTimes(0);
            });

            it(' Pause Not Passed From Media Element To Media Player On Stop', function () {
            // Initialise media terminates in the stopped state
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              mockVideoMediaElement.pause();

              expect(player.toPaused).toHaveBeenCalledTimes(0);
            });

            it(' Play Called On Media Element When Resume In Paused State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);
              player.pause();

              metaDataCallback({});
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
              mockVideoMediaElement.play.calls.reset();

              player.resume();

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
            });

            it(' Play Called On Media Element When Resume In Buffering State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);
              player.pause();

              metaDataCallback({});

              mockVideoMediaElement.play.calls.reset();

              player.resume();

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
            });

            it(' Play Not Called On Media Element When Resume In Buffering State Before Metadata', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);
              player.pause();

              mockVideoMediaElement.play.calls.reset();

              player.resume();

              expect(mockVideoMediaElement.play).not.toHaveBeenCalled();
            });

            it(' Pause Passed Through To Media Element When In Buffered State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);
              player.pause();

              metaDataCallback({});

              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Load Called On Media Element When Initialise Media Is Called', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              expect(mockVideoMediaElement.load).toHaveBeenCalledTimes(1);
            });

            it(' Media Element Preload Attribute Is Set To Auto', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              expect(mockVideoMediaElement.preload).toEqual('auto');
            });

            it(' Play From Sets Current Time And Calls Play On Media Element When In Playing State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({});
              finishedBufferingCallback();

              mockVideoMediaElement.play.calls.reset();

              player.playFrom(10);

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(mockVideoMediaElement.currentTime).toEqual(10);
            });

            it(' Get Player Element Returns Video Element For Video', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              expect(player.getPlayerElement()).toEqual(mockVideoMediaElement);
            });

            it(' Get Player Element Returns Audio Element For Audio', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, 'http://url/', 'video/mp4', sourceContainer, {});

              expect(player.getPlayerElement()).toEqual(mockAudioMediaElement);
            });
          });

          describe('Time features', function () {
            beforeEach(function () {
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              mockVideoMediaElement.play.calls.reset();
            });

            it(' Play From Clamps When Called In Playing State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              player.playFrom(110);

              expect(mockVideoMediaElement.currentTime).toEqual(98.9);
            });

            it(' Play From Sets Current Time And Calls Play On Media Element When In Complete State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              finishedBufferingCallback();
              metaDataCallback({start: 0, end: 100});

              mockVideoMediaElement.play.calls.reset();

              player.playFrom(10);

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(mockVideoMediaElement.currentTime).toEqual(10);
            });

            it(' Play From Sets Current Time And Calls Play On Media Element When In Paused State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              player.pause();

              mockVideoMediaElement.play.calls.reset();

              player.playFrom(10);

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(mockVideoMediaElement.currentTime).toEqual(10);
            });

            it(' Begin Playback From After Metadata', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              metaDataCallback();

              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
              expect(mockVideoMediaElement.currentTime).toEqual(50);
              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
            });

            it(' When Play From Gets Clamped From Stopped A Debug Message Is Logged', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 60;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(50);
              metaDataCallback({ start: 60, end: 100 });
              finishedBufferingCallback();

              expect(logger.debug).toHaveBeenCalledWith('play From 50 clamped to 60 - seekable range is { start: 60, end: 100 }');
              expect(logger.debug).toHaveBeenCalledTimes(1);
            });

            it(' Get Duration Returns Undefined Before Metadata Is Set', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              expect(player.getDuration()).toBe(undefined);

              metaDataCallback();

              expect(player.getDuration()).toEqual(100);
            });

            it(' Get Duration Returns Device Duration With An On Demand Audio Stream', function () {
              spyOnProperty(mockAudioMediaElement, 'duration').and.returnValue(100);

              player.initialiseMedia(MediaPlayerBase.TYPE.AUDIO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlayback();

              metaDataCallback();

              expect(player.getDuration()).toBe(100);
            });
          });

          describe('Current Time', function () {
            it(' Play From Sets Current Time And Calls Play On Media Element When In Stopped State', function () {
              player = html5Player(logger);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(50);

              expect(mockVideoMediaElement.play).not.toHaveBeenCalled();
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);

              mockVideoMediaElement.play.calls.reset();
              metaDataCallback({ start: 0, end: 100 });

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
              expect(mockVideoMediaElement.currentTime).toEqual(50);

              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' Begin Playback From Sets Current Time And Calls Play On Media Element When In Stopped State', function () {
              player = html5Player(logger);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(10);
              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(mockVideoMediaElement.currentTime).toEqual(10);
            });

            it(' Play From Clamps When Called In Stopped State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(110);

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              metaDataCallback({ start: 10, end: 100 });

              expect(mockVideoMediaElement.currentTime).toEqual(98.9);
            });

            it(' Play From Then Pause Sets Current Time And Calls Pause On Media Element When In Stopped State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(50);
              player.pause();

              expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();
              expect(mockVideoMediaElement.play).not.toHaveBeenCalled();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });

              metaDataCallback({ start: 0, end: 100 });

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
              expect(mockVideoMediaElement.currentTime).toEqual(50);

              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it(' Play From Zero Then Pause Defers Call To Pause On Media Element When In Stopped State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);
              player.pause();

              expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();
            });

            it(' Play From Defers Setting Current Time And Calling Play On Media Element Until We Have Metadata', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);
              player.playFrom(10);

              expect(mockVideoMediaElement.play).not.toHaveBeenCalled();

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });

              metaDataCallback({ start: 0, end: 100 });

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(mockVideoMediaElement.currentTime).toEqual(10);
            });

            it(' Play From Clamps When Called In Buffering State And Dont Have Metadata', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);
              player.playFrom(110);

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              metaDataCallback({ start: 0, end: 100 });

              finishedBufferingCallback();

              expect(mockVideoMediaElement.currentTime).toEqual(98.9);
            });

            it(' Play From Sets Current Time And Calls Play On Media Element When In Buffering State And Has Metadata', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              metaDataCallback({ start: 0, end: 100 });

              mockVideoMediaElement.play.calls.reset();

              player.playFrom(10);

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(mockVideoMediaElement.currentTime).toEqual(10);
            });

            it(' Play From Clamps When Called In Buffering State And Has Metadata', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);

              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 10;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              metaDataCallback({ start: 0, end: 100 });

              player.playFrom(110);
              finishedBufferingCallback();

              expect(mockVideoMediaElement.currentTime).toEqual(98.9);
            });

            it(' Play From Current Time When Playing Goes To Buffering Then To Playing', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);
              metaDataCallback();
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

              waitingCallback();

              mockVideoMediaElement.currentTime = 20;

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);

              player.playFrom(30);
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' Play From Just Before Current Time When Playing Goes To Buffering Then To Playing', function () {
              var currentTime = 50.999;
              var targetTime = 50;
              playFromNearCurrentTime(currentTime, targetTime);
            });

            it(' Begin Playback From Current Time When Played Then Stopped Goes To Buffering Then To Playing', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              metaDataCallback();

              player.beginPlaybackFrom(50);

              expect(mockVideoMediaElement.currentTime).toEqual(50);

              player.stop();

              mockVideoMediaElement.play.calls.reset();

              player.beginPlaybackFrom(50);

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);

              finishedBufferingCallback();
              mockVideoMediaElement.play();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' Play From Current Time When Paused Goes To Buffering Then To Playing', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback();
              finishedBufferingCallback();

              mockVideoMediaElement.play.calls.reset();
              mockVideoMediaElement.currentTime = 50;

              player.pause();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);

              player.playFrom(50);

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(1);

              finishedBufferingCallback();
              mockVideoMediaElement.play();

              expect(mockVideoMediaElement.play).toHaveBeenCalledTimes(2);
              expect(player.getState()).toEqual(MediaPlayerBase.EVENT.PLAYING.toUpperCase());
            });

            it(' Begin Playback From Sets Current Time After Finish Buffering But No Metadata', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(50);

              metaDataCallback({ start: 0, end: 100 });
              finishedBufferingCallback();

              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Play From Near Current Time Will Not Cause Finish Buffering To Perform Seek Later', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);

              mockVideoMediaElement.currentTime = 50;
              player.playFrom(50.999);

              mockVideoMediaElement.currentTime = 70;
              finishedBufferingCallback();

              expect(mockVideoMediaElement.currentTime).toEqual(70);
            });
          });

          describe('Media Element Stop', function () {
            it(' Stop When In Buffering State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);
              player.stop();

              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Stop When In Playing State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback();
              finishedBufferingCallback();

              player.stop();

              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Stop When In Complete State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback();
              finishedBufferingCallback();

              endedCallback();
              player.stop();

              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Reset Remove All Event Listeners From The Media Element', function () {
              var listeners = ['canplay', 'seeked', 'playing', 'error', 'ended', 'waiting',
                'timeupdate', 'loadedMetaData', 'pause'];

              spyOn(mockVideoMediaElement, 'removeEventListener');
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.reset();

              expect(mockVideoMediaElement.removeEventListener).toHaveBeenCalledTimes(listeners.length);
            });
          });

          describe('Events', function () {
            it(' Waiting Html5 Event While Buffering Only Gives Single Buffering Event', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

              player.beginPlaybackFrom(0);
              waitingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });
          });

          describe('Sentinels', function () {
            var recentEvents;

            function tickClock () {
              jasmine.clock().tick(1100);
            }

            beforeEach(function () {
              jasmine.clock().install();
              jasmine.clock().mockDate();
              recentEvents = [];
            });

            afterEach(function () {
              jasmine.clock().uninstall();
            });

            function eventCallbackReporter (event) {
              recentEvents.push(event.type);
            }
            it(' Enter Buffering Sentinel Causes Transition To Buffering When Playback Halts For More Than One Sentinel Iteration Since State Changed', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime += 1;
              mockVideoMediaElement.currentTime += 1;

              recentEvents = [];
              tickClock();
              tickClock();
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it(' Enter Buffering Sentinel Not Fired When Sentinels Disabled', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime += 1;
              mockVideoMediaElement.currentTime += 1;

              recentEvents = [];
              tickClock();
              tickClock();
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' No Sentinels Activate When Current Time Runs Normally Then Jumps Backwards', function () {
              var INITIAL_TIME = 30;
              var SEEK_SENTINEL_TOLERANCE = 15;
              var AFTER_JUMP_TIME = INITIAL_TIME - (SEEK_SENTINEL_TOLERANCE + 5);

              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
              player.beginPlaybackFrom(INITIAL_TIME);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              recentEvents = [];

              mockVideoMediaElement.currentTime += 1;
              tickClock();

              mockVideoMediaElement.currentTime += 1;
              tickClock();

              mockVideoMediaElement.currentTime += 1;
              tickClock();

              mockVideoMediaElement.currentTime = AFTER_JUMP_TIME;
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' No Sentinels Activate When Current Time Runs Normally Then Jumps Backwards Near End Of Media', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(95);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              recentEvents = [];

              mockVideoMediaElement.currentTime += 1;
              tickClock();

              mockVideoMediaElement.currentTime = 100;
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' Pause Sentinel Activates When Current Time Runs Normally Then Jumps Backwards When Paused', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(10);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime += 1;
              tickClock();

              player.pause();
              recentEvents = [];

              mockVideoMediaElement.currentTime = 0;
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            });

            it(' Enter Buffering Sentinel Does Not Activate When Playback Halts When Only One Sentinel Iteration Since State Changed', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(10);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime += 1;

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
            });

            it(' Enter Buffering Sentinel Does Nothing When Playback Is Working', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(10);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime += 1;
              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' Enter Buffering Sentinel Does Nothing When Device Reports Buffering Correctly', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(10);

              waitingCallback();

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
            });

            it(' Enter Buffering Sentinel Does Nothing When Device Is Paused', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(10);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime += 1;

              player.pause();

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
            });
            var ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted = function () {
              var i;
              for (i = 0; i < 3; i++) {
                mockVideoMediaElement.currentTime += 1;
                tickClock();
              }

              for (i = 0; i < 2; i++) {
                mockVideoMediaElement.currentTime = 0;
                tickClock();
              }

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            };

            var ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted = function () {
              for (var i = 0; i < 2; i++) {
                mockVideoMediaElement.currentTime = 0;
                tickClock();
              }

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            };

            var ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance = function () {
              var i;

              for (i = 0; i < 3; i++) {
                mockVideoMediaElement.currentTime += 1;
                tickClock();
              }

              for (i = 0; i < 2; i++) {
                mockVideoMediaElement.currentTime = 0;
                tickClock();
              }

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);

              mockVideoMediaElement.currentTime = 0.01;
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
            };

            it(' Enter Buffering Sentinel Does Nothing When Device Time Is Reported As Zero During Playback', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(10);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              recentEvents = [];
              ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted();
            });

            it(' Enter Buffering Sentinel Does Nothing When Begin Playback Is Called And Device Time Is Reported As Zero For At Least Two Intervals', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(20);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              recentEvents = [];
              ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted();
            });

            it(' Enter Buffering Sentinel Fires When Begin Playback From Zero Is Called And Device Time Does Not Advance', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              recentEvents = [];
              ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted();
            });

            it(' Enter Buffering Sentinel Fires When Begin Playback Is Called And Device Time Does Not Advance', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              recentEvents = [];
              ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted();
            });

            it(' Enter Buffering Sentinel Fires When Seeked To Zero And Device Time Is Reported As Zero For At Least Two Intervals', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(20);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              recentEvents = [];

              player.playFrom(0);
              finishedBufferingCallback();
              tickClock();
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
            });

            it(' Enter Buffering Sentinel Only Fires On Second Attempt When Device Reports Time As Not Changing Within Tolerance', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();
              recentEvents = [];

              ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);

              mockVideoMediaElement.currentTime = 0.01;
              tickClock();

              mockVideoMediaElement.currentTime = 0.01;
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
            });

            it(' Enter Buffering Sentinel Does Not Fire On Two Non Consecutive Occurrences Of Device Reporting Time As Not Changing Within Tolerance', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();
              recentEvents = [];

              ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance();
              ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance();
            });

            it(' Exit Buffering Sentinel Causes Transition To Playing When Playback Starts', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});

              mockVideoMediaElement.currentTime += 1;
              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING, MediaPlayerBase.EVENT.PLAYING]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it(' Exit Buffering Sentinel Not Fired When Sentinels Disabled', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});

              mockVideoMediaElement.currentTime += 1;

              recentEvents = [];
              tickClock();

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it(' Exit Buffering Sentinel Causes Transition To Paused When Device Reports Paused', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              metaDataCallback({start: 0, end: 100});

              player.pause();

              recentEvents = [];
              mockVideoMediaElement.paused = true;
              tickClock();

              expect(recentEvents).toEqual([MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING, MediaPlayerBase.EVENT.PAUSED]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it(' Exit Buffering Sentinel Is Not Fired When Device Is Paused And Metadata Has Been Not Been Loaded', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);

              // Meta Data is not loaded at this point
              mockVideoMediaElement.paused = true;
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING);
            });

            it('Seek Sentinel Sets Current Time', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(50);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;

              recentEvents = [];
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Seek Sentinel Sets Current Time Not Fired When Sentinels Disabled', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
              player.beginPlaybackFrom(50);

              metaDataCallback({start: 0, end: 100});
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(mockVideoMediaElement.currentTime).toEqual(0);
            });

            it(' Seek Sentinel Clamps Target Seek Time When Required', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              player.beginPlaybackFrom(110);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;

              recentEvents = [];
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(98.9);
            });

            it(' Seek Sentinel Does Not Reseek To Initial Seek Time After 15s', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(10);
              finishedBufferingCallback();

              recentEvents = [];
              for (var i = 0; i < 20; i++) {
                mockVideoMediaElement.currentTime += 1;
                tickClock();
              }

              expect(recentEvents).toEqual([]);
              expect(mockVideoMediaElement.currentTime).toEqual(30);
            });

            it(' Seek Sentinel Does Not Reseek To Initial Seek Time After15s When Playback Leaves Seekable Range', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(95);
              finishedBufferingCallback();

              recentEvents = [];
              for (var i = 0; i < 20; i++) {
                mockVideoMediaElement.currentTime += 1;
                tickClock();
              }

              expect(recentEvents).toEqual([]);
              expect(mockVideoMediaElement.currentTime).toEqual(115);
            });

            it(' Seek Sentinel Sets Current Time When Paused', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              player.pause();
              mockVideoMediaElement.currentTime = 0;

              recentEvents = [];
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Seek Sentinel Does Not Seek When Begin Playback Called', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(0);
              finishedBufferingCallback();

              recentEvents = [];
              mockVideoMediaElement.currentTime += 1;
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(mockVideoMediaElement.currentTime).toEqual(1);
            });

            it(' Seek Sentinel Does Not Seek When Begin Playback Starts Playing Half Way Through Media', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              recentEvents = [];
              mockVideoMediaElement.currentTime += 1;
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(mockVideoMediaElement.currentTime).toEqual(51);
            });

            it(' Seek Sentinel Does Not Seek When Begin Playback After Previously Seeking', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              player.stop();
              player.beginPlayback();
              mockVideoMediaElement.currentTime = 0;
              finishedBufferingCallback();

              recentEvents = [];
              mockVideoMediaElement.currentTime += 1;
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(mockVideoMediaElement.currentTime).toEqual(1);
            });

            it(' Seek Sentinel Activates When Device Reports New Position Then Reverts To Old Position', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              tickClock();
              mockVideoMediaElement.currentTime = 0;

              recentEvents = [];
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Seek Sentinel Does Not Fire In Live When Device Jumps Back Less Than Thirty Seconds', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(29.9);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;

              recentEvents = [];
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            });

            it(' Seek Sentinel Fires In Live When Device Jumps Back More Than Thirty Seconds', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(30.1);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;

              recentEvents = [];
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            });

            it(' Pause Sentinel Retries Pause If Pause Fails', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              player.pause();

              mockVideoMediaElement.currentTime += 1;
              recentEvents = [];
              mockVideoMediaElement.pause.calls.reset();
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it(' Pause Sentinel Not Fired When Sentinels Disabled', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              player.pause();

              mockVideoMediaElement.currentTime += 1;
              recentEvents = [];
              mockVideoMediaElement.pause.calls.reset();
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it(' Pause Sentinel Does Not Retry Pause If Pause Succeeds', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              player.pause();

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it(' Pause Sentinel Does Not Retry Pause If Pause Succeeds', function () {
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
              metaDataCallback({start: 0, end: 100});

              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              player.pause();

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it(' End Of Media Sentinel Goes To Complete If Time Is Not Advancing And No Complete Event Fired', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(98);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 99;
              tickClock();

              mockVideoMediaElement.currentTime = 100;
              tickClock();

              recentEvents = [];
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE, MediaPlayerBase.EVENT.COMPLETE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.COMPLETE);
            });

            it(' End Of Media Sentinel Not Fired When Sentinels Disabled', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(98);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 99;
              tickClock();

              mockVideoMediaElement.currentTime = 100;
              tickClock();

              recentEvents = [];
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE, MediaPlayerBase.EVENT.COMPLETE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it('EndOf Media Sentinel Does Not Activate If Time Is Not Advancing When Outside A Second Of End And No Complete Event Fired', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(98);
              finishedBufferingCallback();

              recentEvents = [];
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE);
              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.COMPLETE);
            });

            it(' End Of Media Sentinel Does Not Activate If Time Is Not Advancing When Outside Seekable Range But Within Duration', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(98);
              finishedBufferingCallback();
              mockVideoMediaElement.duration = 150;

              recentEvents = [];
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE);
              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.COMPLETE);
            });

            it(' End Of Media Sentinel Does Not Activate If Reach End Of Media Normally', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(100);
              finishedBufferingCallback();
              endedCallback();

              recentEvents = [];
              tickClock();

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.COMPLETE);
            });

            it(' End Of Media Sentinel Does Not Activate If Time Is Advancing Near End Of Media And No Complete Event Fired', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(100);
              finishedBufferingCallback();

              recentEvents = [];
              mockVideoMediaElement.currentTime += 1;
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_COMPLETE);
              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.COMPLETE);
            });

            it(' Only One Sentinel Fired At A Time When Both Seek And Pause Sentinels Are Needed', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);
              player.playFrom(30);

              mockVideoMediaElement.currentTime = 0;
              finishedBufferingCallback();
              player.pause();

              recentEvents = [];
              mockVideoMediaElement.currentTime += 1;
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);

              recentEvents = [];
              mockVideoMediaElement.currentTime += 1;
              tickClock();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            function resetStubsThenAdvanceTimeThenRunSentinels () {
              recentEvents = [];
              mockVideoMediaElement.pause.calls.reset();
              mockVideoMediaElement.currentTime += 1;
              tickClock();
            }

            it(' Pause Sentinel Retries Pause Twice', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              player.pause();

              resetStubsThenAdvanceTimeThenRunSentinels();

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);

              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Pause Sentinel Emits Failure Event And Gives Up On Third Attempt', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              player.pause();

              resetStubsThenAdvanceTimeThenRunSentinels(self);
              resetStubsThenAdvanceTimeThenRunSentinels(self);
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
              expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();

              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toEqual([]);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
              expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();
            });

            it(' Pause Sentinel Attempt Count Is Not Reset By Calling Pause When Already Paused', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();

              player.pause();
              resetStubsThenAdvanceTimeThenRunSentinels(self);
              player.pause();

              resetStubsThenAdvanceTimeThenRunSentinels(self);
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
              expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();
            });

            it(' Pause Sentinel Attempt Count Is Reset By Calling Pause When Not Paused', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              player.pause();

              resetStubsThenAdvanceTimeThenRunSentinels(self);
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              player.resume();
              player.pause();

              resetStubsThenAdvanceTimeThenRunSentinels(self);
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Seek Sentinel Retries Seek Twice', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(50);

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Seek Sentinel Emits Failure Event And Gives Up On Third Attempt When Device Does Not Enter Buffering Upon Seek', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE);
              expect(mockVideoMediaElement.currentTime).toEqual(1);

              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE);
              expect(mockVideoMediaElement.currentTime).toEqual(2);
            });

            it(' Seek Sentinel Giving Up Does Not Prevent Pause Sentinel Activation', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(50);
              finishedBufferingCallback();

              player.pause();

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);
              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);

              mockVideoMediaElement.currentTime = 0;
              mockVideoMediaElement.currentTime += 1;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);

              mockVideoMediaElement.currentTime = 0;
              mockVideoMediaElement.currentTime += 1;
              mockVideoMediaElement.currentTime += 1;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              // Ensure that pause has a second attempt (rather than seek returning, etc)
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
              expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            });

            it(' Seek Sentinel Attempt Count Is Reset By Calling Play From', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);
              mockVideoMediaElement.currentTime = 0;

              player.playFrom(50);
              finishedBufferingCallback();
              mockVideoMediaElement.currentTime = 0;

              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Seek Sentinel Attempt Count Is Reset By Calling Begin Playback From', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);

              mockVideoMediaElement.currentTime = 0;
              resetStubsThenAdvanceTimeThenRunSentinels(self);
              mockVideoMediaElement.currentTime = 0;

              player.stop();
              player.beginPlaybackFrom(50);
              finishedBufferingCallback();
              mockVideoMediaElement.currentTime = 0;

              resetStubsThenAdvanceTimeThenRunSentinels(self);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Exit Buffering Sentinel Performs Deferred Seek If No Loaded Metadata Event', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(50);

              mockVideoMediaElement.currentTime += 1;
              tickClock();

              expect(mockVideoMediaElement.currentTime).toEqual(50);
            });

            it(' Pause Sentinel Does Not Fire When Device Time Advances By Less Than Sentinel Tolerance', function () {
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () {
                  return 0;
                },
                end: function () {
                  return 100;
                },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              player.addEventCallback(this, eventCallbackReporter);
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

              metaDataCallback({start: 0, end: 100});
              player.beginPlaybackFrom(20);
              finishedBufferingCallback();

              recentEvents = [];

              player.pause();
              mockVideoMediaElement.currentTime += 0.01;
              tickClock();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            });
          });
        });
      });
    });
