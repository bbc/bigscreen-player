require(
  [
    'bigscreenplayer/playbackstrategy/html5strategy',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/mediakinds',
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/mediasources',
    'bigscreenplayer/models/livesupport'
  ],
  function (HTML5Strategy, WindowTypes, MediaKinds, MediaState, MediaSources, LiveSupport) {
    var html5Strategy;
    var cdnArray;
    var playbackElement;
    var mockMediaSources;
    var eventCallbacks;
    var eventHandlers = {};
    var testTimeCorrection;

    var mockAudioElement = document.createElement('audio');
    var mockVideoElement = document.createElement('video');

    function setUpStrategy (timeCorrection, windowType, mediaKind, windowStartTimeMS, windowEndTimeMS) {
      var defaultWindowType = windowType || WindowTypes.STATIC;
      var defaultMediaKind = mediaKind || MediaKinds.VIDEO;

      html5Strategy = HTML5Strategy(mockMediaSources, defaultWindowType, defaultMediaKind, playbackElement);
    }

    describe('HTML5 Strategy', function () {
      beforeEach(function () {
        playbackElement = document.createElement('div');
        playbackElement.id = 'app';
        document.body.appendChild(playbackElement);

        cdnArray = [
          { url: 'http://testcdn1/test/', cdn: 'http://testcdn1/test/' },
          { url: 'http://testcdn2/test/', cdn: 'http://testcdn2/test/' },
          { url: 'http://testcdn3/test/', cdn: 'http://testcdn3/test/' }
        ];

        mockMediaSources = {
          time: function () {
            return {correction: testTimeCorrection};
          },
          currentSource: function () {
            return cdnArray[0].url;
          }
        };

        spyOn(document, 'createElement').and.callFake(function (elementType) {
          if (elementType === 'audio') {
            return mockAudioElement;
          } else if (elementType === 'video') {
            return mockVideoElement;
          }
        });

        spyOn(mockVideoElement, 'load');
        spyOn(mockVideoElement, 'play');
        spyOn(mockVideoElement, 'pause');
        spyOn(mockVideoElement, 'addEventListener');
        spyOn(mockVideoElement, 'removeEventListener');

        mockVideoElement.addEventListener.and.callFake(function (eventType, handler) {
          eventHandlers[eventType] = handler;

          eventCallbacks = function (event) {
            eventHandlers[event].call(event);
          };
        });
      });

      afterEach(function () {
        testTimeCorrection = 0;
      });

      describe('transitions', function () {
        it('canBePaused() and canBeginSeek transitions are true', function () {
          setUpStrategy();

          expect(html5Strategy.transitions.canBePaused()).toBe(true);
          expect(html5Strategy.transitions.canBeginSeek()).toBe(true);
        });
      });

      describe('load', function () {
        it('should create a video element and add it to the playback element', function () {
          setUpStrategy(null, null, MediaKinds.VIDEO);

          expect(playbackElement.childElementCount).toBe(0);

          html5Strategy.load(null, 0);

          expect(playbackElement.firstChild).toBe(mockVideoElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should create an audio element and add it to the playback element', function () {
          setUpStrategy(null, null, MediaKinds.AUDIO);

          expect(playbackElement.childElementCount).toBe(0);

          html5Strategy.load(null, 0);

          expect(playbackElement.firstChild).toBe(mockAudioElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should set the style properties correctly on the media element', function () {
          setUpStrategy(null, null, MediaKinds.VIDEO);
          html5Strategy.load(null, 0);

          expect(mockVideoElement.style.position).toBe('absolute');
          expect(mockVideoElement.style.width).toBe('100%');
          expect(mockVideoElement.style.height).toBe('100%');
        });

        it('should set the autoplay and preload properties correctly on the media element', function () {
          setUpStrategy(null, null, MediaKinds.VIDEO);
          html5Strategy.load(null, 0);

          expect(mockVideoElement.autoplay).toBe(true);
          expect(mockVideoElement.preload).toBe('auto');
        });

        it('should set the source url correctly on the media element', function () {
          setUpStrategy(null, null, MediaKinds.VIDEO);
          html5Strategy.load(null, 0);

          expect(mockVideoElement.src).toBe('http://testcdn1/test/');
        });

        it('should call load on the media element', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);

          expect(mockVideoElement.load).toHaveBeenCalled();
        });

        it('should set up bindings to media element events correctly', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);

          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('canplay', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('timeupdate', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('playing', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('pause', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('waiting', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('seeking', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('seeked', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('ended', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('loadedmetadata', jasmine.any(Function));
        });
      });

      describe('play', function () {
        it('should call through to the media elements play function', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);
          html5Strategy.play();

          expect(mockVideoElement.play).toHaveBeenCalled();
        });
      });

      describe('pause', function () {
        it('should call through to the media elements pause function', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);
          html5Strategy.pause();

          expect(mockVideoElement.pause).toHaveBeenCalled();
        });

        // TODO: autoresume - will likely need dynamicWindowUtils squiring in

        // it('should start autoresume timeout if sliding window', function () {
        //   setUpStrategy();
        //   html5Strategy.load(null, 0);
        //   html5Strategy.pause();

        //   expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1);
        // });

        // it('should not start autoresume timeout if sliding window but disableAutoResume is set', function () {
        //   var opts = {
        //     disableAutoResume: true
        //   };

        //   setUpStrategy();
        //   html5Strategy.load(null, 0);
        //   html5Strategy.pause(opts);

        //   expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled();
        // });
      });

      describe('getSeekableRange', function () {
        beforeEach(function () {
          spyOnProperty(mockVideoElement, 'seekable').and.returnValue(
            {
              start: function () {
                return 0;
              },
              end: function () {
                return 100;
              },
              length: 2
            });
        });

        it('returns the correct start and end time before load has been called', function () {
          setUpStrategy();

          expect(html5Strategy.getSeekableRange()).toEqual({ start: 0, end: 0 });
        });

        it('returns the correct start and end time before meta data has loaded', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);

          expect(html5Strategy.getSeekableRange()).toEqual({ start: 0, end: 0 });
        });

        it('returns the correct start and end time once meta data has loaded', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          expect(html5Strategy.getSeekableRange()).toEqual({ start: 0, end: 100 });
        });

        // TODO: add a test that ensures we're subtracting the timeCorrection from seekable range
      });

      describe('getDuration', function () {
        beforeEach(function () {
          spyOnProperty(mockVideoElement, 'duration').and.returnValue(100);
        });

        it('returns duration of zero before load has been called', function () {
          setUpStrategy();

          expect(html5Strategy.getDuration()).toEqual(0);
        });

        it('returns duration of zero before meta data has loaded', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);

          expect(html5Strategy.getDuration()).toEqual(0);
        });

        it('returns the correct duration once meta data has loaded', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          expect(html5Strategy.getDuration()).toEqual(100);
        });
      });

      describe('getCurrentTime', function () {
        beforeEach(function () {
          mockVideoElement.currentTime = 5;
        });

        it('returns currentTime of zero before load has been called', function () {
          setUpStrategy();

          expect(html5Strategy.getCurrentTime()).toEqual(0);
        });

        it('returns the correct currentTime load has been called', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          mockVideoElement.currentTime = 10;

          expect(html5Strategy.getCurrentTime()).toEqual(10);
        });

        it('subtracts any time correction from the media elements current time', function () {
          testTimeCorrection = 20;
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          mockVideoElement.currentTime = 50;

          expect(html5Strategy.getCurrentTime()).toEqual(30);
        });
      });

      describe('setCurrentTime', function () {
        beforeEach(function () {
          spyOnProperty(mockVideoElement, 'seekable').and.returnValue(
            {
              start: function () {
                return 0;
              },
              end: function () {
                return 100;
              },
              length: 2
            });

          mockVideoElement.currentTime = 5;
        });

        it('sets the current time on the media element to that passed in', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          html5Strategy.setCurrentTime(10);

          expect(html5Strategy.getCurrentTime()).toEqual(10);
        });

        it('clamps the time to the start of the seekable range if passed in a time prior to this', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          html5Strategy.setCurrentTime(-5);

          expect(html5Strategy.getCurrentTime()).toEqual(0);
        });

        it('clamps the time to the end of the seekable range if passed in a time after this', function () {
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          html5Strategy.setCurrentTime(110);

          expect(html5Strategy.getCurrentTime()).toEqual(98.9);
        });

        it('adds time correction from the media source onto the passed in seek time', function () {
          testTimeCorrection = 20;
          setUpStrategy();
          html5Strategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          html5Strategy.setCurrentTime(50);

          expect(mockVideoElement.currentTime).toEqual(70);
        });
      });

      describe('isPaused', function () {
        it('should return false when the media element is not paused', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'paused').and.returnValue(false);

          expect(html5Strategy.isPaused()).toBe(false);
        });

        it('should return true when the media element is paused', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'paused').and.returnValue(true);

          expect(html5Strategy.isPaused()).toBe(true);
        });
      });

      describe('isEnded', function () {
        it('should return false when the media element is not ended', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'ended').and.returnValue(false);

          expect(html5Strategy.isEnded()).toBe(false);
        });

        it('should return true when the media element is ended', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'ended').and.returnValue(true);

          expect(html5Strategy.isEnded()).toBe(true);
        });
      });

      describe('tearDown', function () {
        beforeEach(function () {

        });

        it('should remove all event listener bindings', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);
          html5Strategy.tearDown();

          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('canplay', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('timeupdate', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('playing', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('pause', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('waiting', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('seeking', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('seeked', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('ended', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('loadedmetadata', jasmine.any(Function));
        });

        it('should remove the video element', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);

          expect(playbackElement.childElementCount).toBe(1);

          html5Strategy.tearDown();

          expect(playbackElement.childElementCount).toBe(0);
        });

        it('should empty the eventCallbacks ', function () {
          setUpStrategy();

          function tearDownAndError () {
            html5Strategy.addEventCallback(function () {}); // add event callback to prove array is emptied in tearDown
            html5Strategy.load(null, 0);
            html5Strategy.tearDown();
            eventCallbacks('pause');
          }

          expect(tearDownAndError).not.toThrowError();
        });

        // TODO: ensure error and timeUpdate callbacks are undefined
      });

      describe('getPlayerElement', function () {
        it('should return the mediaPlayer element', function () {
          setUpStrategy();
          html5Strategy.load(null, 0);

          expect(html5Strategy.getPlayerElement()).toEqual(mockVideoElement);
        });
      });

      describe('events', function () {
        var eventCallbackSpy;

        beforeEach(function () {
          setUpStrategy();
          html5Strategy.load(null, 25);

          eventCallbackSpy = jasmine.createSpy('eventSpy');
          html5Strategy.addEventCallback(this, eventCallbackSpy);
        });

        afterEach(function () {
          eventCallbackSpy.calls.reset();
        });

        it('should publish a state change to PLAYING on playing event', function () {
          eventCallbacks('playing');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to PAUSED on pause event', function () {
          eventCallbacks('pause');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to WAITING on seeking event', function () {
          eventCallbacks('seeking');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to WAITING on waiting event', function () {
          eventCallbacks('waiting');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to ENDED on ended event', function () {
          eventCallbacks('ended');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to PLAYING on seeked event if media element is not paused', function () {
          spyOnProperty(mockVideoElement, 'paused').and.returnValue(false);
          eventCallbacks('seeked');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to PAUSED on seeked event if media element is paused', function () {
          spyOnProperty(mockVideoElement, 'paused').and.returnValue(true);
          eventCallbacks('seeked');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        // TODO: should start the auto-resume timeout on seeked if in paused state

        it('should set the current time on the media element if there is one and the metadata is loaded on canplay event', function () {
          spyOnProperty(mockVideoElement, 'seekable').and.returnValue(
            {
              start: function () {
                return 0;
              },
              end: function () {
                return 100;
              },
              length: 2
            });

          expect(mockVideoElement.currentTime).toEqual(0);

          eventCallbacks('loadedmetadata');

          expect(mockVideoElement.currentTime).toEqual(0);

          eventCallbacks('canplay');

          expect(mockVideoElement.currentTime).toEqual(25);
        });

        it('should only set the current time on the media element on the first canplay event', function () {
          spyOnProperty(mockVideoElement, 'seekable').and.returnValue(
            {
              start: function () {
                return 0;
              },
              end: function () {
                return 100;
              },
              length: 2
            });

          eventCallbacks('loadedmetadata');
          eventCallbacks('canplay');

          expect(mockVideoElement.currentTime).toEqual(25);

          mockVideoElement.currentTime = 35;
          eventCallbacks('canplay');

          expect(mockVideoElement.currentTime).toEqual(35);
        });

        // TODO: etc, ( time update, errors)
      });
    });
  });
