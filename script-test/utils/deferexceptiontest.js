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
        expect(function () {
          deferExceptions(function () {
            throw new Error('oops');
          });
        }).not.toThrow();
      });
    });
  }
);
