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

    describe('Captions Container', function () {
      beforeEach(function (done) {
        mockRendererSpy = jasmine.createSpyObj('mockCaptions', ['start', 'stop', 'render']);
        var mockCaptionsConstructor = function () {
          return mockRendererSpy;
        };
        mockRendererSpy.render.and.returnValue(document.createElement('div'));

        injector.mock({
          'bigscreenplayer/subtitles/renderer': mockCaptionsConstructor
        });
        injector.require(['bigscreenplayer/subtitles/legacysubtitles'], function (LegacySubtitles) {
          LegacySubtitlesWithMocks = LegacySubtitles;
          done();
        });
      });

      afterEach(function () {
        legacySubtitles.tearDown();
      });

      it('Has a player captions class', function () {
        legacySubtitles = new LegacySubtitlesWithMocks(null, '', false, parentElement);

        expect(parentElement.firstChild.className).toContain('playerCaptions');
      });

      describe('Start', function () {
        it('Starts captions if there is a caption URL', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, 'potatoUrl', false, parentElement);
          legacySubtitles.start();

          expect(mockRendererSpy.start).toHaveBeenCalledWith();
        });

        it('Does not start captions if there is not a caption URL', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, null, false, parentElement);
          legacySubtitles.start();

          expect(mockRendererSpy.start).not.toHaveBeenCalledWith();
        });
      });

      describe('Stop', function () {
        it('Stops the captions if there is a URL', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, 'http://', false, parentElement);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).toHaveBeenCalledWith();
        });

        it('Does not stop the captions if there is not a URL', function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, null, false, parentElement);
          legacySubtitles.stop();

          expect(mockRendererSpy.stop).not.toHaveBeenCalledWith();
        });
      });

      describe('Updating position', function () {
        beforeEach(function () {
          legacySubtitles = new LegacySubtitlesWithMocks(null, 'http://', true, parentElement);
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
