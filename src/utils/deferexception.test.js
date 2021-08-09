import deferExceptions from './deferexceptions';

describe('deferExceptions', function () {
  it('calls the callback once', function () {
    var callback = jest.fn();

    deferExceptions(callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not let an exception through', function () {
    jest.useFakeTimers();

    var error = new Error('oops');

    try {
      expect(function () {
        deferExceptions(function () {
          throw error;
        });
      }).not.toThrow();
      jest.advanceTimersByTime(1);
    } catch (e) {
      expect(e).toBe(error);
    }

    jest.useRealTimers();
  });
});
