require(
  [
    'bigscreenplayer/playbackstrategy/modifiers/html5',
    'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase'
  ],
    function (Html5MediaPlayer, MediaPlayerBase) {
      describe('HTML5 Base', function () {
        var sourceContainer;
        var player;
        var mockSourceElement;
        var mockVideoMediaElement;
        var mockAudioMediaElement;
        var metaDataCallback;
        var finishedBufferingCallback;
        var errorCallback;
        var endedCallback;
        var timeupdateCallback;
        var waitingCallback;
        var playingCallback;

        var recentEvents;

        var logger = jasmine.createSpyObj('logger', ['warn', 'debug', 'error']);

        function eventCallbackReporter (event) {
          recentEvents.push(event.type);
        }

        function giveMediaElementMetaData (mediaElement, metadata) {
          try {
            spyOnProperty(mediaElement, 'seekable').and.returnValue(
              {
                start: function () {
                  return metadata.start;
                },
                end: function () {
                  return metadata.end;
                },
                length: 2
              });
          } catch (ex) {
            mediaElement.seekable = {
              start: function () {
                return metadata.start;
              },
              end: function () {
                return metadata.end;
              },
              length: 2
            };
          }
        }

        function createPlayer (config, logger) {
          player = Html5MediaPlayer(config, logger);
          spyOn(player, 'toPaused').and.callThrough();

          player.addEventCallback(this, eventCallbackReporter);
        }

        beforeEach(function (done) {
          var config = {
            streaming: {
              overrides: {
                forceBeginPlaybackToEndOfWindow: true
              }
            }
          };
          mockSourceElement = document.createElement('source');
          mockVideoMediaElement = document.createElement('video');
          mockAudioMediaElement = document.createElement('audio');

          logger = jasmine.createSpyObj('logger', ['warn', 'debug', 'error']);
          sourceContainer = document.createElement('div');
          recentEvents = [];

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
            } else if (name === 'playing') {
              playingCallback = methodCall;
            } else if (name === 'timeupdate') {
              timeupdateCallback = methodCall;
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

          createPlayer(config, logger);
          done();
        });

        describe('Media Player Common Tests', function () {
          describe('Empty State Tests', function () {
            it('Get Source Returns Undefined In Empty State', function () {
              expect(player.getSource()).toBe(undefined);
            });

            it('Get Mime Type Returns Undefined In Empty State', function () {
              expect(player.getMimeType()).toBe(undefined);
            });

            it('Get Current Time Returns Undefined In Empty State', function () {
              expect(player.getCurrentTime()).toBe(undefined);
            });

            it('Get Seekable Range Returns Undefined In Empty State', function () {
              expect(player.getSeekableRange()).toBe(undefined);
            });

            it('Get Duration Returns Undefined In Empty State', function () {
              expect(player.getDuration()).toBe(undefined);
            });

            it('Get Source Returns Undefined In Empty State After Reset', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              metaDataCallback();
              finishedBufferingCallback();

              player.reset();

              expect(player.getSource()).toBe(undefined);
            });

            it('Get Mime Type Returns Undefined In Empty State After Reset', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              metaDataCallback();
              finishedBufferingCallback();

              player.reset();

              expect(player.getMimeType()).toBe(undefined);
            });

            it('Get Current Time Returns Undefined In Empty State After Reset', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              metaDataCallback();
              finishedBufferingCallback();

              player.reset();

              expect(player.getCurrentTime()).toBe(undefined);
            });

            it('Get Seekable Range Returns Undefined In Empty State After Reset', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              metaDataCallback();
              finishedBufferingCallback();

              player.reset();

              expect(player.getSeekableRange()).toBe(undefined);
            });

            it('Get Duration Returns Undefined In Empty State After Reset', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              metaDataCallback();
              finishedBufferingCallback();

              player.reset();

              expect(player.getDuration()).toBe(undefined);
            });

            it('Calling Begin Playback In Empty State Is An Error', function () {
              player.beginPlayback();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlayback while in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Begin Playback From In Empty State Is An Error', function () {
              player.beginPlaybackFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlaybackFrom while in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Pause In Empty State Is An Error', function () {
              player.pause();

              expect(logger.error).toHaveBeenCalledWith('Cannot pause while in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Resume In Empty State Is An Error', function () {
              player.resume();

              expect(logger.error).toHaveBeenCalledWith('Cannot resume while in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Stop In Empty State Is An Error', function () {
              player.stop();

              expect(logger.error).toHaveBeenCalledWith('Cannot stop while in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Initialise Media In Empty State Goes To Stopped State', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });

            it('Calling Reset In Empty State Stays In Empty State', function () {
              player.reset();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.EMPTY);
            });
          });

          describe('Stopped state tests', function () {
            beforeEach(function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              recentEvents = [];
            });

            it('Get Source Returns Correct Value In Stopped State', function () {
              expect(player.getSource()).toEqual('testUrl');
            });

            it('Get Mime Type Returns Correct Value In Stopped State', function () {
              expect(player.getMimeType()).toEqual('testMimeType');
            });

            it('Get Current Time Returns Undefined In Stopped State', function () {
              expect(player.getCurrentTime()).toEqual(undefined);
            });

            it('Get Seekable Range Returns Undefined In Stopped State', function () {
              expect(player.getSeekableRange()).toEqual(undefined);
            });

            it('Get Duration Returns Undefined In Stopped State', function () {
              expect(player.getDuration()).toEqual(undefined);
            });

            it('Calling Initialise Media In Stopped State Is An Error', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

              expect(logger.error).toHaveBeenCalledTimes(1);
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Play From In Stopped State Is An Error', function () {
              player.playFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot playFrom while in the \'STOPPED\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Pause In Stopped State Is An Error', function () {
              player.pause();

              expect(logger.error).toHaveBeenCalledWith('Cannot pause while in the \'STOPPED\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Resume In Stopped State Is An Error', function () {
              player.resume();

              expect(logger.error).toHaveBeenCalledWith('Cannot resume while in the \'STOPPED\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Send Meta Data In Stopped State Stays In Stopped State', function () {
              metaDataCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });

            it('Finish Buffering In Stopped State Stays In Stopped State', function () {
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });

            it('Start Buffering In Stopped State Stays In Stopped State', function () {
              waitingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });

            it('Player Error In Stopped State Gets Reported', function () {
              spyOnProperty(mockVideoMediaElement, 'error').and.returnValue({code: 'test'});
              errorCallback({type: 'testError'});

              expect(logger.error).toHaveBeenCalledWith('Media element error code: test');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Time Passing Does Not Cause Status Event To Be Sent In Stopped State', function () {
              mockVideoMediaElement.currentTime += 1;

              expect(recentEvents).toEqual([]);
            });

            it('Calling Reset In Stopped State Goes To Empty State', function () {
              player.reset();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.EMPTY);
            });

            it('Calling Begin Playback From In Stopped State Goes To Buffering State', function () {
              player.beginPlaybackFrom();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('Finish Buffering Then Begin Playback From In Stopped State Goes To Buffering', function () {
              finishedBufferingCallback();

              player.beginPlaybackFrom();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('Calling Begin Playback In Stopped State Goes To Buffering State', function () {
              player.beginPlayback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('Calling Stop In Stopped State Stays In Stopped State', function () {
              player.stop();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });
          });

          describe('Buffering state tests', function () {
            beforeEach(function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              player.beginPlaybackFrom(0);
              recentEvents = [];
            });

            it('Get Source Returns Expected Value In Buffering State', function () {
              expect(player.getSource()).toEqual('testUrl');
            });

            it('Get Mime Type Returns Expected Value In Buffering State', function () {
              expect(player.getMimeType()).toEqual('testMimeType');
            });

            it('Calling Initialise Media In Buffering State Is An Error', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

              expect(logger.error).toHaveBeenCalledWith('Cannot set source unless in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Begin Playback In Buffering State Is An Error', function () {
              player.beginPlayback();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlayback while in the \'BUFFERING\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Begin Playback From In Buffering State Is An Error', function () {
              player.beginPlaybackFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlaybackFrom while in the \'BUFFERING\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Reset In Buffering State Is An Error', function () {
              player.reset();

              expect(logger.error).toHaveBeenCalledWith('Cannot reset while in the \'BUFFERING\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Send Meta Data In Buffering State Stays In Buffering State', function () {
              metaDataCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('Start Buffering In Buffering State Stays In Buffering State', function () {
              waitingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('Device Error In Buffering State Gets Reported', function () {
              spyOnProperty(mockVideoMediaElement, 'error').and.returnValue({code: 'test'});
              errorCallback();

              expect(logger.error).toHaveBeenCalledWith('Media element error code: test');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Time Passing Does Not Cause Status Event To Be Sent In Buffering State', function () {
              mockVideoMediaElement.currentTime += 1;

              expect(recentEvents).toEqual([]);
            });

            it('When Buffering Finishes And No Further Api Calls Then We Go To Playing State', function () {
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it('When Pause Called And Buffering Finishes Then We Go To Paused State', function () {
              player.pause();

              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it('When Pause Then Resume Called Before Buffering Finishes Then We Go To Playing State', function () {
              player.pause();
              player.resume();

              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it('When Begin Playback From Middle Of Media And Buffering Finishes Then We Go To Playing From Specified Point', function () {
              player.stop();
              player.beginPlaybackFrom(20);

              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
              expect(mockVideoMediaElement.currentTime).toEqual(20);
            });

            it('Calling Stop In Buffering State Goes To Stopped State', function () {
              player.stop();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });

            it('Device Buffering Notification In Buffering State Does Not Emit Second Buffering Event', function () {
              waitingCallback();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.BUFFERING);
            });
          });

          describe('Playing State Tests', function () {
            beforeEach(function () {
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              metaDataCallback();

              jasmine.clock().install();
            });

            afterEach(function () {
              jasmine.clock().uninstall();
              player = null;
            });

            it('Get Source Returns Expected Value In Playing State', function () {
              expect(player.getSource()).toEqual('testUrl');
            });

            it('Get Mime Type Returns Expected Value In Playing State', function () {
              expect(player.getMimeType()).toEqual('testMimeType');
            });

            it('Get Current Time Returns Expected Value In Playing State', function () {
              expect(player.getCurrentTime()).toEqual(0);
            });

            it('Get Seekable Range Returns Expected Value In Playing State', function () {
              expect(player.getSeekableRange()).toEqual({ start: 0, end: 100 });
            });

            it('Get Duration Returns Expected Value In Playing State', function () {
              expect(player.getDuration()).toEqual(100);
            });

            it('Calling Begin Playback In Playing State Is An Error', function () {
              player.beginPlayback();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlayback while in the \'PLAYING\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Begin Playback From In Playing State Is An Error', function () {
              player.beginPlaybackFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlaybackFrom while in the \'PLAYING\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Initialise Media In Playing State Is An Error', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

              expect(logger.error).toHaveBeenCalledWith('Cannot set source unless in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Reset In Playing State Is An Error', function () {
              player.reset();

              expect(logger.error).toHaveBeenCalledWith('Cannot reset while in the \'PLAYING\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Send Meta Data In Playing State Stays In Playing State', function () {
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

              metaDataCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it('Finish Buffering In Playing State Stays In Playing State', function () {
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it('Device Error In Playing State Gets Reported', function () {
              spyOnProperty(mockVideoMediaElement, 'error').and.returnValue({code: 'testError'});

              errorCallback();

              expect(logger.error).toHaveBeenCalledWith('Media element error code: testError');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('When Call Resume While Already Playing Then Remain In Play State', function () {
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

              player.resume();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it('When Call Play From While Playing Goes To Buffering State', function () {
              player.playFrom(90);

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('When Calling Pause While Playing Goes To Paused State', function () {
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

              player.pause();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it('When Media Finishes When Playing Then Goes To Complete State', function () {
              giveMediaElementMetaData(mockVideoMediaElement, {start: 1, end: 99});

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

              mockVideoMediaElement.currentTime = 100;
              endedCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.COMPLETE);
            });

            it('When Buffering Starts While Playing Goes To Buffering State', function () {
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

              waitingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('Get Regular Status Event When Playing', function () {
              timeupdateCallback();
              jasmine.clock().tick(1000);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.STATUS);

              recentEvents = [];
              timeupdateCallback();
              jasmine.clock().tick(1000);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.STATUS);

              recentEvents = [];
              timeupdateCallback();
              jasmine.clock().tick(1000);

              expect(recentEvents).toContain(MediaPlayerBase.EVENT.STATUS);
            });

            it('Get Duration Returns Infinity With A Live Video Stream', function () {
              player.stop();
              player.reset();
              player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              metaDataCallback();

              var actualDurations = [0, 'foo', undefined, null, Infinity, 360];
              for (var i = 0; i < actualDurations.length; i++) {
                giveMediaElementMetaData(mockVideoMediaElement, { start: 0, end: actualDurations[i] });

                expect(player.getDuration()).toEqual(Infinity);
              }
            });

            it('Get Duration Returns Infinity With A Live Audio Stream', function () {
              player.stop();
              player.reset();
              player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_AUDIO, 'testUrl', 'testMimeType', sourceContainer, {});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              metaDataCallback();

              var actualDurations = [0, 'foo', undefined, null, Infinity, 360];
              for (var i = 0; i < actualDurations.length; i++) {
                giveMediaElementMetaData(mockAudioMediaElement, { start: 0, end: actualDurations[i] });

                expect(player.getDuration()).toEqual(Infinity);
              }
            });
          });

          describe('Paused state tests', function () {
            beforeEach(function () {
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () { return 0; },
                end: function () { return 100; },
                length: 2
              });

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              metaDataCallback();
              player.pause();

              jasmine.clock().install();
            });

            afterEach(function () {
              jasmine.clock().uninstall();
              recentEvents = [];
            });

            it('Get Source Returns Expected Value In Paused State', function () {
              expect(player.getSource()).toEqual('testUrl');
            });

            it('Get Mime Type Returns Expected Value In Paused State', function () {
              expect(player.getMimeType()).toEqual('testMimeType');
            });

            it('Get Current Time Returns Expected Value In Paused State', function () {
              expect(player.getCurrentTime()).toEqual(0);
            });

            it('Get Seekable Range Returns Expected Value In Paused State', function () {
              expect(player.getSeekableRange()).toEqual({start: 0, end: 100});
            });

            it('Get Duration Returns Expected Value In Paused State', function () {
              expect(player.getDuration()).toEqual(100);
            });

            it('Calling Begin Playback In Paused State Is An Error', function () {
              player.beginPlayback();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlayback while in the \'PAUSED\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Begin Playback From In Paused State Is An Error', function () {
              player.beginPlaybackFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlaybackFrom while in the \'PAUSED\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Initialise Media In Paused State Is An Error', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

              expect(logger.error).toHaveBeenCalledWith('Cannot set source unless in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Calling Reset In Paused State Is An Error', function () {
              player.reset();

              expect(logger.error).toHaveBeenCalledWith('Cannot reset while in the \'PAUSED\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Send Meta Data In Paused State Stays In Paused State', function () {
              metaDataCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it('Finish Buffering In Paused State Stays In Paused State', function () {
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it('Start Buffering In Paused State Stays In Paused State', function () {
              waitingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            });

            it('Device Error In Paused State Gets Reported', function () {
              spyOnProperty(mockVideoMediaElement, 'error').and.returnValue({code: 'testError'});

              errorCallback();

              expect(logger.error).toHaveBeenCalledTimes(1);
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
            });

            it('Time Passing Does Not Cause Status Event To Be Sent In Paused State', function () {
              jasmine.clock().tick(10000);

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.STATUS);
            });

            it('When Calling Resume While Paused Goes To Playing State', function () {
              player.resume();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
            });

            it('When Call Play From While Paused Goes To Buffering State', function () {
              player.playFrom(90);

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('When Call Pause While Already Paused Then Remain In Paused State', function () {
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);

              player.pause();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            }
            );

            it('When Calling Stop While Paused Goes To Stopped State', function () {
              player.stop();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });
          });

          describe('Complete state tests', function () {
            beforeEach(function () {
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () { return 0; },
                end: function () { return 100; },
                length: 2
              });

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              metaDataCallback();
              mockVideoMediaElement.currentTime = 100;
              endedCallback();

              jasmine.clock().install();
            });

            afterEach(function () {
              jasmine.clock().uninstall();
            });

            it('Get Source Returns Expected Value In Complete State', function () {
              expect(player.getSource()).toEqual('testUrl');
            });

            it('Get Mime Type Returns Expected Value In Complete State', function () {
              expect(player.getMimeType()).toEqual('testMimeType');
            });

            it('Get Seekable Range Returns Expected Value In Complete State', function () {
              expect(player.getSeekableRange()).toEqual({ start: 0, end: 100 });
            });

            it('Get Duration Returns Expected Value In Complete State', function () {
              expect(player.getDuration()).toEqual(100);
            });

            it('Get Current Time Returns Expected Value In Complete State', function () {
              expect(player.getCurrentTime()).toEqual(100);
            });

            it('Calling Begin Playback In Complete State Is An Error', function () {
              player.beginPlayback();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlayback while in the \'COMPLETE\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Begin Playback From In Complete State Is An Error', function () {
              player.beginPlaybackFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlaybackFrom while in the \'COMPLETE\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Initialise Media From In Complete State Is An Error', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

              expect(logger.error).toHaveBeenCalledWith('Cannot set source unless in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Pause From In Complete State Is An Error', function () {
              player.pause();

              expect(logger.error).toHaveBeenCalledWith('Cannot pause while in the \'COMPLETE\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Resume From In Complete State Is An Error', function () {
              player.resume();

              expect(logger.error).toHaveBeenCalledWith('Cannot resume while in the \'COMPLETE\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Reset From In Complete State Is An Error', function () {
              player.reset();

              expect(logger.error).toHaveBeenCalledWith('Cannot reset while in the \'COMPLETE\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            }
            );

            it('Send Meta Data In Complete State Stays In Complete State', function () {
              var previousState = player.getState();

              metaDataCallback();

              expect(player.getState()).toEqual(previousState);
            });

            it('Finish Buffering In Complete State Stays In Complete State', function () {
              var previousState = player.getState();

              finishedBufferingCallback();

              expect(player.getState()).toEqual(previousState);
            });

            it('Start Buffering In Complete State Stays In Complete State', function () {
              var previousState = player.getState();

              waitingCallback();

              expect(player.getState()).toEqual(previousState);
            });

            it('Time Passing Does Not Cause Status Event To Be Sent In Complete State', function () {
              timeupdateCallback();
              jasmine.clock().tick();

              expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.STATUS);
            });

            it('When Call Play From While Complete Goes To Buffering State', function () {
              player.playFrom(90);

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
            });

            it('Calling Stop In Complete State Goes To Stopped State', function () {
              player.stop();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.STOPPED);
            });
          });

          describe('Error state tests', function () {
            beforeEach(function () {
              spyOnProperty(mockVideoMediaElement, 'duration').and.returnValue(100);
              spyOnProperty(mockVideoMediaElement, 'seekable').and.returnValue({
                start: function () { return 0; },
                end: function () { return 100; },
                length: 2
              });
              spyOnProperty(mockVideoMediaElement, 'error').and.returnValue({code: 'testError'});

              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});
              player.beginPlaybackFrom(0);
              finishedBufferingCallback();
              metaDataCallback();
              mockVideoMediaElement.currentTime = 100;
              player.reset();

              recentEvents = [];
              jasmine.clock().install();
            });

            afterEach(function () {
              jasmine.clock().uninstall();
            });

            it('Get Source Returns Undefined In Error State', function () {
              expect(player.getSource()).toBe(undefined);
            });

            it('Get Mime Type Returns Undefined In Error State', function () {
              expect(player.getMimeType()).toBe(undefined);
            });

            it('Get Seekable Range Returns Undefined In Error State', function () {
              expect(player.getSeekableRange()).toBe(undefined);
            });

            it('Get Duration Returns Undefined In Error State', function () {
              expect(player.getDuration()).toBe(undefined);
            });

            it('Get Current Time Returns Undefined In Error State', function () {
              expect(player.getCurrentTime()).toBe(undefined);
            });

            it('Calling Begin Playback In Error State Is An Error', function () {
              player.beginPlayback();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlayback while in the \'ERROR\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Begin Playback From In Error State Is An Error', function () {
              player.beginPlaybackFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot beginPlaybackFrom while in the \'ERROR\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Initialise Media In Error State Is An Error', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'testUrl', 'testMimeType', sourceContainer, {});

              expect(logger.error).toHaveBeenCalledWith('Cannot set source unless in the \'EMPTY\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Play From In Error State Is An Error', function () {
              player.playFrom();

              expect(logger.error).toHaveBeenCalledWith('Cannot playFrom while in the \'ERROR\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Pause In Error State Is An Error', function () {
              player.pause();

              expect(logger.error).toHaveBeenCalledWith('Cannot pause while in the \'ERROR\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Resume In Error State Is An Error', function () {
              player.resume();

              expect(logger.error).toHaveBeenCalledWith('Cannot resume while in the \'ERROR\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Stop From In Error State Is An Error', function () {
              player.stop();

              expect(logger.error).toHaveBeenCalledWith('Cannot stop while in the \'ERROR\' state');
              expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });

            it('Calling Reset In Error State Goes To Empty State', function () {
              player.reset();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.EMPTY);
            });

            it('When Buffering Finishes During Error We Continue To Be In Error', function () {
              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);

              metaDataCallback();
              finishedBufferingCallback();

              expect(player.getState()).toEqual(MediaPlayerBase.STATE.ERROR);
            });
          });

          describe('Debug message logged for clamped playFrom', function () {
            it('When Play From Gets Clamped From Buffering A Debug Message Is Logged', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://testurl/', 'video/mp4', sourceContainer, {});

              giveMediaElementMetaData(mockVideoMediaElement, {start: 0, end: 0});
              metaDataCallback();
              player.beginPlaybackFrom(0);

              finishedBufferingCallback();

              player.playFrom(50);
              timeupdateCallback();

              expect(logger.debug).toHaveBeenCalledTimes(1);
              expect(logger.debug).toHaveBeenCalledWith('play From 50 clamped to 0 - seekable range is { start: 0, end: 0 }');
            });

            it('When Play From Gets Clamped From Playing State A Debug Message Is Logged', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://testurl/', 'video/mp4', sourceContainer, {});
              giveMediaElementMetaData(mockVideoMediaElement, {start: 0, end: 0});
              metaDataCallback();
              finishedBufferingCallback();

              player.beginPlaybackFrom(0);

              player.playFrom(110);

              expect(logger.debug).toHaveBeenCalledWith('play From 110 clamped to 0 - seekable range is { start: 0, end: 0 }');
            });

            it('When Play From Gets Clamped From Playing State With Non Zero End Of Range A Debug Message Is Logged', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://testurl/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(0);
              giveMediaElementMetaData(mockVideoMediaElement, { start: 0, end: 100 });
              metaDataCallback();
              finishedBufferingCallback();
              player.playFrom(110);

              expect(logger.debug).toHaveBeenCalledWith('play From 110 clamped to 98.9 - seekable range is { start: 0, end: 100 }');
              expect(logger.debug).toHaveBeenCalledTimes(1);
            });

            it('When Play From Gets Clamped From Paused State A Debug Message Is Logged', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://testurl/', 'video/mp4', sourceContainer, {});
              player.beginPlayback();
              giveMediaElementMetaData(mockVideoMediaElement, { start: 0, end: 60 });
              metaDataCallback();
              finishedBufferingCallback();
              player.playFrom(80);

              expect(logger.debug).toHaveBeenCalledWith('play From 80 clamped to 58.9 - seekable range is { start: 0, end: 60 }');
              expect(logger.debug).toHaveBeenCalledTimes(1);
            });

            it('When Begin Playback From Does Not Get Clamped A Debug Message Is Not Logged', function () {
              player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://testurl/', 'video/mp4', sourceContainer, {});
              player.beginPlaybackFrom(50);
              giveMediaElementMetaData(mockVideoMediaElement, { start: 0, end: 60 });
              metaDataCallback();
              finishedBufferingCallback();

              expect(logger.debug).not.toHaveBeenCalled();
            });
          });
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
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
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
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.ERROR);
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
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

            player.beginPlaybackFrom(0);
            metaDataCallback();
            finishedBufferingCallback();

            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);

            waitingCallback();

            mockVideoMediaElement.currentTime = 50.999;

            expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);

            player.playFrom(50);
            finishedBufferingCallback();

            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
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
          beforeEach(function () {
            jasmine.clock().install();
          });

          afterEach(function () {
            jasmine.clock().uninstall();
          });

          it(' Waiting Html5 Event While Buffering Only Gives Single Buffering Event', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

            player.beginPlaybackFrom(0);
            waitingCallback();

            expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
          });

          it(' Seek Attempted Event Emitted On Initialise Media If The State Is Empty', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);
          });

          it('Seek Finished Event Emitted On Status Update When Time is Within Sentinel Threshold And The State is Playing', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);

            player.beginPlaybackFrom(0);
            waitingCallback();
            playingCallback();

            // initialise player.
            // emit 5 status updates with time. (But why 5 though?)
            // make sure the current time is within the seek sentinel threshold otherwise the seek finished event won't be fired! This appears not to matter if the time is 0 anyway...
            // This means that in the event that sentinels aren't fired all this does is increment and decrement counters!
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
          });

          it('Seek Finished Event Is Emitted Only Once', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);

            player.beginPlaybackFrom(0);
            waitingCallback();
            playingCallback();

            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
            recentEvents = [];
            timeupdateCallback();

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
          });

          // testIfTimeIsInRangeAndHasBeenPlaying5TimesWith10SecondTimeoutWeFireSeekFinishedEvent
          it(' Seek Finished Event Is Emitted After restartTimeout When Enabled', function () {
            var restartTimeoutConfig = {
              streaming: {
                overrides: {
                  forceBeginPlaybackToEndOfWindow: true
                }
              },
              restartTimeout: 10000
            };

            createPlayer(restartTimeoutConfig, logger);

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_ATTEMPTED);

            player.beginPlaybackFrom(0);
            waitingCallback();
            playingCallback();

            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();
            timeupdateCallback();

            jasmine.clock().tick(10000);

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);

            jasmine.clock().tick(1100);
            timeupdateCallback();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SEEK_FINISHED);
          });
        });

        describe('Sentinels', function () {
          function waitForSentinels () {
            jasmine.clock().tick(1100);
          }

          beforeEach(function () {
            jasmine.clock().install();
            jasmine.clock().mockDate();
          });

          afterEach(function () {
            jasmine.clock().uninstall();
          });

          it(' Enter Buffering Sentinel Causes Transition To Buffering When Playback Halts For More Than One Sentinel Iteration Since State Changed', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime += 1;
            mockVideoMediaElement.currentTime += 1;

            recentEvents = [];
            waitForSentinels();
            waitForSentinels();
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
            expect(recentEvents).toContain(MediaPlayerBase.EVENT.BUFFERING);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
          });

          it(' Enter Buffering Sentinel Not Fired When Sentinels Disabled', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime += 1;
            mockVideoMediaElement.currentTime += 1;

            recentEvents = [];
            waitForSentinels();
            waitForSentinels();
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
          });

          it(' No Sentinels Activate When Current Time Runs Normally Then Jumps Backwards', function () {
            var INITIAL_TIME = 30;
            var SEEK_SENTINEL_TOLERANCE = 15;
            var AFTER_JUMP_TIME = INITIAL_TIME - (SEEK_SENTINEL_TOLERANCE + 5);

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
            player.beginPlaybackFrom(INITIAL_TIME);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            recentEvents = [];

            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            mockVideoMediaElement.currentTime = AFTER_JUMP_TIME;
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
          });

          it(' No Sentinels Activate When Current Time Runs Normally Then Jumps Backwards Near End Of Media', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(95);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            recentEvents = [];

            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            mockVideoMediaElement.currentTime = 100;
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
          });

          it(' Pause Sentinel Activates When Current Time Runs Normally Then Jumps Backwards When Paused', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(10);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            player.pause();
            recentEvents = [];

            mockVideoMediaElement.currentTime = 0;
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
          });

          it(' Enter Buffering Sentinel Does Not Activate When Playback Halts When Only One Sentinel Iteration Since State Changed', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(10);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime += 1;

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([]);
          });

          it(' Enter Buffering Sentinel Does Nothing When Playback Is Working', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(10);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime += 1;
            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
          });

          it(' Enter Buffering Sentinel Does Nothing When Device Reports Buffering Correctly', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(10);

            waitingCallback();

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([]);
          });

          it(' Enter Buffering Sentinel Does Nothing When Device Is Paused', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(10);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime += 1;

            player.pause();

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([]);
          });
          function ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted () {
            var i;
            for (i = 0; i < 3; i++) {
              mockVideoMediaElement.currentTime += 1;
              waitForSentinels();
            }

            for (i = 0; i < 2; i++) {
              mockVideoMediaElement.currentTime = 0;
              waitForSentinels();
            }

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
          }

          function ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted () {
            for (var i = 0; i < 2; i++) {
              mockVideoMediaElement.currentTime = 0;
              waitForSentinels();
            }

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
          }

          function ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance () {
            var i;

            for (i = 0; i < 3; i++) {
              mockVideoMediaElement.currentTime += 1;
              waitForSentinels();
            }

            for (i = 0; i < 2; i++) {
              mockVideoMediaElement.currentTime = 0;
              waitForSentinels();
            }

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);

            mockVideoMediaElement.currentTime = 0.01;
            waitForSentinels();

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
          }

          it(' Enter Buffering Sentinel Does Nothing When Device Time Is Reported As Zero During Playback', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(10);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            recentEvents = [];
            ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted();
          });

          it(' Enter Buffering Sentinel Does Nothing When Begin Playback Is Called And Device Time Is Reported As Zero For At Least Two Intervals', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(20);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            recentEvents = [];
            ensureEnterBufferingSentinelIsNotCalledWhenZeroesCannotBeTrusted();
          });

          it(' Enter Buffering Sentinel Fires When Begin Playback From Zero Is Called And Device Time Does Not Advance', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            recentEvents = [];
            ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted();
          });

          it(' Enter Buffering Sentinel Fires When Begin Playback Is Called And Device Time Does Not Advance', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            recentEvents = [];
            ensureEnterBufferingSentinelIsCalledWhenZeroesCanBeTrusted();
          });

          it(' Enter Buffering Sentinel Fires When Seeked To Zero And Device Time Is Reported As Zero For At Least Two Intervals', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(20);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            recentEvents = [];

            player.playFrom(0);
            finishedBufferingCallback();
            waitForSentinels();
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
          });

          it(' Enter Buffering Sentinel Only Fires On Second Attempt When Device Reports Time As Not Changing Within Tolerance', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();
            recentEvents = [];

            ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance();

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);

            mockVideoMediaElement.currentTime = 0.01;
            waitForSentinels();

            mockVideoMediaElement.currentTime = 0.01;
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_ENTER_BUFFERING);
          });

          it(' Enter Buffering Sentinel Does Not Fire On Two Non Consecutive Occurrences Of Device Reporting Time As Not Changing Within Tolerance', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();
            recentEvents = [];

            ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance();
            ForThreeIntervalsOfNormalPlaybackTwoIntervalsOfZeroesAndOneIntervalOfTimeIncreaseBelowSentinelTolerance();
          });

          it(' Exit Buffering Sentinel Causes Transition To Playing When Playback Starts', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});

            mockVideoMediaElement.currentTime += 1;
            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING, MediaPlayerBase.EVENT.PLAYING]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PLAYING);
          });

          it(' Exit Buffering Sentinel Not Fired When Sentinels Disabled', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});

            mockVideoMediaElement.currentTime += 1;

            recentEvents = [];
            waitForSentinels();

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.BUFFERING);
          });

          it(' Exit Buffering Sentinel Causes Transition To Paused When Device Reports Paused', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

            metaDataCallback({start: 0, end: 100});

            player.pause();

            recentEvents = [];
            mockVideoMediaElement.paused = true;
            waitForSentinels();

            expect(recentEvents).toEqual([MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING, MediaPlayerBase.EVENT.PAUSED]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
          });

          it(' Exit Buffering Sentinel Is Not Fired When Device Is Paused And Metadata Has Been Not Been Loaded', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(0);

              // Meta Data is not loaded at this point
            mockVideoMediaElement.paused = true;
            waitForSentinels();

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_EXIT_BUFFERING);
          });

          it('Seek Sentinel Sets Current Time', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(50);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(mockVideoMediaElement.currentTime).toEqual(50);
          });

          it(' Seek Sentinel Sets Current Time Not Fired When Sentinels Disabled', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
            player.beginPlaybackFrom(50);

            metaDataCallback({start: 0, end: 100});
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(mockVideoMediaElement.currentTime).toEqual(0);
          });

          it(' Seek Sentinel Clamps Target Seek Time When Required', function () {
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
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(mockVideoMediaElement.currentTime).toEqual(98.9);
          });

          it(' Seek Sentinel Does Not Reseek To Initial Seek Time After 15s', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(10);
            finishedBufferingCallback();

            recentEvents = [];
            for (var i = 0; i < 20; i++) {
              mockVideoMediaElement.currentTime += 1;
              waitForSentinels();
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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(95);
            finishedBufferingCallback();

            recentEvents = [];
            for (var i = 0; i < 20; i++) {
              mockVideoMediaElement.currentTime += 1;
              waitForSentinels();
            }

            expect(recentEvents).toEqual([]);
            expect(mockVideoMediaElement.currentTime).toEqual(115);
          });

          it(' Seek Sentinel Sets Current Time When Paused', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(50);
            finishedBufferingCallback();

            player.pause();
            mockVideoMediaElement.currentTime = 0;

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(mockVideoMediaElement.currentTime).toEqual(50);
          });

          it(' Seek Sentinel Does Not Seek When Begin Playback Called', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(0);
            finishedBufferingCallback();

            recentEvents = [];
            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(mockVideoMediaElement.currentTime).toEqual(1);
          });

          it(' Seek Sentinel Does Not Seek When Begin Playback Starts Playing Half Way Through Media', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(50);
            finishedBufferingCallback();

            recentEvents = [];
            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(mockVideoMediaElement.currentTime).toEqual(51);
          });

          it(' Seek Sentinel Does Not Seek When Begin Playback After Previously Seeking', function () {
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
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(mockVideoMediaElement.currentTime).toEqual(1);
          });

          it(' Seek Sentinel Activates When Device Reports New Position Then Reverts To Old Position', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(50);
            finishedBufferingCallback();

            waitForSentinels();
            mockVideoMediaElement.currentTime = 0;

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(mockVideoMediaElement.currentTime).toEqual(50);
          });

          it(' Seek Sentinel Does Not Fire In Live When Device Jumps Back Less Than Thirty Seconds', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(29.9);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
          });

          it(' Seek Sentinel Fires In Live When Device Jumps Back More Than Thirty Seconds', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.LIVE_VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(30.1);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
          });

          it(' Pause Sentinel Retries Pause If Pause Fails', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(0);
            finishedBufferingCallback();
            player.pause();

            mockVideoMediaElement.currentTime += 1;
            recentEvents = [];
            mockVideoMediaElement.pause.calls.reset();
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
          });

          it(' Pause Sentinel Not Fired When Sentinels Disabled', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(0);
            finishedBufferingCallback();
            player.pause();

            mockVideoMediaElement.currentTime += 1;
            recentEvents = [];
            mockVideoMediaElement.pause.calls.reset();
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
          });

          it(' Pause Sentinel Does Not Retry Pause If Pause Succeeds', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(0);
            finishedBufferingCallback();
            player.pause();

            recentEvents = [];
            waitForSentinels();

            expect(recentEvents).toEqual([]);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
          });

          it(' Pause Sentinel Does Not Retry Pause If Pause Succeeds', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});
            metaDataCallback({start: 0, end: 100});

            player.beginPlaybackFrom(0);
            finishedBufferingCallback();
            player.pause();

            recentEvents = [];
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(98);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 99;
            waitForSentinels();

            mockVideoMediaElement.currentTime = 100;
            waitForSentinels();

            recentEvents = [];
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: true});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(98);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 99;
            waitForSentinels();

            mockVideoMediaElement.currentTime = 100;
            waitForSentinels();

            recentEvents = [];
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(98);
            finishedBufferingCallback();

            recentEvents = [];
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(98);
            finishedBufferingCallback();
            mockVideoMediaElement.duration = 150;

            recentEvents = [];
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(100);
            finishedBufferingCallback();
            endedCallback();

            recentEvents = [];
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(100);
            finishedBufferingCallback();

            recentEvents = [];
            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(0);
            player.playFrom(30);

            mockVideoMediaElement.currentTime = 0;
            finishedBufferingCallback();
            player.pause();

            recentEvents = [];
            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);

            recentEvents = [];
            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
          });

          function resetStubsThenAdvanceTimeThenRunSentinels () {
            recentEvents = [];
            mockVideoMediaElement.pause.calls.reset();
            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();
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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(0);
            finishedBufferingCallback();
            player.pause();

            resetStubsThenAdvanceTimeThenRunSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);

            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(0);
            finishedBufferingCallback();
            player.pause();

            resetStubsThenAdvanceTimeThenRunSentinels();
            resetStubsThenAdvanceTimeThenRunSentinels();
            resetStubsThenAdvanceTimeThenRunSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE_FAILURE);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);
            expect(mockVideoMediaElement.pause).not.toHaveBeenCalled();

            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(0);
            finishedBufferingCallback();

            player.pause();
            resetStubsThenAdvanceTimeThenRunSentinels();
            player.pause();

            resetStubsThenAdvanceTimeThenRunSentinels();
            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(0);
            finishedBufferingCallback();
            player.pause();

            resetStubsThenAdvanceTimeThenRunSentinels();
            resetStubsThenAdvanceTimeThenRunSentinels();

            player.resume();
            player.pause();

            resetStubsThenAdvanceTimeThenRunSentinels();
            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(50);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(mockVideoMediaElement.currentTime).toEqual(50);

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(50);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK_FAILURE);
            expect(mockVideoMediaElement.currentTime).toEqual(1);

            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(50);
            finishedBufferingCallback();

            player.pause();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();
            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            expect(player.getState()).toEqual(MediaPlayerBase.STATE.PAUSED);

            mockVideoMediaElement.currentTime = 0;
            mockVideoMediaElement.currentTime += 1;
            resetStubsThenAdvanceTimeThenRunSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
            expect(mockVideoMediaElement.pause).toHaveBeenCalledTimes(1);

            mockVideoMediaElement.currentTime = 0;
            mockVideoMediaElement.currentTime += 1;
            mockVideoMediaElement.currentTime += 1;
            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(0);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();
            mockVideoMediaElement.currentTime = 0;

            player.playFrom(50);
            finishedBufferingCallback();
            mockVideoMediaElement.currentTime = 0;

            resetStubsThenAdvanceTimeThenRunSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(0);
            finishedBufferingCallback();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();

            mockVideoMediaElement.currentTime = 0;
            resetStubsThenAdvanceTimeThenRunSentinels();
            mockVideoMediaElement.currentTime = 0;

            player.stop();
            player.beginPlaybackFrom(50);
            finishedBufferingCallback();
            mockVideoMediaElement.currentTime = 0;

            resetStubsThenAdvanceTimeThenRunSentinels();

            expect(recentEvents).toContain(MediaPlayerBase.EVENT.SENTINEL_SEEK);
            expect(mockVideoMediaElement.currentTime).toEqual(50);
          });

          it(' Exit Buffering Sentinel Performs Deferred Seek If No Loaded Metadata Event', function () {
            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {});
            player.beginPlaybackFrom(50);

            mockVideoMediaElement.currentTime += 1;
            waitForSentinels();

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

            player.initialiseMedia(MediaPlayerBase.TYPE.VIDEO, 'http://url/', 'video/mp4', sourceContainer, {disableSentinels: false});

            metaDataCallback({start: 0, end: 100});
            player.beginPlaybackFrom(20);
            finishedBufferingCallback();

            recentEvents = [];

            player.pause();
            mockVideoMediaElement.currentTime += 0.01;
            waitForSentinels();

            expect(recentEvents).not.toContain(MediaPlayerBase.EVENT.SENTINEL_PAUSE);
          });
        });
      });
    });
