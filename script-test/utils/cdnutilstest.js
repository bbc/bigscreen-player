require(
  [
    'bigscreenplayer/utils/cdnutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats'
  ],
  function (CdnUtils, WindowTypes, LiveSupport, TransferFormats) {
    'use strict';
    describe('Cdn utils', function () {
      describe('shouldFailover', function () {
        describe('when window type is STATIC', function () {
          it('should return true if current time is 5 seconds from duration', function () {
            expect(CdnUtils.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(true);
            expect(CdnUtils.shouldFailover(100, 95, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(true);
          });

          it('should return false if current time is within 5 seconds of duration', function () {
            expect(CdnUtils.shouldFailover(100, 96, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(false);
            expect(CdnUtils.shouldFailover(100, 96, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(false);
          });
        });

        describe('when window type is GROWING', function () {
          describe('and transfer format is DASH', function () {
            it('should return true', function () {
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
            });
          });

          describe('and transfer format is HLS', function () {
            it('should return correct value for live support', function () {
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(false);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
            });
          });
        });

        describe('when window type is SLIDING', function () {
          describe('and transfer format is DASH', function () {
            it('should return true', function () {
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
            });
          });

          describe('and transfer format is HLS', function () {
            it('should return correct value for live support', function () {
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(false);
              expect(CdnUtils.shouldFailover(100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
            });
          });
        });
      });
    });
  }
);
