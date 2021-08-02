require(
  [
    'bigscreenplayer/dynamicwindowutils'
  ],
  function (DynamicWindowUtils) {
    describe('autoResumeAtStartOfRange', function () {
      var resume;
      var addEventCallback;
      var removeEventCallback;
      var checkNotPauseEvent;
      var currentTime = 20;
      var seekableRange = {
        start: 0
      };

      beforeEach(function () {
        jasmine.clock().install();
        resume = jasmine.createSpy('resume');
        addEventCallback = jasmine.createSpy('addEventCallback');
        removeEventCallback = jasmine.createSpy('removeEventCallback');
        checkNotPauseEvent = jasmine.createSpy('checkNotPauseEvent');
      });

      afterEach(function () {
        jasmine.clock().uninstall();
      });

      it('resumes play when the current time is equal to the start of the seekable range', function () {
        DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume);

        jasmine.clock().tick(20000);

        expect(addEventCallback).toHaveBeenCalledTimes(1);
        expect(removeEventCallback).toHaveBeenCalledTimes(1);
        expect(resume).toHaveBeenCalledTimes(1);
      });

      it('resumes play when the current time at the start of the seekable range within a threshold', function () {
        DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume);

        jasmine.clock().tick(15000);

        expect(addEventCallback).toHaveBeenCalledTimes(1);
        expect(removeEventCallback).toHaveBeenCalledTimes(1);
        expect(resume).toHaveBeenCalledTimes(1);
      });

      it('resumes play when the current time at the start of the seekable range at the threshold', function () {
        DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume);

        jasmine.clock().tick(12000);

        expect(addEventCallback).toHaveBeenCalledTimes(1);
        expect(removeEventCallback).toHaveBeenCalledTimes(1);
        expect(resume).toHaveBeenCalledTimes(1);
      });

      it('does not resume play when the current time is past the start of the seekable range plus the threshold', function () {
        DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, undefined, resume);

        jasmine.clock().tick(10000);

        expect(addEventCallback).toHaveBeenCalledTimes(1);
        expect(removeEventCallback).toHaveBeenCalledTimes(0);
        expect(resume).toHaveBeenCalledTimes(0);
      });

      it('non pause event stops autoresume', function () {
        checkNotPauseEvent.and.returnValue(true);

        addEventCallback.and.callFake(function (context, callback) { callback(); });

        DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, checkNotPauseEvent, resume);

        jasmine.clock().tick(20000);

        expect(removeEventCallback).toHaveBeenCalledTimes(1);
        expect(resume).toHaveBeenCalledTimes(0);
      });

      it('pause event does not stop autoresume', function () {
        checkNotPauseEvent.and.returnValue(false);

        addEventCallback.and.callFake(function (context, callback) { callback(); });

        DynamicWindowUtils.autoResumeAtStartOfRange(currentTime, seekableRange, addEventCallback, removeEventCallback, checkNotPauseEvent, resume);

        jasmine.clock().tick(20000);

        expect(removeEventCallback).toHaveBeenCalledTimes(1);
        expect(resume).toHaveBeenCalledTimes(1);
      });
    });
  }
);
