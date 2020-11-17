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
            Subtitles();

            expect(subtitlesContainer).toHaveBeenCalledTimes(1);
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

        describe('show', function () {
          it('should start subtitles when enabled and available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.enable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).toHaveBeenCalledWith();
          });

          it('should not start subtitles when disabled and available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
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
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.hide();

            expect(subtitlesContainerSpies.stop).toHaveBeenCalledWith();
          });
        });

        describe('enable', function () {
          it('should set enabled state to true', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.enable();

            expect(subtitles.enabled()).toEqual(true);
          });
        });

        describe('disable', function () {
          it('should set enabled state to false', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.disable();

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
