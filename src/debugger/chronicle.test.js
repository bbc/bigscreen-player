import Chronicle from './chronicle'

describe('Chronicle', () => {
  beforeEach(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => ({ getTime: () => 1234 }))
    Chronicle.init()
  })

  afterEach(() => {
    Chronicle.clear()
  })

  it('stores an info message with type and message', () => {
    const testInfoMessage = 'A test info message'
    const expectedObject = {
      type: 'info',
      message: testInfoMessage,
      timestamp: 1234
    }
    Chronicle.info(testInfoMessage)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('pushes subsequent info message to array', () => {
    const firstMessage = 'A test info message'
    const secondMessage = 'A second test message'
    const expectedObject = {
      type: 'info',
      message: secondMessage,
      timestamp: 1234
    }
    Chronicle.info(firstMessage)
    Chronicle.info(secondMessage)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('stores an error with type and error', () => {
    const testErrorObject = {
      message: 'an error message',
      code: 1
    }
    const expectedObject = {
      type: 'error',
      error: testErrorObject,
      timestamp: 1234
    }
    Chronicle.error(testErrorObject)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('stores an event with type and event', () => {
    const testEventObject = {
      state: 'eg PLAYING',
      data: 'some data'
    }
    const expectedObject = {
      type: 'event',
      event: testEventObject,
      timestamp: 1234
    }
    Chronicle.event(testEventObject)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('stores an apicall with type and the call type', () => {
    const testApiCallType = 'play'
    const expectedObject = {
      type: 'apicall',
      calltype: testApiCallType,
      timestamp: 1234
    }
    Chronicle.apicall(testApiCallType)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('pushes the first time event to the array', () => {
    const expectedObject = {
      type: 'time',
      currentTime: 1,
      timestamp: 1234
    }
    Chronicle.time(1)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('subsequenty time event overwrites the previous in the array', () => {
    const expectedObject = {
      type: 'time',
      currentTime: 2,
      timestamp: 1234
    }
    Chronicle.time(1)
    Chronicle.time(2)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.length).toEqual(2)
    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('time followed by info followed by time doesnt compress second time event', () => {
    const expectedObject = {
      type: 'time',
      currentTime: 3,
      timestamp: 1234
    }
    Chronicle.time(1)
    Chronicle.time(2)
    Chronicle.info('An info message')
    Chronicle.time(3)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.length).toEqual(4)
    expect(chronicle.pop()).toEqual(expectedObject)
  })

  it('stores compressed time info and error events', () => {
    const expectedArray = [
      {type: 'time', currentTime: 1, timestamp: 1234},
      {type: 'time', currentTime: 2, timestamp: 1234},
      {type: 'info', message: 'An info message', timestamp: 1234},
      {type: 'time', currentTime: 3, timestamp: 1234},
      {type: 'error', error: {message: 'Something went wrong'}, timestamp: 1234},
      {type: 'time', currentTime: 4, timestamp: 1234},
      {type: 'time', currentTime: 6, timestamp: 1234}
    ]

    Chronicle.time(1)
    Chronicle.time(2)
    Chronicle.info('An info message')
    Chronicle.time(3)
    Chronicle.error({message: 'Something went wrong'})
    Chronicle.time(4)
    Chronicle.time(5)
    Chronicle.time(6)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.length).toEqual(7)
    expect(chronicle).toEqual(expectedArray)
  })

  it('stores first and last time events', () => {
    const expectedArray = [
      {type: 'time', currentTime: 1, timestamp: 1234},
      {type: 'time', currentTime: 3, timestamp: 1234}
    ]

    Chronicle.time(1)
    Chronicle.time(2)
    Chronicle.time(3)
    const chronicle = Chronicle.retrieve()

    expect(chronicle.length).toEqual(2)
    expect(chronicle).toEqual(expectedArray)
  })

  it('stores key value events', () => {
    const expectedArray = [
      {type: 'keyvalue', keyvalue: {Bitrate: '1000'}, timestamp: 1234},
      {type: 'keyvalue', keyvalue: {Duration: '1345'}, timestamp: 1234}
    ]

    Chronicle.keyValue({Bitrate: '1000'})
    Chronicle.keyValue({Duration: '1345'})

    const chronicle = Chronicle.retrieve()

    expect(chronicle.length).toEqual(2)
    expect(chronicle).toEqual(expectedArray)
  })
})
