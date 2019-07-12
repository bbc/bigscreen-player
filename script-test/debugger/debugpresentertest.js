require(
  [
    'bigscreenplayer/debugger/debugpresenter',
    'bigscreenplayer/models/mediastate'
  ],
    function (DebugPresenter, MediaState) {
      describe('Debug Presenter', function () {
        var presenter;
        var viewMock;

        beforeEach(function () {
          viewMock = jasmine.createSpyObj('view', ['render']);
          presenter = DebugPresenter;
          presenter.init(viewMock);
        });

        it('parses static info from an array of chronicle values', function () {
          presenter.update([{type: 'keyvalue', keyvalue: {key: 'bitrate', value: '1000'}, timestamp: 1518018558259}]);
          var expectedObject = {
            static: [
              {
                key: 'bitrate',
                value: '1000'
              }
            ],
            dynamic: [
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('converts any static field Date object into human readable time string', function () {
          var testDate = new Date(1518018558259);
          presenter.update([{type: 'keyvalue', keyvalue: {key: 'anything', value: testDate}, timestamp: 1518018558259}]);
          var expectedObject = {
            static: [
              {
                key: 'anything',
                value: '15:49:18'
              }
            ],
            dynamic: [
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses dynamic info from an array of chronicle values', function () {
          presenter.update([{type: 'info', message: 'A string info message', timestamp: 1518018558259}]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Info: A string info message'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses multiple dynamic events from an array of chronicle values', function () {
          presenter.update([
            {type: 'info', message: 'A string info message', timestamp: 1518018558259},
            {type: 'info', message: 'Another info message', timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Info: A string info message',
              '2018-02-07T15:49:18.259Z - Info: Another info message'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses error events to simple string representation', function () {
          presenter.update([
            {type: 'error',
              error: {
                errorId: '1',
                message: 'An error has occurred'
              },
              timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Error: 1 | An error has occurred'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses events to readable representation', function () {
          presenter.update([
            {type: 'event', event: {state: MediaState.PLAYING}, timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Event: PLAYING'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses time to formatted string representation', function () {
          presenter.update([
            {type: 'time', currentTime: 12.3433, timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Video time: 12.34'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses long time to formatted string representation', function () {
          presenter.update([
            {type: 'time', currentTime: 788.9999, timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Video time: 789.00'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses long time to formatted string representation', function () {
          presenter.update([
            {type: 'time', currentTime: 788.9999, timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Video time: 789.00'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('parses apicall to a formatted string representation', function () {
          presenter.update([
            {type: 'apicall', calltype: 'Play', timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Api call: Play'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('When the log object does not contain a valid type', function () {
          presenter.update([
            {type: 'blah', someobject: {thing: ''}, timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
            ],
            dynamic: [
              '2018-02-07T15:49:18.259Z - Unknown log format'
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('Only uses the the latest value when updating static fields', function () {
          presenter.update([
            {type: 'keyvalue', keyvalue: {key: 'bitrate', value: '1000'}, timestamp: 1518018558259},
            {type: 'keyvalue', keyvalue: {key: 'bitrate', value: '2000'}, timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
              {
                key: 'bitrate',
                value: '2000'
              }
            ],
            dynamic: [
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });

        it('Only uses the the latest value when updating static fields with multiple fields', function () {
          presenter.update([
            {type: 'keyvalue', keyvalue: {key: 'bitrate', value: '1000'}, timestamp: 1518018558259},
            {type: 'keyvalue', keyvalue: {key: 'duration', value: '12345'}, timestamp: 1518018558259},
            {type: 'keyvalue', keyvalue: {key: 'bitrate', value: '2000'}, timestamp: 1518018558259},
            {type: 'keyvalue', keyvalue: {key: 'duration', value: '12346'}, timestamp: 1518018558259},
            {type: 'keyvalue', keyvalue: {key: 'seekableRangeStart', value: '0'}, timestamp: 1518018558259},
            {type: 'keyvalue', keyvalue: {key: 'seekableRangeEnd', value: '12346'}, timestamp: 1518018558259}
          ]);
          var expectedObject = {
            static: [
              {
                key: 'bitrate',
                value: '2000'
              },
              {
                key: 'duration',
                value: '12346'
              },
              {
                key: 'seekable range start',
                value: '0'
              },
              {
                key: 'seekable range end',
                value: '12346'
              }
            ],
            dynamic: [
            ]
          };

          expect(viewMock.render).toHaveBeenCalledWith(expectedObject);
        });
      });
    });
