require(
  ['bigscreenplayer/subtitles/timedtext'],
  function (TimedText) {
    describe('TimedText', function () {
      it('Should initialise with an Element and style callback function', function () {
        var mockElement = document.createElement('span');
        mockElement.setAttribute('begin', '00:00:10');
        mockElement.setAttribute('end', '00:00:13');
        var mockFunction = jasmine.createSpy('styleFunction');
        var timedText = TimedText(mockElement, mockFunction);

        expect(timedText).toEqual(jasmine.objectContaining({start: 10, end: 13, addToDom: jasmine.any(Function), removeFromDomIfExpired: jasmine.any(Function)}));
      });
    });
  }
);
