require(
  [
    'bigscreenplayer/mediaresilience',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/models/livesupport',
    'bigscreenplayer/models/transferformats'
  ],
  function (MediaResilience, WindowTypes, LiveSupport, TransferFormats) {
    'use strict';
    describe('MediaResilience', function () {
      describe('shouldFailover', function () {
        it('should return false when there are insufficient urls to failover', function () {
          expect(MediaResilience.shouldFailover(1, 100, 95, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(false);
        });

        describe('when window type is STATIC', function () {
          it('should return true if current time is 5 seconds from duration', function () {
            expect(MediaResilience.shouldFailover(2, 100, 95, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(true);
            expect(MediaResilience.shouldFailover(2, 100, 95, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(true);
          });

          it('should return false if current time is within 5 seconds of duration', function () {
            expect(MediaResilience.shouldFailover(2, 100, 96, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(false);
            expect(MediaResilience.shouldFailover(2, 100, 96, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(false);
          });

          it('should return true if playback has not yet started', function () {
            expect(MediaResilience.shouldFailover(2, 0, undefined, undefined, WindowTypes.STATIC, TransferFormats.DASH)).toBe(true);
            expect(MediaResilience.shouldFailover(2, 0, undefined, undefined, WindowTypes.STATIC, TransferFormats.HLS)).toBe(true);
          });
        });

        describe('when window type is GROWING', function () {
          describe('and transfer format is DASH', function () {
            it('should return true', function () {
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.DASH)).toBe(true);
            });
          });

          describe('and transfer format is HLS', function () {
            it('should return correct value for live support', function () {
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.SEEKABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.RESTARTABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.PLAYABLE, WindowTypes.GROWING, TransferFormats.HLS)).toBe(true);
            });
          });
        });

        describe('when window type is SLIDING', function () {
          describe('and transfer format is DASH', function () {
            it('should return true', function () {
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.DASH)).toBe(true);
            });
          });

          describe('and transfer format is HLS', function () {
            it('should return correct value for live support', function () {
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.SEEKABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.RESTARTABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
              expect(MediaResilience.shouldFailover(2, 100, 10, LiveSupport.PLAYABLE, WindowTypes.SLIDING, TransferFormats.HLS)).toBe(true);
            });
          });
        });
      });
    });
  }
);
