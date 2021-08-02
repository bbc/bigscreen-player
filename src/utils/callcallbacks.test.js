require(
  ['bigscreenplayer/utils/callcallbacks'],
  function (callCallbacks) {
    'use strict';
    describe('callCallbacks', function () {
      it('calls all the callbacks once with the provided data', function () {
        var callbacks = [
          jasmine.createSpy('callback1'),
          jasmine.createSpy('callback2')
        ];
        var data = 'data';

        callCallbacks(callbacks, data);

        callbacks.forEach(function (callback) {
          expect(callback).toHaveBeenCalledTimes(1);
          expect(callback).toHaveBeenCalledWith(data);
        });
      });

      // Note: Forgive the time hack, async deferred errors can be flakey in other tests if not caught!
      it('calls later callbacks if an earlier one errors', function () {
        jasmine.clock().install();
        var callback = jasmine.createSpy('callback');

        var failingCallCallbacks = function () {
          callCallbacks([
            function () { throw new Error('oops'); },
            callback
          ]);
          jasmine.clock().tick(1);
        };

        expect(failingCallCallbacks).toThrowError();

        expect(callback).toHaveBeenCalledTimes(1);
        jasmine.clock().uninstall();
      });
    });
  }
);
