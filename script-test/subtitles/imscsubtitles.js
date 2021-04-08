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
      var fromXmlReturn;
      var mediaPlayer;
      var subtitles;
      var mockMediaSources;
      var exampleUrl;
      var segmentLength;
      var epochStartTimeMilliseconds;

      var loadUrlMock;
      var loadUrlStubResponseXml = '<?xml>';
      var loadUrlStubResponseText;

      function msToS (timeMs) {
        return timeMs / 1000;
      }

      beforeEach(function (done) {
        injector = new Squire();

        exampleUrl = 'http://stub-subtitles.test';
        loadUrlStubResponseText = '<?xml version="1.0" encoding="utf-8"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>';
        segmentLength = undefined;
        epochStartTimeMilliseconds = undefined;

        mediaPlayer = jasmine.createSpyObj('mediaPlayer', ['getCurrentTime']);
        mockMediaSources = {
          currentSubtitlesSource: function () {
            return exampleUrl;
          },
          failoverSubtitles: function () {},
          currentSubtitlesSegmentLength: function () {
            return segmentLength;
          },
          time: function () {
            return {
              windowStartTime: epochStartTimeMilliseconds
            };
          }
        };

        jasmine.clock().install();

        fromXmlReturn = {
          getMediaTimeEvents: function () {
            return [1, 3, 8];
          },
          head: {
            styling: {}
          },
          body: {
            contents: []
          }
        };

        imscMock = jasmine.createSpyObj('imscjs-lib', ['fromXML', 'generateISD', 'renderHTML']);
        imscMock.generateISD.and.returnValue({ contents: ['mockContents'] });
        imscMock.fromXML.and.returnValue(fromXmlReturn);

        pluginInterfaceMock = jasmine.createSpyObj('interfaceMock', ['onSubtitlesRenderError', 'onSubtitlesTransformError', 'onSubtitlesLoadError']);
        pluginsMock = { interface: pluginInterfaceMock };

        loadUrlMock = jasmine.createSpy();
        loadUrlMock.and.callFake(function (url, callbackObject) {
          callbackObject.onLoad(loadUrlStubResponseXml, loadUrlStubResponseText, 200);
        });

        injector.mock({
          'bigscreenplayer/external/smp-imsc': imscMock,
          'bigscreenplayer/plugins': pluginsMock,
          'bigscreenplayer/utils/loadurl': loadUrlMock
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
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

          expect(subtitles).toEqual(jasmine.objectContaining({start: jasmine.any(Function), stop: jasmine.any(Function), updatePosition: jasmine.any(Function), tearDown: jasmine.any(Function)}));
        });

        it('autoplay argument starts the update loop', function () {
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});
          progressTime(1.5);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 1.5);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });
      });

      describe('customisation', function () {
        it('overrides the subtitles styling metadata with supplied defaults when rendering', function () {
          var styleOpts = { backgroundColour: 'black', fontFamily: 'Arial' };
          var expectedOpts = { spanBackgroundColorAdjust: { transparent: 'black' }, fontFamily: 'Arial' };
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, styleOpts);

          subtitles.start();
          progressTime(9);

          expect(imscMock.renderHTML).toHaveBeenCalledWith(jasmine.any(Object), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, expectedOpts);
        });

        it('overrides the subtitles styling metadata with supplied custom styles when rendering', function () {
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

          var styleOpts = { size: 0.7, lineHeight: 0.9 };
          var expectedOpts = { sizeAdjust: 0.7, lineHeightAdjust: 0.9 };

          mediaPlayer.getCurrentTime.and.returnValue(1);

          subtitles.start();
          subtitles.customise(styleOpts, true);

          expect(imscMock.renderHTML).toHaveBeenCalledWith(jasmine.any(Object), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, expectedOpts);
        });

        it('merges the current subtitles styling metadata with new supplied custom styles when rendering', function () {
          var defaultStyleOpts = { backgroundColour: 'black', fontFamily: 'Arial' };
          var customStyleOpts = { size: 0.7, lineHeight: 0.9 };
          var expectedOpts = { spanBackgroundColorAdjust: { transparent: 'black' }, fontFamily: 'Arial', sizeAdjust: 0.7, lineHeightAdjust: 0.9 };

          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, defaultStyleOpts);

          mediaPlayer.getCurrentTime.and.returnValue(1);

          subtitles.start();
          subtitles.customise(customStyleOpts, true);

          expect(imscMock.renderHTML).toHaveBeenCalledWith(jasmine.any(Object), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, expectedOpts);
        });

        it('does not render custom styles when subtitles are not enabled', function () {
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

          var subsEnabled = false;
          subtitles.start();
          subtitles.customise({}, subsEnabled);

          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });
      });

      describe('example rendering', function () {
        it('should call fromXML, generate and render when renderExample is called', function () {
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});
          imscMock.fromXML.calls.reset();

          subtitles.renderExample('', {}, {});

          expect(imscMock.fromXML).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });
      });

      describe('Vod subtitles', function () {
        afterEach(function () {
          subtitles.stop();
        });

        it('Should load the subtitles url', function () {
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          expect(loadUrlMock).toHaveBeenCalledWith(exampleUrl, jasmine.any(Object));
        });

        it('Calls fromXML on creation with the extracted XML from the text property of the response argument', function () {
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          expect(imscMock.fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>');
        });

        it('Calls fromXML on creation with the original text property of the response argument if expected header is not found', function () {
          loadUrlStubResponseText = '<?xml version="1.0" encoding="utf-8" extra property="something"?><tt xmlns="http://www.w3.org/ns/ttml"></tt>';
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          expect(imscMock.fromXML).toHaveBeenCalledWith(loadUrlStubResponseText);
        });

        it('fires tranformError plugin if IMSC throws an exception when parsing', function () {
          imscMock.fromXML.and.throwError();
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1);
        });

        it('fires subtitleTransformError if responseXML from the loader is invalid', function () {
          loadUrlMock.and.callFake(function (url, callbackObject) {
            callbackObject.onLoad(null, '', 200);
          });
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          expect(pluginsMock.interface.onSubtitlesTransformError).toHaveBeenCalledTimes(1);
        });

        it('does not attempt to load subtitles if there is no subtitles url', function () {
          exampleUrl = undefined;
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          expect(loadUrlMock).not.toHaveBeenCalled();
        });

        it('cannot start when xml transforming has failed', function () {
          imscMock.fromXML.and.throwError();
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          progressTime(1.5);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('does not try to generate and render when current time is undefined', function () {
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          progressTime(undefined);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('does not try to generate and render when xml transforming has failed', function () {
          imscMock.fromXML.and.throwError();
          subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

          progressTime(1.5);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('does not try to generate and render when the initial current time is less than the first subtitle time', function () {
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

          subtitles.start();

          progressTime(0.75);

          expect(imscMock.generateISD).not.toHaveBeenCalled();
          expect(imscMock.renderHTML).not.toHaveBeenCalled();
        });

        it('does attempt to generate and render when the initial current time is greater than the final subtitle time', function () {
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

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
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

          subtitles.start();

          progressTime(4);

          expect(imscMock.generateISD).toHaveBeenCalledTimes(1);
          expect(imscMock.generateISD).toHaveBeenCalledWith(fromXmlReturn, 4);
          expect(imscMock.renderHTML).toHaveBeenCalledTimes(1);
        });

        it('only generate and render when there are new subtitles to display', function () {
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

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
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

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
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

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
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});
          imscMock.renderHTML.and.throwError();

          subtitles.start();
          progressTime(1.5);

          expect(pluginsMock.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1);
        });

        it('fires onSubtitlesRenderError plugin if IMSC throws an exception when generating ISD', function () {
          subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});
          imscMock.generateISD.and.throwError();

          subtitles.start();
          progressTime(1.5);

          expect(pluginsMock.interface.onSubtitlesRenderError).toHaveBeenCalledTimes(1);
        });
      });

      describe('Live subtitles', function () {
        beforeEach(function () {
          exampleUrl = 'https://subtitles/$segment$.test';
          segmentLength = 3.84;
          epochStartTimeMilliseconds = 1614769200000; // Wednesday, 3 March 2021 11:00:00
        });

        afterEach(function () {
          subtitles.stop();
        });

        describe('Loading fragments', function () {
          it('should load the first three segments with correct urls on the first update interval', function () {
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512815.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512816.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512817.test', jasmine.any(Object));
          });

          it('should load the fragment two segments ahead of current time', function () {
            // epochStartTimeSeconds = Wednesday, 3 March 2021 11:00:00
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(13.84);
            jasmine.clock().tick(750);

            // At 13.84 seconds, we should be loading the segment correseponding to 21.52 seconds
            // 1614769221520 = Wednesday, 3 March 2021 11:00:21.52
            expect(loadUrlMock).toHaveBeenCalledOnceWith('https://subtitles/420512818.test', jasmine.any(Object));
          });

          it('should not load a fragment if fragments array already contains it', function () {
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(13.84);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledOnceWith('https://subtitles/420512818.test', jasmine.any(Object));

            mediaPlayer.getCurrentTime.and.returnValue(13.84); // time hasn't progressed. e.g. in paused state
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledOnceWith('https://subtitles/420512818.test', jasmine.any(Object));
          });

          it('only keeps three fragments when playing', function () {
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(13.84);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledOnceWith('https://subtitles/420512818.test', jasmine.any(Object));

            loadUrlMock.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledOnceWith('https://subtitles/420512815.test', jasmine.any(Object));
          });

          it('load three new fragments when seeking back to a point where none of the segments are available', function () {
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(113.84);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512815.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512816.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512817.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledTimes(3);
          });

          it('loads three new fragments when seeking forwards to a point where none of the segments are available', function () {
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(13.84);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(100);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512838.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512839.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512840.test', jasmine.any(Object));
            expect(loadUrlMock).toHaveBeenCalledTimes(3);
          });

          it('should not load fragments when auto start is false', function () {
            subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            expect(loadUrlMock).not.toHaveBeenCalled();
          });

          it('should load fragments when start is called and autoStart is false', function () {
            subtitles = ImscSubtitles(mediaPlayer, false, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            expect(loadUrlMock).not.toHaveBeenCalled();

            loadUrlMock.calls.reset();
            subtitles.start();

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512815.test', jasmine.any(Object));
          });

          it('calls fromXML with xml string where responseText contains more than a simple xml string', function () {
            loadUrlStubResponseText = 'stuff that might exists before the xml string' + loadUrlStubResponseText;
            mediaPlayer.getCurrentTime.and.returnValue(10);

            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            jasmine.clock().tick(750);

            expect(imscMock.fromXML).toHaveBeenCalledWith('<tt xmlns="http://www.w3.org/ns/ttml"></tt>');
          });

          it('should stop loading fragments when stop is called', function () {
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            loadUrlMock.calls.reset();
            subtitles.stop();

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            expect(loadUrlMock).not.toHaveBeenCalled();
          });

          it('should not try to load segments when the currentTime is not known by the player', function () {
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(-1000);
            jasmine.clock().tick(750);

            expect(loadUrlMock).not.toHaveBeenCalled();
          });

          it('should stop loading fragments when xml transforming has failed', function () {
            imscMock.fromXML.and.throwError();

            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();

            mediaPlayer.getCurrentTime.and.returnValue(13.84);
            jasmine.clock().tick(750);

            expect(loadUrlMock).not.toHaveBeenCalled();
          });

          it('should stop loading fragments when the XML fails to load', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onError();
            });

            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();

            mediaPlayer.getCurrentTime.and.returnValue(13.84);
            jasmine.clock().tick(750);

            expect(loadUrlMock).not.toHaveBeenCalled();
          });

          it('should not stop loading fragments when the xml response is invalid', function () {
            loadUrlMock.and.callFake(function (url, callbackObject) {
              callbackObject.onLoad(null, '', 200);
            });

            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(10);
            jasmine.clock().tick(750);

            loadUrlMock.calls.reset();

            mediaPlayer.getCurrentTime.and.returnValue(13.84);
            jasmine.clock().tick(750);

            expect(loadUrlMock).toHaveBeenCalledWith('https://subtitles/420512818.test', jasmine.any(Object));
          });
        });

        describe('rendering', function () {
          it('should generate and render when time has progressed past a known un-rendered subtitles', function () {
            var times = [[0, 1, 2, 3.84], [0, 3.84, 4, 7.68], [0, 7.68, 9, 9.7, 11.52]];
            var counter = -1;

            times = times.map(function (time) {
              return time.map(function (t) {
                return t === 0 ? t : t + msToS(epochStartTimeMilliseconds);
              });
            });

            imscMock.fromXML.and.callFake(function () {
              counter = counter + 1;

              return {
                getMediaTimeEvents: function () {
                  return times[counter];
                },
                mockCallId: counter,
                head: {
                  styling: {}
                },
                body: {
                  contents: []
                }
              };
            });

            mediaPlayer.getCurrentTime.and.returnValue(2);
            subtitles = ImscSubtitles(mediaPlayer, true, mockParentElement, mockMediaSources, {});

            mediaPlayer.getCurrentTime.and.returnValue(2.750);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).toHaveBeenCalledOnceWith(jasmine.objectContaining({mockCallId: 0}), msToS(epochStartTimeMilliseconds) + 2.750);
            expect(imscMock.renderHTML).toHaveBeenCalledOnceWith(jasmine.objectContaining({ contents: ['mockContents'] }), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, {});

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(3.5);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(4.25);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).toHaveBeenCalledOnceWith(jasmine.objectContaining({mockCallId: 1}), msToS(epochStartTimeMilliseconds) + 4.25);
            expect(imscMock.renderHTML).toHaveBeenCalledOnceWith(jasmine.objectContaining({ contents: ['mockContents'] }), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, {});

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(5);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(5.75);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(6.5);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(7.25);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(8);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).toHaveBeenCalledOnceWith(jasmine.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 8);
            expect(imscMock.renderHTML).toHaveBeenCalledOnceWith(jasmine.objectContaining({ contents: ['mockContents'] }), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, {});

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(8.75);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(9.5);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).toHaveBeenCalledOnceWith(jasmine.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 9.5);
            expect(imscMock.renderHTML).toHaveBeenCalledOnceWith(jasmine.objectContaining({ contents: ['mockContents'] }), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, {});

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(10.25);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).toHaveBeenCalledOnceWith(jasmine.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 10.25);
            expect(imscMock.renderHTML).toHaveBeenCalledOnceWith(jasmine.objectContaining({ contents: ['mockContents'] }), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, {});

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(11);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(11.75);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).toHaveBeenCalledOnceWith(jasmine.objectContaining({mockCallId: 2}), msToS(epochStartTimeMilliseconds) + 11.75);
            expect(imscMock.renderHTML).toHaveBeenCalledOnceWith(jasmine.objectContaining({ contents: ['mockContents'] }), jasmine.any(HTMLDivElement), null, 0, 0, false, null, null, false, {});

            imscMock.generateISD.calls.reset();
            imscMock.renderHTML.calls.reset();
            mediaPlayer.getCurrentTime.and.returnValue(11.75);
            jasmine.clock().tick(750);

            expect(imscMock.generateISD).not.toHaveBeenCalled();
            expect(imscMock.renderHTML).not.toHaveBeenCalled();
          });
        });
      });
    });
  }
);

