require(
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/readyhelper',
    'bigscreenplayer/models/windowtypes'
  ],
  function (MediaState, ReadyHelper, WindowTypes) {
    var callback;

    fdescribe('readyHelper', function () {
      var readyHelper;

      beforeEach(function () {
        callback = jasmine.createSpy('callback');
      });

      describe('- Basic -', function () {
        beforeEach(function () {
          readyHelper = new ReadyHelper(undefined, WindowTypes.STATIC, callback);
        });

        it('does not call the supplied callback in init', function () {
          expect(callback).not.toHaveBeenCalled();
        });

        it('does not call the supplied callback if there is no event data', function () {
          readyHelper.callbackWhenReady({
            timeUpdate: true
          });

          expect(callback).not.toHaveBeenCalled();
        });

        it('only calls the supplied callback once when given multiple events containing a valid time', function () {
          readyHelper.callbackWhenReady({
            timeUpdate: true,
            data: {
              currentTime: 0
            }
          });

          expect(callback).toHaveBeenCalledTimes(1);

          readyHelper.callbackWhenReady({
            timeUpdate: true,
            data: {
              currentTime: 1
            }
          });

          expect(callback).toHaveBeenCalledTimes(1);
        });
      });

      describe('- Static, No Initial Time -', function () {
        beforeEach(function () {
          readyHelper = new ReadyHelper(undefined, WindowTypes.STATIC, callback);
        });

        it('calls the supplied callback when given event data containing a valid time', function () {
          readyHelper.callbackWhenReady({
            timeUpdate: true,
            data: {
              currentTime: 0
            }
          });

          expect(callback).toHaveBeenCalledTimes(1);
        });

        it('does not call the supplied callback when given event data containing an invalid time', function () {
          readyHelper.callbackWhenReady({
            timeUpdate: true,
            data: {
              currentTime: -1
            }
          });

          expect(callback).not.toHaveBeenCalled();
        });

        it('does not call the supplied callback when media state transitions to FATAL_ERROR', function () {
          readyHelper.callbackWhenReady({
            data: {
              state: MediaState.FATAL_ERROR
            }
          });

          expect(callback).not.toHaveBeenCalled();
        });

        it('does not call the supplied callback when media state is undefined', function () {
          readyHelper.callbackWhenReady({
            data: {
              state: undefined
            }
          });

          expect(callback).not.toHaveBeenCalled();
        });

        it('calls the supplied callback when media state and time is valid', function () {
          readyHelper.callbackWhenReady({
            data: {
              state: MediaState.PLAYING,
              currentTime: 0
            }
          });

          expect(callback).toHaveBeenCalledTimes(1);
        });
      });

      describe('- Static, Initial Time -', function () {
        beforeEach(function () {
          readyHelper = new ReadyHelper(60, WindowTypes.STATIC, callback);
        });

        it('calls the supplied callback when current time exceeds intital time', function () {
          readyHelper.callbackWhenReady({
            timeUpdate: true,
            data: {
              currentTime: 61
            }
          });

          expect(callback).toHaveBeenCalledTimes(1);
        });

        it('does not call the supplied callback when current time precedes intital time', function () {
          readyHelper.callbackWhenReady({
            timeUpdate: true,
            data: {
              currentTime: 59
            }
          });

          expect(callback).not.toHaveBeenCalled();
        });
      });
    });
  }
);
