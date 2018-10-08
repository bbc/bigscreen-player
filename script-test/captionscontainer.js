require(
  [
    'node_modules/squirejs/src/squire',
    'bigscreenplayer/models/transportcontrolposition'
  ],
  function (Squire, TransportControlPosition) {
    'use strict';

    var injector = new Squire();
    var mockCaptionsSpy;
    var captionsContainer;
    var CaptionsContainerWithMocks;
    var parentElement = document.createElement('div');

    describe('Captions Container', function () {
      beforeEach(function (done) {
        mockCaptionsSpy = jasmine.createSpyObj('mockCaptions', ['start', 'stop', 'render', 'loadData', 'update', 'transformXML', 'elementToStyle', 'groupUnseenFor', 'updateCaptions', 'cleanOldCaptions', 'addNewCaptions']);
        var mockCaptionsConstructor = function () {
          return mockCaptionsSpy;
        };
        mockCaptionsSpy.render.and.returnValue(document.createElement('div'));

        injector.mock({
          'bigscreenplayer/captions': mockCaptionsConstructor
        });
        injector.require(['bigscreenplayer/captionscontainer'], function (CaptionsContainer) {
          CaptionsContainerWithMocks = CaptionsContainer;
          done();
        });
      });

      afterEach(function () {
        captionsContainer.tearDown();
      });

      it('Has a player captions class', function () {
        captionsContainer = new CaptionsContainerWithMocks(null, '', false, parentElement);

        expect(parentElement.firstChild.className).toContain('playerCaptions');
      });

      describe('Start', function () {
        it('Starts captions if there is a caption URL', function () {
          captionsContainer = new CaptionsContainerWithMocks(null, 'potatoUrl', false, parentElement);
          captionsContainer.start();

          expect(mockCaptionsSpy.start).toHaveBeenCalled();
        });

        it('Does not start captions if there is not a caption URL', function () {
          captionsContainer = new CaptionsContainerWithMocks(null, null, false, parentElement);
          captionsContainer.start();

          expect(mockCaptionsSpy.start).not.toHaveBeenCalled();
        });

        it('Starts captions if auto start is set', function () {
          captionsContainer = new CaptionsContainerWithMocks(null, 'http://', true, parentElement);

          expect(mockCaptionsSpy.start).toHaveBeenCalled();
        });

        it('Does not start captions if auto start is not set', function () {
          captionsContainer = new CaptionsContainerWithMocks(null, 'http://', false, parentElement);

          expect(mockCaptionsSpy.start).not.toHaveBeenCalled();
        });
      });

      describe('Stop', function () {
        it('Stops the captions if there is a URL', function () {
          captionsContainer = new CaptionsContainerWithMocks(null, 'http://', false, parentElement);
          captionsContainer.stop();

          expect(mockCaptionsSpy.stop).toHaveBeenCalled();
        });

        it('Does not stop the captions if there is not a URL', function () {
          captionsContainer = new CaptionsContainerWithMocks(null, null, false, parentElement);
          captionsContainer.stop();

          expect(mockCaptionsSpy.stop).not.toHaveBeenCalled();
        });
      });

      describe('Updating position', function () {
        beforeEach(function () {
          captionsContainer = new CaptionsContainerWithMocks(null, 'http://', true, parentElement);
        });

        [
          {className: 'controlsVisible', pos: TransportControlPosition.CONTROLS_ONLY},
          {className: 'controlsWithInfoVisible', pos: TransportControlPosition.CONTROLS_WITH_INFO},
          {className: 'leftCarouselVisible', pos: TransportControlPosition.LEFT_CAROUSEL},
          {className: 'bottomCarouselVisible', pos: TransportControlPosition.BOTTOM_CAROUSEL}
        ].forEach(function (position) {
          it('Has class ' + position.className + ' for position ' + position.pos, function () {
            captionsContainer.updatePosition(position.pos);

            expect(parentElement.firstChild.className).toContain(position.className);
          });
        });

        it('Replaces classes when position changed', function () {
          captionsContainer.updatePosition(TransportControlPosition.CONTROLS_ONLY);

          expect(parentElement.firstChild.className).toContain('controlsVisible');
          captionsContainer.updatePosition(TransportControlPosition.CONTROLS_WITH_INFO);

          expect(parentElement.firstChild.className).not.toContain('controlsVisible');
        });
      });
    });
  }
);
