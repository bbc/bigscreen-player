require(
  [
    'bigscreenplayer/debugger/chronicle'
  ],
  function (Chronicle) {
    describe('Chronicle', function () {
      beforeEach(function () {
        spyOn(window, 'Date').and.callFake(function () {
          return {getTime: function () { return 1234; }};
        });
        Chronicle.init();
      });

      afterEach(function () {
        Chronicle.clear();
      });

      it('stores an info message with type and message', function () {
        var testInfoMessage = 'A test info message';
        var expectedObject = {
          type: 'info',
          message: testInfoMessage,
          timestamp: 1234
        };
        Chronicle.info(testInfoMessage);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('pushes subsequent info message to array', function () {
        var firstMessage = 'A test info message';
        var secondMessage = 'A second test message';
        var expectedObject = {
          type: 'info',
          message: secondMessage,
          timestamp: 1234
        };
        Chronicle.info(firstMessage);
        Chronicle.info(secondMessage);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('stores an error with type and error', function () {
        var testErrorObject = {
          message: 'an error message',
          code: 1
        };
        var expectedObject = {
          type: 'error',
          error: testErrorObject,
          timestamp: 1234
        };
        Chronicle.error(testErrorObject);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('stores an event with type and event', function () {
        var testEventObject = {
          state: 'eg PLAYING',
          data: 'some data'
        };
        var expectedObject = {
          type: 'event',
          event: testEventObject,
          timestamp: 1234
        };
        Chronicle.event(testEventObject);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('stores an apicall with type and the call type', function () {
        var testApiCallType = 'play';
        var expectedObject = {
          type: 'apicall',
          calltype: testApiCallType,
          timestamp: 1234
        };
        Chronicle.apicall(testApiCallType);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('pushes the first time event to the array', function () {
        var expectedObject = {
          type: 'time',
          currentTime: 1,
          timestamp: 1234
        };
        Chronicle.time(1);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('subsequenty time event overwrites the previous in the array', function () {
        var expectedObject = {
          type: 'time',
          currentTime: 2,
          timestamp: 1234
        };
        Chronicle.time(1);
        Chronicle.time(2);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.length).toEqual(2);
        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('time followed by info followed by time doesnt compress second time event', function () {
        var expectedObject = {
          type: 'time',
          currentTime: 3,
          timestamp: 1234
        };
        Chronicle.time(1);
        Chronicle.time(2);
        Chronicle.info('An info message');
        Chronicle.time(3);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.length).toEqual(4);
        expect(chronicle.pop()).toEqual(expectedObject);
      });

      it('stores compressed time info and error events', function () {
        var expectedArray = [
          {type: 'time', currentTime: 1, timestamp: 1234},
          {type: 'time', currentTime: 2, timestamp: 1234},
          {type: 'info', message: 'An info message', timestamp: 1234},
          {type: 'time', currentTime: 3, timestamp: 1234},
          {type: 'error', error: {message: 'Something went wrong'}, timestamp: 1234},
          {type: 'time', currentTime: 4, timestamp: 1234},
          {type: 'time', currentTime: 6, timestamp: 1234}
        ];

        Chronicle.time(1);
        Chronicle.time(2);
        Chronicle.info('An info message');
        Chronicle.time(3);
        Chronicle.error({message: 'Something went wrong'});
        Chronicle.time(4);
        Chronicle.time(5);
        Chronicle.time(6);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.length).toEqual(7);
        expect(chronicle).toEqual(expectedArray);
      });

      it('stores first and last time events', function () {
        var expectedArray = [
          {type: 'time', currentTime: 1, timestamp: 1234},
          {type: 'time', currentTime: 3, timestamp: 1234}
        ];

        Chronicle.time(1);
        Chronicle.time(2);
        Chronicle.time(3);
        var chronicle = Chronicle.retrieve();

        expect(chronicle.length).toEqual(2);
        expect(chronicle).toEqual(expectedArray);
      });

      it('stores key value events', function () {
        var expectedArray = [
          {type: 'keyvalue', keyvalue: {Bitrate: '1000'}, timestamp: 1234},
          {type: 'keyvalue', keyvalue: {Duration: '1345'}, timestamp: 1234}
        ];

        Chronicle.keyValue({Bitrate: '1000'});
        Chronicle.keyValue({Duration: '1345'});

        var chronicle = Chronicle.retrieve();

        expect(chronicle.length).toEqual(2);
        expect(chronicle).toEqual(expectedArray);
      });
    });
  });
