require(
  ['squire'],
  function (Squire) {
    var loadURLError = false;
    var returnInvalidXML = false;
    var pluginInterfaceMock;
    var pluginsMock;

    var loadUrlMock = function (url, callbackObject) {
      if (loadURLError) {
        callbackObject.onError();
      } else if (returnInvalidXML) {
        callbackObject.onLoad(null, '', 200);
      } else {
        callbackObject.onLoad('<?xml>', '', 200);
      }
    };

    describe('Subtitles', function () {
      afterEach(function () {
        loadURLError = false;
        returnInvalidXML = false;
      });

      describe('legacy implementation', function () {
        var Subtitles;
        var mockCaptionsSpies;
        var mockCaptions;

        beforeEach(function (done) {
          mockCaptionsSpies = jasmine.createSpyObj('mockCaptions', ['start', 'stop', 'updatePosition', 'tearDown']);
          mockCaptions = jasmine.createSpy();
          mockCaptions.and.callFake(function () {
            return mockCaptionsSpies;
          });

          pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesLoadError', 'onSubtitlesTransformError']);
          pluginsMock = { interface: pluginInterfaceMock };

          var injector = new Squire();
          injector.mock({
            'bigscreenplayer/subtitles/legacysubtitles': mockCaptions,
            'bigscreenplayer/utils/loadurl': loadUrlMock,
            'bigscreenplayer/plugins': pluginsMock
          });
          injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
            Subtitles = Subs;
            done();
          });
        });

        afterEach(function () {
          mockCaptionsSpies.start.calls.reset();
          mockCaptionsSpies.stop.calls.reset();
          mockCaptionsSpies.updatePosition.calls.reset();
          mockCaptionsSpies.tearDown.calls.reset();
        });

        describe('construction', function () {
          it('initialises with the legacy subtitles module', function () {
            Subtitles();

            expect(mockCaptions).toHaveBeenCalled();
          });

          it('fires onSubtitlesLoadError plugin if loading of XML fails', function () {
            loadURLError = true;
            Subtitles();

            expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalled();
          });

          it('fires subtitleTransformError if responseXML from the loader is invalid', function () {
            returnInvalidXML = true;
            Subtitles(null, 'http://some-url', null, null);

            expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalled();
          });
        });

        describe('enable', function () {
          it('should start subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.enable();

            expect(mockCaptionsSpies.start).toHaveBeenCalledWith();
          });

          it('should not start subtitles when unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.enable();

            expect(mockCaptionsSpies.start).not.toHaveBeenCalledWith();
          });
        });

        describe('disable', function () {
          it('should stop subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.disable();

            expect(mockCaptionsSpies.stop).toHaveBeenCalledWith();
          });

          it('should not stop subtitles when unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.disable();

            expect(mockCaptionsSpies.stop).not.toHaveBeenCalledWith();
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
          it('calls through to captions updatePosition', function () {
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.setPosition('pos');

            expect(mockCaptionsSpies.updatePosition).toHaveBeenCalledWith('pos');
          });

          it('does not attempt to call through to captions updatePosition if no captions exist', function () {
            loadURLError = true;
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.setPosition('pos');

            expect(mockCaptionsSpies.updatePosition).not.toHaveBeenCalledWith('pos');
          });
        });

        describe('tearDown', function () {
          it('calls through to captions tearDown', function () {
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.tearDown();

            expect(mockCaptionsSpies.tearDown).toHaveBeenCalled();
          });

          it('does not attempt to call through to captions tearDown if no captions exist', function () {
            loadURLError = true;
            var subtitles = Subtitles(null, 'http://some-url', true, null);
            subtitles.tearDown();

            expect(mockCaptionsSpies.tearDown).not.toHaveBeenCalled();
          });
        });
      });
    });
  }
);
