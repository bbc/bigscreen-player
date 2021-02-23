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
            var mockMediaPlayer = {};
            var url = 'http://captions.example.test';
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');
            Subtitles(mockMediaPlayer, url, autoStart, mockPlaybackElement);

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
            var mockMediaPlayer = {};
            var url = 'http://captions.example.test';
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');

            Subtitles(mockMediaPlayer, url, autoStart, mockPlaybackElement);

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
            var customDefaultStyle = {};

            Subtitles(mockMediaPlayer, url, autoStart, mockPlaybackElement, customDefaultStyle);

            expect(subtitlesContainer).toHaveBeenCalledWith(mockMediaPlayer, jasmine.objectContaining({text: stubResponse, xml: stubResponse}), autoStart, mockPlaybackElement, customDefaultStyle);
          });

          it('fires onSubtitlesLoadError plugin if loading of XML fails', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            Subtitles(null, 'http://some-url.test', null, null);

            expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalledTimes(1);
          });

          it('fires subtitleTransformError if responseXML from the loader is invalid', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onLoad(null, '', 200);
            });
            Subtitles(null, 'http://some-url.test', null, null);

            expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1);
          });

          it('does not attempt to load subtitles if there is no captions url', function () {
            Subtitles(null, undefined, null, null);

            expect(loadUrlMock).not.toHaveBeenCalled();
          });
        });

        describe('show', function () {
          it('should start subtitles when enabled and available', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', null, null);
            subtitles.enable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).toHaveBeenCalledTimes(1);
          });

          it('should not start subtitles when disabled and available', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', null, null);
            subtitles.disable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when enabled and unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.enable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when disabled and unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.disable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });
        });

        describe('hide', function () {
          it('should stop subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', null, null);
            subtitles.hide();

            expect(subtitlesContainerSpies.stop).toHaveBeenCalled();
          });
        });

        describe('enable', function () {
          it('should set enabled state to true', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', null, null);
            subtitles.enable();

            expect(subtitles.enabled()).toEqual(true);
          });
        });

        describe('disable', function () {
          it('should set enabled state to false', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', null, null);
            subtitles.disable();

            expect(subtitlesContainerSpies.stop).not.toHaveBeenCalled();
            expect(subtitles.enabled()).toEqual(false);
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
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);

            expect(subtitles.available()).toEqual(true);
          });

          it('returns false if no url exists at construction', function () {
            var subtitles = Subtitles(null, undefined, true, null);

            expect(subtitles.available()).toEqual(false);
          });
        });

        describe('setPosition', function () {
          it('calls through to subtitlesContainer updatePosition', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.setPosition('pos');

            expect(subtitlesContainerSpies.updatePosition).toHaveBeenCalledWith('pos');
          });

          it('does not attempt to call through to subtitlesContainer updatePosition if subtitles have not been loaded', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.setPosition('pos');

            expect(subtitlesContainerSpies.updatePosition).not.toHaveBeenCalledWith('pos');
          });
        });

        describe('customise', function () {
          it('passes through custom style object and enabled state to subtitlesContainer customise function', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            var customStyleObj = { size: 0.7 };
            subtitles.customise(customStyleObj);

            expect(subtitlesContainerSpies.customise).toHaveBeenCalledWith(customStyleObj, jasmine.any(Boolean));
          });

          it('does not attempt to call through to subtitlesContainer customise if subtitles have not been loaded', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.customise({});

            expect(subtitlesContainerSpies.customise).not.toHaveBeenCalled();
          });
        });

        describe('renderExample', function () {
          it('calls subtitlesContainer renderExample function with correct values', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            var exampleUrl = '';
            var customStyleObj = { size: 0.7 };
            var safePosition = { left: 30, top: 0 };
            subtitles.renderExample(exampleUrl, customStyleObj, safePosition);

            expect(subtitlesContainerSpies.renderExample).toHaveBeenCalledWith(exampleUrl, customStyleObj, safePosition);
          });

          it('does not attempt to call through to subtitlesContainer renderExample if subtitles have not been loaded', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.renderExample('', {});

            expect(subtitlesContainerSpies.renderExample).not.toHaveBeenCalled();
          });
        });

        describe('clearExample', function () {
          it('calls subtitlesContainer clearExample function ', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.clearExample();

            expect(subtitlesContainerSpies.clearExample).toHaveBeenCalledTimes(1);
          });

          it('does not call through to subtitlesContainer clearExample if subtitles have not been loaded', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.clearExample();

            expect(subtitlesContainerSpies.clearExample).not.toHaveBeenCalled();
          });
        });

        describe('tearDown', function () {
          it('calls through to subtitlesContainer tearDown', function () {
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.tearDown();

            expect(subtitlesContainerSpies.tearDown).toHaveBeenCalledTimes(1);
          });

          it('does not attempt to call through to subtitlesContainer tearDown if subtitles have not been loaded', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            var subtitles = Subtitles(null, 'http://some-url.test', true, null);
            subtitles.tearDown();

            expect(subtitlesContainerSpies.tearDown).not.toHaveBeenCalledTimes(1);
          });
        });
      });
    });
  }
);
