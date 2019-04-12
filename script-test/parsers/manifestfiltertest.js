require(
  [
    'bigscreenplayer/parsers/manifestfilter'
  ],
  function (ManifestFilter) {
    describe('ManifestFilter', function () {
      describe('filter()', function () {
        var manifest;

        beforeEach(function () {
          manifest = {
            Period: {
              AdaptationSet: [
                {
                  contentType: 'video',
                  Representation_asArray: [
                    {
                      bandwidth: 438000,
                      frameRate: 25
                    },
                    {
                      bandwidth: 827000,
                      frameRate: 30
                    },
                    {
                      bandwidth: 1570000,
                      frameRate: 50
                    },
                    {
                      bandwidth: 2812000,
                      frameRate: 50
                    }
                  ]
                },
                {
                  contentType: 'audio',
                  Representation_asArray: [
                    {
                      bandwidth: 128000
                    }
                  ]
                }
              ]
            }
          };
        });

        it('should leave the manifest unchanged when the config is empty', function () {
          var actualManifest = ManifestFilter.filter(manifest, {});

          expect(actualManifest).toEqual(manifest);
        });

        it('should remove representations with a higher frame rate than the max', function () {
          var expectedManifest = {
            Period: {
              AdaptationSet: [
                {
                  contentType: 'video',
                  Representation_asArray: [
                    {
                      bandwidth: 438000,
                      frameRate: 25
                    },
                    {
                      bandwidth: 827000,
                      frameRate: 30
                    }
                  ]
                },
                {
                  contentType: 'audio',
                  Representation_asArray: [
                    {
                      bandwidth: 128000
                    }
                  ]
                }
              ]
            }
          };
          var actualManifest = ManifestFilter.filter(manifest, { maxFps: 30 });

          expect(actualManifest).toEqual(expectedManifest);
        });

        it('should remove representations that are lower than the highest if constantFps is set', function () {
          var expectedManifest = {
            Period: {
              AdaptationSet: [
                {
                  contentType: 'video',
                  Representation_asArray: [
                    {
                      bandwidth: 1570000,
                      frameRate: 50
                    },
                    {
                      bandwidth: 2812000,
                      frameRate: 50
                    }
                  ]
                },
                {
                  contentType: 'audio',
                  Representation_asArray: [
                    {
                      bandwidth: 128000
                    }
                  ]
                }
              ]
            }
          };
          var actualManifest = ManifestFilter.filter(manifest, { constantFps: true });

          expect(actualManifest).toEqual(expectedManifest);
        });

        it('should only keep the highest framerate that is not higher than max', function () {
          var expectedManifest = {
            Period: {
              AdaptationSet: [
                {
                  contentType: 'video',
                  Representation_asArray: [
                    {
                      bandwidth: 827000,
                      frameRate: 30
                    }
                  ]
                },
                {
                  contentType: 'audio',
                  Representation_asArray: [
                    {
                      bandwidth: 128000
                    }
                  ]
                }
              ]
            }
          };
          var actualManifest = ManifestFilter.filter(manifest, { constantFps: true, maxFps: 30 });

          expect(actualManifest).toEqual(expectedManifest);
        });

        it('should filter all representations out if none are smaller than the max', function () {
          var expectedManifest = {
            Period: {
              AdaptationSet: [
                {
                  contentType: 'video',
                  Representation_asArray: []
                },
                {
                  contentType: 'audio',
                  Representation_asArray: [
                    {
                      bandwidth: 128000
                    }
                  ]
                }
              ]
            }
          };
          var actualManifest = ManifestFilter.filter(manifest, { maxFps: 10, constantFps: true });

          expect(actualManifest).toEqual(expectedManifest);
        });
      });
    });
  });

