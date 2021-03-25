require(
  [
    'squire',
    'bigscreenplayer/models/transportcontrolposition'
  ],
  function (Squire, TransportControlPosition) {
    'use strict';

    var injector;
    var mockRendererSpy;
    var legacySubtitles;
    var LegacySubtitlesWithMocks;
    var parentElement = document.createElement('div');
    var loadUrlMock;
    var loadUrlStubResponseXml = '<?xml>';
    var loadUrlStubResponseText = 'loadUrlStubResponseText';
    var pluginInterfaceMock;
    var pluginsMock;
    var stubCaptions = {
      captionsUrl: 'http://stub-captions.test'
    };

    describe('Legacy Subtitles', function () {
      beforeEach(function (done) {
        injector = new Squire();
        mockRendererSpy = jasmine.createSpyObj('mockRenderer', ['start', 'stop', 'render']);
        var mockRendererConstructor = function () {
          return mockRendererSpy;
        };
        mockRendererSpy.render.and.returnValue(document.createElement('div'));

        loadUrlMock = jasmine.createSpy();
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onLoad(loadUrlStubResponseXml, loadUrlStubResponseText, 200);
        });

        pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesRenderError', 'onSubtitlesTransformError', 'onSubtitlesLoadError']);
        pluginsMock = { interface: pluginInterfaceMock };

        injector.mock({
          'bigscreenplayer/subtitles/renderer': mockRendererConstructor,
          'bigscreenplayer/utils/loadurl': loadUrlMock,
          'bigscreenplayer/plugins': pluginsMock
        });
        injector.require(['bigscreenplayer/subtitles/legacysubtitles'], function (LegacySubtitles) {
          LegacySubtitlesWithMocks = LegacySubtitles;
          done();
        });
      });

      afterEach(function () {
        legacySubtitles.tearDown();
        mockRendererSpy.start.calls.reset();
        mockRendererSpy.stop.calls.reset();
        mockRendererSpy.render.calls.reset();
      });

      it('Should load the captions url', function () {
        legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);

        expect(loadUrlMock).toHaveBeenCalledWith(stubCaptions.captionsUrl, jasmine.any(Object));
      });

      it('Has a player subtitles class', function () {
        legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);

        expect(parentElement.firstChild.className).toContain('playerCaptions');
      });

      it('Should fire onSubtitlesLoadError plugin if loading of XML fails', function () {
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onError();
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);

        expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalledTimes(1);
      });

      it('Should fire subtitleTransformError if responseXML from the loader is invalid', function () {
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onLoad(null, '', 200);
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);

        expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1);
      });

      describe('Start', function () {
        it('Starts if there is valid xml in the response object', function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);
          legacySubtitles.start();

          expect(mockRendererSpy.start).toHaveBeenCalledWith();
        });

        it('Does not start subtitles if there is invalid xml in the response object', function () {
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onError();
          });
          legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);
          legacySubtitles.start();

          expect(mockRendererSpy.start).not.toHaveBeenCalledWith();
        });
      });

      describe('Stop', function () {
        it('Stops the subtitles if there is valid xml in the response object', function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).toHaveBeenCalledWith();
        });

        it('Does not stop the subtitles if there is is invalid xml in the response object', function () {
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onError();
          });

          legacySubtitles = new LegacySubtitlesWithMocks(null, stubCaptions, false, parentElement);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).not.toHaveBeenCalledWith();
        });
      });

      describe('Updating position', function () {
        beforeEach(function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, stubCaptions, true, parentElement);
        });

        [
          {className: 'controlsVisible', pos: TransportControlPosition.CONTROLS_ONLY},
          {className: 'controlsWithInfoVisible', pos: TransportControlPosition.CONTROLS_WITH_INFO},
          {className: 'leftCarouselVisible', pos: TransportControlPosition.LEFT_CAROUSEL},
          {className: 'bottomCarouselVisible', pos: TransportControlPosition.BOTTOM_CAROUSEL}
        ].forEach(function (position) {
          it('Has class ' + position.className + ' for position ' + position.pos, function () {
            legacySubtitles.updatePosition(position.pos);

            expect(parentElement.firstChild.className).toContain(position.className);
          });
        });

        it('Replaces classes when position changed', function () {
          legacySubtitles.updatePosition(TransportControlPosition.CONTROLS_ONLY);

          expect(parentElement.firstChild.className).toContain('controlsVisible');
          legacySubtitles.updatePosition(TransportControlPosition.CONTROLS_WITH_INFO);

          expect(parentElement.firstChild.className).not.toContain('controlsVisible');
        });
      });
    });
  }
);
