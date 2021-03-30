require(
  ['squire'],
  function (Squire) {
    var originalBSPWindowConfig = window.bigscreenPlayer;
    var Subtitles;
    var subtitlesMock;
    var injector;
    var mediaSourcesMock;
    var subtitlesAvailable;
    var segmentLength = 3.84;

    describe('Subtitles', function () {
      mediaSourcesMock = {
        getCurrentCaptionsUrl: function () {
          if (subtitlesAvailable) {
            return 'http://captions.example.test';
          } else {
            return '';
          }
        }
      };

      beforeEach(function () {
        injector = new Squire();
        subtitlesAvailable = true;
      });

      afterEach(function () {
        window.bigscreenPlayer = originalBSPWindowConfig;
      });

      describe('strategy construction', function () {
        describe('legacy', function () {
          beforeEach(function (done) {
            window.bigscreenPlayer = {
              overrides: {
                legacySubtitles: true
              }
            };
            subtitlesMock = jasmine.createSpy();

            injector.mock({
              'bigscreenplayer/subtitles/legacysubtitles': subtitlesMock
            });

            injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
              Subtitles = Subs;
              done();
            });
          });

          it('implementation is available when legacy subtitles override is true', function () {
            var mockMediaPlayer = {};
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');
            Subtitles(mockMediaPlayer, null, autoStart, mockPlaybackElement);

            expect(subtitlesMock).toHaveBeenCalledTimes(1);
          });
        });

        describe('imscjs', function () {
          beforeEach(function (done) {
            subtitlesMock = jasmine.createSpy();

            injector.mock({
              'bigscreenplayer/subtitles/imscsubtitles': subtitlesMock
            });

            injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
              Subtitles = Subs;
              done();
            });
          });

          it('implementation is available when legacy subtitles override is false', function () {
            var mockMediaPlayer = {};
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');

            Subtitles(mockMediaPlayer, null, autoStart, mockPlaybackElement);

            expect(subtitlesMock).toHaveBeenCalledTimes(1);
          });
        });
      });

      describe('generic calls', function () {
        var subtitlesContainerSpies;
        var subtitlesContainer;

        beforeEach(function (done) {
          subtitlesContainerSpies = jasmine.createSpyObj('subtitlesContainer', ['start', 'stop', 'updatePosition', 'customise', 'renderExample', 'clearExample', 'tearDown']);
          subtitlesContainer = jasmine.createSpy();
          subtitlesContainer.and.callFake(function () {
            return subtitlesContainerSpies;
          });

          injector.mock({
            'bigscreenplayer/subtitles/imscsubtitles': subtitlesContainer
          });

          injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
            Subtitles = Subs;
            done();
          });
        });

        afterEach(function () {
          subtitlesContainerSpies.start.calls.reset();
          subtitlesContainerSpies.stop.calls.reset();
          subtitlesContainerSpies.updatePosition.calls.reset();
          subtitlesContainerSpies.tearDown.calls.reset();
        });

        describe('construction', function () {
          it('calls subtitles strategy with the correct arguments', function () {
            var mockMediaPlayer = {};
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');
            var customDefaultStyle = {};
            var windowStartTime = '123456';

            Subtitles(mockMediaPlayer, null, autoStart, mockPlaybackElement, customDefaultStyle, windowStartTime, mediaSourcesMock);

            expect(subtitlesContainer).toHaveBeenCalledWith(mockMediaPlayer, null, autoStart, mockPlaybackElement, customDefaultStyle, windowStartTime, mediaSourcesMock);
          });
        });

        describe('show', function () {
          it('should start subtitles when enabled and available', function () {
            var subtitles = Subtitles(null, null, null, null, null, null, mediaSourcesMock);
            subtitles.enable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).toHaveBeenCalledTimes(1);
          });

          it('should not start subtitles when disabled and available', function () {
            var subtitles = Subtitles(null, null, null, null, null, null, mediaSourcesMock);
            subtitles.disable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when enabled and unavailable', function () {
            subtitlesAvailable = false;
            var subtitles = Subtitles(null, null, null, null, null, null, mediaSourcesMock);
            subtitles.enable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when disabled and unavailable', function () {
            subtitlesAvailable = false;
            var subtitles = Subtitles(null, null, null, null, null, null, mediaSourcesMock);
            subtitles.disable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });
        });

        describe('hide', function () {
          it('should stop subtitles when available', function () {
            var subtitles = Subtitles(null, null, null, null, null, null, mediaSourcesMock);
            subtitles.hide();

            expect(subtitlesContainerSpies.stop).toHaveBeenCalledWith();
          });
        });

        describe('enable', function () {
          it('should set enabled state to true', function () {
            var subtitles = Subtitles(null, null, null, null);
            subtitles.enable();

            expect(subtitles.enabled()).toEqual(true);
          });
        });

        describe('disable', function () {
          it('should set enabled state to false', function () {
            var subtitles = Subtitles(null, null, null, null);
            subtitles.disable();

            expect(subtitlesContainerSpies.stop).not.toHaveBeenCalled();
            expect(subtitles.enabled()).toEqual(false);
          });
        });

        describe('enabled', function () {
          it('should return true if subtitles are enabled at construction', function () {
            var subtitles = Subtitles(null, null, true, null);

            expect(subtitles.enabled()).toEqual(true);
          });

          it('should return true if subtitles are enabled by an api call', function () {
            var subtitles = Subtitles(null, null, false, null);
            subtitles.enable();

            expect(subtitles.enabled()).toEqual(true);
          });

          it('should return false if subtitles are disabled at construction', function () {
            var subtitles = Subtitles(null, null, false, null);

            expect(subtitles.enabled()).toEqual(false);
          });

          it('should return true if subtitles are disabled by an api call', function () {
            var subtitles = Subtitles(null, null, true, null);
            subtitles.disable();

            expect(subtitles.enabled()).toEqual(false);
          });
        });

        describe('available', function () {
          it('should return true if VOD and url exists', function () {
            var subtitles = Subtitles(null, null, true, null, null, null, mediaSourcesMock);

            expect(subtitles.available()).toEqual(true);
          });

          it('should return true if LIVE, url exists and no override', function () {
            var subtitles = Subtitles(null, segmentLength, true, null, null, null, mediaSourcesMock);

            expect(subtitles.available()).toEqual(true);
          });

          it('should return true if VOD, url exists and legacy override exists', function () {
            window.bigscreenPlayer = {
              overrides: {
                legacySubtitles: true
              }
            };
            var subtitles = Subtitles(null, null, true, null, null, null, mediaSourcesMock);

            expect(subtitles.available()).toEqual(true);
          });

          it('should return false if LIVE, url exists and legacy override exists', function () {
            window.bigscreenPlayer = {
              overrides: {
                legacySubtitles: true
              }
            };
            var subtitles = Subtitles(null, segmentLength, true, null);

            expect(subtitles.available()).toEqual(false);
          });

          it('should return false if VOD and no url exists', function () {
            subtitlesAvailable = false;
            var subtitles = Subtitles(null, null, true, null, null, null, mediaSourcesMock);

            expect(subtitles.available()).toEqual(false);
          });

          it('should return false if LIVE and no url exists', function () {
            subtitlesAvailable = false;
            var subtitles = Subtitles(null, segmentLength, true, null, null, null, mediaSourcesMock);

            expect(subtitles.available()).toEqual(false);
          });
        });

        describe('setPosition', function () {
          it('calls through to subtitlesContainer updatePosition', function () {
            var subtitles = Subtitles(null, null, true, null);
            subtitles.setPosition('pos');

            expect(subtitlesContainerSpies.updatePosition).toHaveBeenCalledWith('pos');
          });
        });

        describe('customise', function () {
          it('passes through custom style object and enabled state to subtitlesContainer customise function', function () {
            var subtitles = Subtitles(null, null, true, null);
            var customStyleObj = { size: 0.7 };
            subtitles.customise(customStyleObj);

            expect(subtitlesContainerSpies.customise).toHaveBeenCalledWith(customStyleObj, jasmine.any(Boolean));
          });
        });

        describe('renderExample', function () {
          it('calls subtitlesContainer renderExample function with correct values', function () {
            var subtitles = Subtitles(null, null, true, null);
            var exampleUrl = '';
            var customStyleObj = { size: 0.7 };
            var safePosition = { left: 30, top: 0 };
            subtitles.renderExample(exampleUrl, customStyleObj, safePosition);

            expect(subtitlesContainerSpies.renderExample).toHaveBeenCalledWith(exampleUrl, customStyleObj, safePosition);
          });
        });

        describe('clearExample', function () {
          it('calls subtitlesContainer clearExample function ', function () {
            var subtitles = Subtitles(null, null, true, null);
            subtitles.clearExample();

            expect(subtitlesContainerSpies.clearExample).toHaveBeenCalledTimes(1);
          });
        });

        describe('tearDown', function () {
          it('calls through to subtitlesContainer tearDown', function () {
            var subtitles = Subtitles(null, null, true, null);
            subtitles.tearDown();

            expect(subtitlesContainerSpies.tearDown).toHaveBeenCalledTimes(1);
          });
        });
      });
    });
  }
);
