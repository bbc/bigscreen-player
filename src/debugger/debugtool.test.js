require(
  [
    'bigscreenplayer/debugger/chronicle',
    'bigscreenplayer/debugger/debugtool'
  ],
  function (Chronicle, DebugTool) {
    describe('Debug Tool, when intercepting keyValue calls,', function () {
      beforeEach(function () {
        Chronicle.init();
        spyOn(window, 'Date').and.callFake(function () {
          return {getTime: function () { return 1234; }};
        });
      });

      afterEach(function () {
        DebugTool.tearDown();
        Chronicle.tearDown();
      });

      it('should always add entry to chronicle if the key does not match one of the defined static keys', function () {
        var testObj1 = {key: 'bitrate', value: '1000'};
        var testObj2 = {key: 'imNotSpecial', value: 'nobodylovesme'};
        var testObj3 = {key: 'idontmatch', value: 'pleaseaddme'};

        var expectedArray = [
          {type: 'keyvalue', keyvalue: testObj1, timestamp: 1234},
          {type: 'keyvalue', keyvalue: testObj2, timestamp: 1234},
          {type: 'keyvalue', keyvalue: testObj3, timestamp: 1234}
        ];

        DebugTool.keyValue(testObj1);
        DebugTool.keyValue(testObj2);
        DebugTool.keyValue(testObj3);

        var chronicle = Chronicle.retrieve();

        expect(chronicle).toEqual(expectedArray);
      });

      it('overwrites a keyvalue entry to the chronicle if that keyvalue already exists', function () {
        var testObj = {key: 'akey', value: 'something'};
        var testObj1 = {key: 'bitrate', value: '1000'};
        var testObj2 = {key: 'bitrate', value: '1001'};

        var expectedArray = [
          {type: 'keyvalue', keyvalue: {key: 'akey', value: 'something'}, timestamp: 1234},
          {type: 'keyvalue', keyvalue: {key: 'bitrate', value: '1001'}, timestamp: 1234}
        ];

        DebugTool.keyValue(testObj);
        DebugTool.keyValue(testObj1);
        DebugTool.keyValue(testObj2);

        var chronicle = Chronicle.retrieve();

        expect(chronicle).toEqual(expectedArray);
      });
    });
  });
