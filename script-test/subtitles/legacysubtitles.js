require(
  [
    'squire',
    'bigscreenplayer/models/transportcontrolposition'
  ],
  function (Squire, TransportControlPosition) {
    'use strict';

    var injector;
    var mockRendererSpy;
    var mockRendererConstructor;
    var legacySubtitles;
    var LegacySubtitlesWithMocks;
    var parentElement = document.createElement('div');
    var loadUrlMock;
    var loadUrlStubResponseXml = '<?xml>';
    var loadUrlStubResponseText = 'loadUrlStubResponseText';
    var pluginInterfaceMock;
    var pluginsMock;
    var subtitlesUrl;
    var subtitlesCdn;
    var mockMediaSources;
    var avalailableSourceCount;

    describe('Legacy Subtitles', function () {
      beforeEach(function (done) {
        injector = new Squire();
        mockRendererSpy = jasmine.createSpyObj('mockRenderer', ['start', 'stop', 'render']);
        mockRendererConstructor = jasmine.createSpy().and.returnValue(mockRendererSpy);
        mockRendererSpy.render.and.returnValue(document.createElement('div'));

        loadUrlMock = jasmine.createSpy();
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onLoad(loadUrlStubResponseXml, loadUrlStubResponseText, 200);
        });

        subtitlesUrl = 'http://stub-captions.test';
        subtitlesCdn = 'supplier1';
        mockMediaSources = jasmine.createSpyObj('mockMediaSources', ['currentSubtitlesSource', 'failoverSubtitles', 'subtitlesRequestTimeout', 'currentSubtitlesCdn']);
        mockMediaSources.currentSubtitlesSource.and.returnValue(subtitlesUrl);
        mockMediaSources.currentSubtitlesCdn.and.returnValue(subtitlesCdn);
        mockMediaSources.failoverSubtitles.and.callFake(function (postFailoverAction, failoverErrorAction) {
          if (avalailableSourceCount > 1) {
            avalailableSourceCount--;
            postFailoverAction();
          } else {
            failoverErrorAction();
          }
        });

        pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesRenderError', 'onSubtitlesTimeout', 'onSubtitlesXMLError', 'onSubtitlesLoadError']);
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

      it('Should load the subtitles url if auto start is true', function () {
        var autoStart = true;
        legacySubtitles = LegacySubtitlesWithMocks(null, autoStart, parentElement, mockMediaSources);

        expect(loadUrlMock).toHaveBeenCalledWith(subtitlesUrl, jasmine.any(Object));
      });

      it('Should not load the subtitles url if auto start is false', function () {
        var autoStart = false;
        legacySubtitles = LegacySubtitlesWithMocks(null, autoStart, parentElement, mockMediaSources);

        expect(loadUrlMock).not.toHaveBeenCalled();
      });

      it('Has a player subtitles class', function () {
        legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);

        expect(parentElement.firstChild.className).toContain('playerCaptions');
      });

      it('Should fire subtitlesXMLError if responseXML from the loader is invalid', function () {
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onLoad(null, '', 200);
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);

        expect(pluginsMock.interface.onSubtitlesXMLError).toHaveBeenCalledWith({cdn: subtitlesCdn});
        expect(pluginsMock.interface.onSubtitlesXMLError).toHaveBeenCalledTimes(1);
      });

      it('Should try to failover to the next url if responseXML from the loader is invalid', function () {
        avalailableSourceCount = 1;
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onError(404);
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);

        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function), 404);
        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1);
      });

      it('Should fire onSubtitlesTimeout if the XHR times out', function () {
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onTimeout();
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);

        expect(pluginsMock.interface.onSubtitlesTimeout).toHaveBeenCalledWith({cdn: subtitlesCdn});
        expect(pluginsMock.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1);
      });

      describe('Start', function () {
        it('Should call start on the renderer when the renderer exists', function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);

          legacySubtitles.start();

          expect(mockRendererSpy.start).toHaveBeenCalledWith();
        });

        it('Should load the subtitle url and auto start the renderer when the renderer doesnt exist', function () {
          var rendererAutoStart = true;
          legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);

          legacySubtitles.start();

          expect(loadUrlMock).toHaveBeenCalledWith(subtitlesUrl, jasmine.any(Object));
          expect(mockRendererConstructor).toHaveBeenCalledWith('playerCaptions', jasmine.any(String), null, rendererAutoStart);
        });

        it('Should not start subtitles if there is invalid xml in the response object', function () {
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onError();
          });
          legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);

          legacySubtitles.start();

          expect(mockRendererSpy.start).not.toHaveBeenCalledWith();
        });
      });

      describe('Stop', function () {
        it('Stops the subtitles if there is valid xml in the response object', function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).toHaveBeenCalledWith();
        });

        it('Does not stop the subtitles if there is is invalid xml in the response object', function () {
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onError();
          });

          legacySubtitles = new LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).not.toHaveBeenCalledWith();
        });
      });

      describe('Updating position', function () {
        beforeEach(function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, true, parentElement, mockMediaSources);
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
