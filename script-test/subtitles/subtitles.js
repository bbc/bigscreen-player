require(
  ['squire'],
  function (Squire) {
    var originalBSPWindowConfig = window.bigscreenPlayer;
    var pluginInterfaceMock;
    var pluginsMock;
    var Subtitles;
    var subtitlesMock;
    var loadUrlMock;
    var stubResponse = '<?xml>';
    var injector;

    describe('Subtitles', function () {
      beforeEach(function () {
        injector = new Squire();
        loadUrlMock = jasmine.createSpy();
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onLoad(stubResponse, stubResponse, 200);
        });
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
              'bigscreenplayer/subtitles/legacysubtitles': subtitlesMock,
              'bigscreenplayer/utils/loadurl': loadUrlMock
            });

            injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
              Subtitles = Subs;
              done();
            });
          });

          it('implementation is available when legacy subtitles override is true', function () {
            Subtitles();

            expect(subtitlesMock).toHaveBeenCalledTimes(1);
          });
        });

        describe('imscjs', function () {
          beforeEach(function (done) {
            subtitlesMock = jasmine.createSpy();

            injector.mock({
              'bigscreenplayer/subtitles/imscsubtitles': subtitlesMock,
              'bigscreenplayer/utils/loadurl': loadUrlMock
            });

            injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
              Subtitles = Subs;
              done();
            });
          });

          it('implementation is available when legacy subtitles override is false', function () {
            Subtitles();

            expect(subtitlesMock).toHaveBeenCalledTimes(1);
          });
        });
      });

      describe('generic calls', function () {
        var subtitlesContainerSpies;
        var subtitlesContainer;

        beforeEach(function (done) {
          subtitlesContainerSpies = jasmine.createSpyObj('subtitlesContainer', ['start', 'stop', 'updatePosition', 'tearDown']);
          subtitlesContainer = jasmine.createSpy();
          subtitlesContainer.and.callFake(function () {
            return subtitlesContainerSpies;
          });

          pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesLoadError', 'onSubtitlesTransformError']);
          pluginsMock = { interface: pluginInterfaceMock };

          injector.mock({
            'bigscreenplayer/subtitles/imscsubtitles': subtitlesContainer,
            'bigscreenplayer/utils/loadurl': loadUrlMock,
            'bigscreenplayer/plugins': pluginsMock
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
            var url = 'http://captions.example.test';
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');

            Subtitles(mockMediaPlayer, url, autoStart, mockPlaybackElement);

            expect(subtitlesContainer).toHaveBeenCalledWith(mockMediaPlayer, jasmine.objectContaining({text: stubResponse, xml: stubResponse}), autoStart, mockPlaybackElement);
          });

          it('fires onSubtitlesLoadError plugin if loading of XML fails', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            Subtitles();

            expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalledTimes(1);
          });

          it('fires subtitleTransformError if responseXML from the loader is invalid', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onLoad(null, '', 200);
            });
            Subtitles(null, 'http://some-url', null, null);

            expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1);
          });
        });

        describe('enable', function () {
          it('should start subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.enable();

            expect(subtitlesContainerSpies.start).toHaveBeenCalledTimes(1);
          });

          it('should not start subtitles when unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.enable();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });
        });

        describe('disable', function () {
          it('should stop subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.disable();

            expect(subtitlesContainerSpies.stop).toHaveBeenCalled();
          });

          it('should not stop subtitles when unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.disable();

            expect(subtitlesContainerSpies.stop).not.toHaveBeenCalled();
          });
        });

        describe('enabled', function () {
          it('should return true if subtitles are enabled at construction', function () {
            var subtitles = Subtitles(null, undefined, true, null);

            expect(subtitles.enabled()).toEqual(true);
          });

          it('should return true if subtitles are enabled by an api call', function () {
            var subtitles = Subtitles(null, undefined, false, null);
            subtitles.enable();

            expect(subtitles.enabled()).toEqual(true);
          });

          it('should return false if subtitles are disabled at construction', function () {
            var subtitles = Subtitles(null, undefined, false, null);

            expect(subtitles.enabled()).toEqual(false);
          });

          it('should return true if subtitles are disabled by an api call', function () {
            var subtitles = Subtitles(null, undefined, true, null);
            subtitles.disable();

            expect(subtitles.enabled()).toEqual(false);
          });
        });

        describe('available', function () {
          it('returns true if a url exists at construction', function () {
            var subtitles = Subtitles(null, 'http://some-url', true, null);

            expect(subtitles.available()).toEqual(true);
          });

          it('returns false if no url exists at construction', function () {
            var subtitles = Subtitles(null, undefined, true, null);

            expect(subtitles.available()).toEqual(false);
          });
        });

        describe('setPosition', function () {
          it('calls through to subtitlesContainer updatePosition', function () {
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.setPosition('pos');

            expect(subtitlesContainerSpies.updatePosition).toHaveBeenCalledWith('pos');
          });

          it('does not attempt to call through to subtitlesContainer updatePosition if subtitles have not been loaded', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.setPosition('pos');

            expect(subtitlesContainerSpies.updatePosition).not.toHaveBeenCalledWith('pos');
          });
        });

        describe('tearDown', function () {
          it('calls through to subtitlesContainer tearDown', function () {
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.tearDown();

            expect(subtitlesContainerSpies.tearDown).toHaveBeenCalled();
          });

          it('does not attempt to call through to subtitlesContainer tearDown if subtitles have not been loaded', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.tearDown();

            expect(subtitlesContainerSpies.tearDown).not.toHaveBeenCalled();
          });
        });
      });
    });
  }
);
