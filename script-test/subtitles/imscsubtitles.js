require(
  [
    'squire'
  ],
  function (Squire) {
    describe('IMSC Subtitles', function () {
      var injector;
      var ImscSubtitles;
      var imscMock;
      var pluginInterfaceMock;
      var pluginsMock;
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

        pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesRenderError', 'onSubtitlesTransformError']);
        pluginsMock = { interface: pluginInterfaceMock };

        injector.mock({
          'bigscreenplayer/external/smp-imsc': imscMock,
          'bigscreenplayer/plugins': pluginsMock
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

          expect(imscMock.fromXML).toHaveBeenCalledWith(stubResponse);
        });

        it('autoplay argument starts the update loop', function () {
          subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, true, mockParentElement);
          progressTime(1.5);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });

        it('fires tranformError plugin if IMSC throws an exception when parsing', function () {
          imscMock.fromXML.and.throwError();
          subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, true, mockParentElement);

          expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1);
        });

        it('does not try to generate and render when xml transforming has failed', function () {
          imscMock.fromXML.and.throwError();
          subtitles = ImscSubtitles(mediaPlayer, {xml: '', text: stubResponse}, true, mockParentElement);

          progressTime(1.5);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });
      });

      describe('update interval', function () {
        beforeEach(function () {
          subtitles = ImscSubtitles(mediaPlayer, { xml: '', text: stubResponse }, false, mockParentElement);
        });

        afterEach(function () {
          subtitles.stop();
        });

        it('cannot start when xml transforming has failed', function () {
          imscMock.fromXML.and.throwError();
          subtitles = ImscSubtitles(mediaPlayer, { xml: '', text: stubResponse }, false, mockParentElement);

          subtitles.start();
          progressTime(1.5);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('does not try to generate and render when current time is undefined', function () {
          subtitles.start();
          progressTime(undefined);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('overrides the subtitles styling metadata with supplied defaults when rendering', function () {
          var styleOpts = { backgroundColour: 'black', fontFamily: 'Arial' };
          var expectedOpts = { spanBackgroundColorAdjust: { transparent: 'black' }, fontFamily: 'Arial' };
          subtitles = ImscSubtitles(mediaPlayer, { xml: '', text: stubResponse }, false, mockParentElement, styleOpts);

          subtitles.start();
          progressTime(9);

          expect(imscMock.renderHTML).toHaveBeenCalledWith(undefined, jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, expectedOpts);
        });

        it('overrides the subtitles styling metadata with supplied custom styles when rendering', function () {
          var styleOpts = { size: 0.7, lineHeight: 0.9 };
          var expectedOpts = { sizeAdjust: 0.7, lineHeightAdjust: 0.9 };

          subtitles.start();
          subtitles.customise(styleOpts);

          expect(imscMock.renderHTML).toHaveBeenCalledWith(undefined, jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, expectedOpts);
        });

        it('merges the current subtitles styling metadata with new supplied custom styles when rendering', function () {
          var defaultStyleOpts = { backgroundColour: 'black', fontFamily: 'Arial' };
          var customStyleOpts = { size: 0.7, lineHeight: 0.9 };
          var expectedOpts = { spanBackgroundColorAdjust: { transparent: 'black' }, fontFamily: 'Arial', sizeAdjust: 0.7, lineHeightAdjust: 0.9 };

          subtitles = ImscSubtitles(mediaPlayer, { xml: '', text: stubResponse }, false, mockParentElement, defaultStyleOpts);

          subtitles.start();
          subtitles.customise(customStyleOpts);

          expect(imscMock.renderHTML).toHaveBeenCalledWith(undefined, jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, expectedOpts);
        });

        it('does not try to generate and render when the initial current time is less than the first subtitle time', function () {
          subtitles.start();

          progressTime(0.75);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('does attempt to generate and render when the initial current time is greater than the final subtitle time', function () {
          subtitles.start();
          progressTime(9);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 9);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);

          progressTime(9.25);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });

        it('does attempt to generate and render when the initial current time is mid way through a stream', function () {
          subtitles.start();

          progressTime(4);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 4);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });

        it('only generate and render when there are new subtitles to display', function () {
          subtitles.start();

          progressTime(1.5);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);

          progressTime(2.25);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);

          progressTime(3);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(2);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 3);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(2);

          progressTime(9);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(3);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 9);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(3);
        });

        it('no longer attempts any rendering if subtitles have been stopped', function () {
          subtitles.start();
          progressTime(1.5);

          imscMock.generateISD.calls.reset();
          imscMock.renderHTML.calls.reset();

          subtitles.stop();
          progressTime(4);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('no longer attempts any rendering if subtitles have been torn down', function () {
          subtitles.start();
          progressTime(1.5);

          imscMock.generateISD.calls.reset();
          imscMock.renderHTML.calls.reset();

          subtitles.tearDown();
          progressTime(4);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('fires onSubtitlesRenderError plugin if IMSC throws an exception when rendering', function () {
          imscMock.renderHTML.and.throwError();

          subtitles.start();
          progressTime(1.5);

          expect(pluginsMock.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1);
        });

        it('fires onSubtitlesRenderError plugin if IMSC throws an exception when generating ISD', function () {
          imscMock.generateISD.and.throwError();

          subtitles.start();
          progressTime(1.5);

          expect(pluginsMock.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1);
        });
      });

      describe('example rendering', function () {
        it('should call fromXML, generate and render when renderExample is called', function () {
          subtitles = ImscSubtitles(mediaPlayer, { xml: '', text: stubResponse }, false, mockParentElement, {});
          imscMock.fromXML.calls.reset();

          subtitles.renderExample('', {}, {});

          expect(imscMock.fromXML).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });
      });
    });
  }
);

