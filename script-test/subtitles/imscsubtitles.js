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

      beforeEach(function (done) {
        injector = new Squire();
        imscMock = jasmine.createSpyObj('imscjs-lib', ['fromXML', 'generateISD', 'renderHTML']);

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
        beforeEach(function () {
          jasmine.clock().install();
        });

        afterEach(function () {
          jasmine.clock().uninstall();
        });

        it('calls to generateISD', function () {
          var subtitles = ImscSubtitles({}, {xml: '', text: stubResponse}, true, mockParentElement);
          subtitles.start();
          jasmine.clock().tick(751);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
        });
      });
    });
  }
);

