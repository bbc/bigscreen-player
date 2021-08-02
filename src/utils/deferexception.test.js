require(
  ['bigscreenplayer/utils/deferexceptions'],
  function (deferExceptions) {
    'use strict';
    describe('deferExceptions', function () {
      it('calls the callback once', function () {
        var callback = jasmine.createSpy('callback');
        deferExceptions(callback);

        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('does not let an exception through', function () {
        jasmine.clock().install();
        var error = new Error('oops');

        try {
          expect(function () {
            deferExceptions(function () {
              throw error;
            });
          }).not.toThrow();
          jasmine.clock().tick();
        } catch (e) {
          expect(e).toBe(error);
        }

        jasmine.clock().uninstall();
      });
    });
  }
);
