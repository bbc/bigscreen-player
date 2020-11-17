require(
  ['squire'],
  function (Squire) {
    var pluginInterfaceMock;
    var pluginsMock;

    describe('Subtitles', function () {
      describe('legacy implementation', function () {
        var Subtitles;
        var subtitlesContainerSpies;
        var subtitlesContainer;
        var loadUrlMock;

        beforeEach(function (done) {
          subtitlesContainerSpies = jasmine.createSpyObj('subtitlesContainer', ['start', 'stop', 'updatePosition', 'tearDown']);
          subtitlesContainer = jasmine.createSpy();
          subtitlesContainer.and.callFake(function () {
            return subtitlesContainerSpies;
          });

          pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesLoadError', 'onSubtitlesTransformError']);
          pluginsMock = { interface: pluginInterfaceMock };

          loadUrlMock = jasmine.createSpy();
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onLoad('<?xml>', '', 200);
          });

          var injector = new Squire();
          injector.mock({
            'bigscreenplayer/subtitles/legacysubtitles': subtitlesContainer,
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
          it('initialises with the legacy subtitles module', function () {
            Subtitles(null, 'http://some-url', null, null);

            expect(subtitlesContainer).toHaveBeenCalled();
          });

          it('fires onSubtitlesLoadError plugin if loading of XML fails', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });
            Subtitles(null, 'http://some-url', null, null);

            expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalled();
          });

          it('fires subtitleTransformError if responseXML from the loader is invalid', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onLoad(null, '', 200);
            });
            Subtitles(null, 'http://some-url', null, null);

            expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalled();
          });

          it('does not attempt to load subtitles if there is no captions url', function () {
            Subtitles(null, undefined, null, null);

            expect(loadUrlMock).not.toHaveBeenCalled();
          });
        });

        describe('enable', function () {
          it('should start subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.enable();

            expect(subtitlesContainerSpies.start).toHaveBeenCalledWith();
          });

          it('should not start subtitles when unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.enable();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalledWith();
          });
        });

        describe('disable', function () {
          it('should stop subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.disable();

            expect(subtitlesContainerSpies.stop).toHaveBeenCalledWith();
          });

          it('should not stop subtitles when unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.disable();

            expect(subtitlesContainerSpies.stop).not.toHaveBeenCalledWith();
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
