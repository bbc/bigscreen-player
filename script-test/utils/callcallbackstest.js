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

      it('calls later callbacks if an earlier one errors', function () {
        var callback = jasmine.createSpy('callback');

        callCallbacks([
          function () { throw new Error('oops'); },
          callback
        ]);

        expect(callback).toHaveBeenCalledTimes(1);
      });
    });
  }
);
