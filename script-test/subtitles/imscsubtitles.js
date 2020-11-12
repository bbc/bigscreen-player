require(
  [
    'squire'
  ],
  function (Squire) {
    describe('IMSC Subtitles', function () {
      var injector;
      var ImscSubtitles;
      var imscMock;

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

      it('Calls to fromXML on creation', function () {
        ImscSubtitles();

        expect(imscMock.fromXML).toHaveBeenCalledTimes(1);
      });

      describe('update interval', function () {
        beforeEach(function () {
          jasmine.clock().install();
        });

        afterEach(function () {
          jasmine.clock().uninstall();
        });

        it('calls to generateISD', function () {
          var subtitles = ImscSubtitles();
          subtitles.start();
          jasmine.clock().tick(751);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
        });
      });
    });
  }
);

