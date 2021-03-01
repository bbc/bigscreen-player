require(
  [
    'squire',
    'bigscreenplayer/models/transportcontrolposition'
  ],
  function (Squire, TransportControlPosition) {
    'use strict';

    var injector = new Squire();
    var mockRendererSpy;
    var legacySubtitles;
    var LegacySubtitlesWithMocks;
    var parentElement = document.createElement('div');

    var mockText = '<tt xmlns="http://www.w3.org/2006/10/ttaf1"> </tt>';
    var parser = new DOMParser();
    var mockXml = parser.parseFromString(mockText, 'application/xml');
    var mockResponse = {
      text: mockText,
      xml: mockXml
    };

    describe('Legacy Subtitles', function () {
      beforeEach(function (done) {
        mockRendererSpy = jasmine.createSpyObj('mockRenderer', ['start', 'stop', 'render']);
        var mockRendererConstructor = function () {
          return mockRendererSpy;
        };
        mockRendererSpy.render.and.returnValue(document.createElement('div'));

        injector.mock({
          'bigscreenplayer/subtitles/renderer': mockRendererConstructor
        });
        injector.require(['bigscreenplayer/subtitles/legacysubtitles'], function (LegacySubtitles) {
          LegacySubtitlesWithMocks = LegacySubtitles;
          done();
        });
      });

      afterEach(function () {
        legacySubtitles.tearDown();
      });

      it('Has a player subtitles class', function () {
        legacySubtitles = new LegacySubtitlesWithMocks(null, mockResponse, false, parentElement);

        expect(parentElement.firstChild.className).toContain('playerCaptions');
      });

      describe('Start', function () {
        it('Starts if there is valid xml in the response object', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, mockResponse, false, parentElement);
          legacySubtitles.start();

          expect(mockRendererSpy.start).toHaveBeenCalledWith();
        });

        it('Does not start subtitles if there is invalid xml in the response object', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, {xml: undefined}, false, parentElement);
          legacySubtitles.start();

          expect(mockRendererSpy.start).not.toHaveBeenCalledWith();
        });
      });

      describe('Stop', function () {
        it('Stops the subtitles if there is valid xml in the response object', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, mockResponse, false, parentElement);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).toHaveBeenCalledWith();
        });

        it('Does not stop the subtitles if there is is invalid xml in the response object', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, {xml: undefined}, false, parentElement);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).not.toHaveBeenCalledWith();
        });
      });

      describe('Updating position', function () {
        beforeEach(function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, mockResponse, true, parentElement);
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
