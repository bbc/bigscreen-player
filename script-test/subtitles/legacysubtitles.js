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
    var subtitlesUrl;
    var mockMediaSources;
    var avalailableSourceCount;

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

        subtitlesUrl = 'http://stub-captions.test';
        mockMediaSources = jasmine.createSpyObj('mockMediaSources', ['currentSubtitlesSource', 'failoverSubtitles']);
        mockMediaSources.currentSubtitlesSource.and.returnValue(subtitlesUrl);
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

      it('Should load the subtitles url', function () {
        legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);

        expect(loadUrlMock).toHaveBeenCalledWith(subtitlesUrl, jasmine.any(Object));
      });

      it('Has a player subtitles class', function () {
        legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);

        expect(parentElement.firstChild.className).toContain('playerCaptions');
      });

      it('Should fire subtitlesXMLError if responseXML from the loader is invalid', function () {
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onLoad(null, '', 200);
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);

        expect(pluginsMock.interface.onSubtitlesXMLError).toHaveBeenCalledTimes(1);
      });

      it('Should try to failover to the next url if responseXML from the loader is invalid', function () {
        avalailableSourceCount = 1;
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onError(404);
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);

        expect(mockMediaSources.failoverSubtitles).toHaveBeenCalledTimes(1);
      });

      it('Should fire onSubtitlesLoadError plugin if loading of XML fails on last available source', function () {
        avalailableSourceCount = 1;
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onError();
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);

        expect(pluginsMock.interface.onSubtitlesLoadError).toHaveBeenCalledTimes(1);
      });

      it('Should fire onSubtitlesTimeout if the XHR times out', function () {
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onTimeout();
        });
        legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);

        expect(pluginsMock.interface.onSubtitlesTimeout).toHaveBeenCalledTimes(1);
      });

      describe('Start', function () {
        it('Starts if there is valid xml in the response object', function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);
          legacySubtitles.start();

          expect(mockRendererSpy.start).toHaveBeenCalledWith();
        });

        it('Does not start subtitles if there is invalid xml in the response object', function () {
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onError();
          });
          legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);
          legacySubtitles.start();

          expect(mockRendererSpy.start).not.toHaveBeenCalledWith();
        });
      });

      describe('Stop', function () {
        it('Stops the subtitles if there is valid xml in the response object', function () {
          legacySubtitles = LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).toHaveBeenCalledWith();
        });

        it('Does not stop the subtitles if there is is invalid xml in the response object', function () {
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onError();
          });

          legacySubtitles = new LegacySubtitlesWithMocks(null, false, parentElement, mockMediaSources);
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
