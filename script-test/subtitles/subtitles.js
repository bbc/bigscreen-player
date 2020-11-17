require(
  ['squire'],
  function (Squire) {
    var loadURLError = false;
    var pluginInterfaceMock;
    var pluginsMock;

    var loadUrlMock = function (url, callbackObject) {
      if (loadURLError) {
        callbackObject.onError();
      } else {
        callbackObject.onLoad('', '', 200);
      }
    };

    describe('Subtitles', function () {
      afterEach(function () {
        loadURLError = false;
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

          pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesLoadError']);
          pluginsMock = {interface: pluginInterfaceMock};

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
        });

        describe('show', function () {
          it('should start subtitles when enabled and available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.setEnabled(true);
            subtitles.show();

            expect(mockCaptionsSpies.start).toHaveBeenCalledWith();
          });

          it('should not start subtitles when disabled and available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.setEnabled(false);
            subtitles.show();

            expect(mockCaptionsSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when enabled and unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.setEnabled(true);
            subtitles.show();

            expect(mockCaptionsSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when disabled and unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.setEnabled(false);
            subtitles.show();

            expect(mockCaptionsSpies.start).not.toHaveBeenCalled();
          });
        });

        describe('hide', function () {
          it('should stop subtitles when available', function () {
            var subtitles = Subtitles(null, 'http://some-url', null, null);
            subtitles.hide();

            expect(mockCaptionsSpies.stop).toHaveBeenCalledWith();
          });

          it('should not stop subtitles when unavailable', function () {
            var subtitles = Subtitles(null, undefined, null, null);
            subtitles.hide();

            expect(mockCaptionsSpies.start).not.toHaveBeenCalled();
          });
        });

        describe('areEnabled', function () {
          it('should return true if subtitles are enabled at construction', function () {
            var subtitles = Subtitles(null, undefined, true, null);

            expect(subtitles.areEnabled()).toEqual(true);
          });

          it('should return true if subtitles are enabled by an api call', function () {
            var subtitles = Subtitles(null, undefined, false, null);
            subtitles.setEnabled(true);

            expect(subtitles.areEnabled()).toEqual(true);
          });

          it('should return false if subtitles are disabled at construction', function () {
            var subtitles = Subtitles(null, undefined, false, null);

            expect(subtitles.areEnabled()).toEqual(false);
          });

          it('should return false if subtitles are disabled by an api call', function () {
            var subtitles = Subtitles(null, undefined, true, null);
            subtitles.setEnabled(false);

            expect(subtitles.areEnabled()).toEqual(false);
          });
        });

        describe('areAvailable', function () {
          it('returns true if a url exists at construction', function () {
            var subtitles = Subtitles(null, 'http://some-url', true, null);

            expect(subtitles.areAvailable()).toEqual(true);
          });

          it('returns false if no url exists at construction', function () {
            var subtitles = Subtitles(null, undefined, true, null);

            expect(subtitles.areAvailable()).toEqual(false);
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
