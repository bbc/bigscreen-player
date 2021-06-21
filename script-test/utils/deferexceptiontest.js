require(
  ['bigscreenplayer/utils/deferexception'],
  function (deferException) {
    'use strict';
    describe('deferException', function () {
      it('calls the callback once', function () {
        var callback = jasmine.createSpy('callback');
        deferException(callback);

        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('does not let an exception through', function () {
        expect(function () {
          deferException(function () {
            throw new Error('oops');
          });
        }).not.toThrow();
      });
    });
  }
);
