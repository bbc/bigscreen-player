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

      beforeEach(function (done) {
        injector = new Squire();

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

      describe('construction', function () {
        it('is constructed with the correct interface', function () {
          var subtitles = ImscSubtitles({}, {xml: '', text: stubResponse}, true, mockParentElement);

          expect(subtitles).toEqual(jasmine.objectContaining({start: jasmine.any(Function), stop: jasmine.any(Function), updatePosition: jasmine.any(Function), tearDown: jasmine.any(Function)}));
        });

        it('Calls fromXML on creation with the text property of the response argument', function () {
          ImscSubtitles({}, {xml: '', text: stubResponse}, true, mockParentElement);

          expect(imscMock.fromXML).toHaveBeenCalledWith(stubResponse, jasmine.any(Function));
        });
      });

      describe('update interval', function () {
        var mediaPlayer;
        function progressTime (mediaPlayerTime) {
          mediaPlayer.getCurrentTime.and.returnValue(mediaPlayerTime);
          jasmine.clock().tick(751);
        }
        beforeEach(function () {
          jasmine.clock().install();
        });

        afterEach(function () {
          jasmine.clock().uninstall();
          imscMock.generateISD.calls.reset();
          imscMock.renderHTML.calls.reset();
        });

        it('only generate and render when there are new subtitles to display', function () {
          mediaPlayer = jasmine.createSpyObj('mediaPlayer', ['getCurrentTime']);
          var subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, true, mockParentElement);
          subtitles.start();

          progressTime(0.75);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();

          progressTime(1.5);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);

          progressTime(2.25);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);

          progressTime(3);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(2);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 3, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(2);

          progressTime(9);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(3);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 8, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(3);
        });

        it('resuming playback mid way through a stream renders correct subtitles', function () {
          mediaPlayer = jasmine.createSpyObj('mediaPlayer', ['getCurrentTime']);
          var subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, true, mockParentElement);
          subtitles.start();

          progressTime(9);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 8, jasmine.any(Function));
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });
      });
    });
  }
);

