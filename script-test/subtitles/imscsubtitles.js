require(
  [
    'squire'
  ],
  function (Squire) {
    describe('IMSC Subtitles', function () {
      var injector;
      var ImscSubtitles;
      var imscMock;
      var mockParentElement = document.createElement('div');
      var stubResponse = 'test';
      var fromXmlReturn;
      var mediaPlayer;
      var subtitles;

      beforeEach(function (done) {
        injector = new Squire();

        mediaPlayer = jasmine.createSpyObj('mediaPlayer', ['getCurrentTime']);
        jasmine.clock().install();

        fromXmlReturn = {
          getMediaTimeEvents: function () {
            return [1, 3, 8];
          }
        };
        imscMock = jasmine.createSpyObj('imscjs-lib', ['fromXML', 'generateISD', 'renderHTML']);
        imscMock.fromXML.and.returnValue(fromXmlReturn);

        injector.mock({
          'smp-imsc': imscMock
        });

        injector.require(['bigscreenplayer/subtitles/imscsubtitles'], function (IMSCSubs) {
          ImscSubtitles = IMSCSubs;
          done();
        });
      });

      afterEach(function () {
        jasmine.clock().uninstall();
        imscMock.generateISD.calls.reset();
        imscMock.renderHTML.calls.reset();
      });

      function progressTime (mediaPlayerTime) {
        mediaPlayer.getCurrentTime.and.returnValue(mediaPlayerTime);
        jasmine.clock().tick(751);
      }

      describe('construction', function () {
        afterEach(function () {
          subtitles.stop();
        });

        it('is constructed with the correct interface', function () {
          subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, false, mockParentElement);

          expect(subtitles).toEqual(jasmine.objectContaining({start: jasmine.any(Function), stop: jasmine.any(Function), updatePosition: jasmine.any(Function), tearDown: jasmine.any(Function)}));
        });

        it('Calls fromXML on creation with the text property of the response argument', function () {
          subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, false, mockParentElement);

          expect(imscMock.fromXML).toHaveBeenCalledWith(stubResponse, jasmine.any(Function));
        });

        it('autoplay argument starts the update loop', function () {
          subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, true, mockParentElement);
          progressTime(1.5);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });
      });

      describe('update interval', function () {
        beforeEach(function () {
          subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, false, mockParentElement);
        });

        afterEach(function () {
          subtitles.stop();
        });

        it('does not try to generate and render when current time is undefined', function () {
          subtitles.start();
          progressTime(undefined);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('only generate and render when there are new subtitles to display', function () {
          subtitles.start();

          progressTime(0.75);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();

          progressTime(1.5);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);

          progressTime(2.25);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);

          progressTime(3);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(2);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 3, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(2);

          progressTime(9);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(3);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 9, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(3);
        });

        it('resuming playback mid way through a stream renders correct subtitles', function () {
          subtitles.start();

          progressTime(3);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 3, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });
      });
    });
  }
);

