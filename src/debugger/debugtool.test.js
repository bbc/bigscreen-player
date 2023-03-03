import Chronicle from './chronicle'
import DebugTool from './debugtool'

describe('Debug Tool, when configuring log levels,', () => {
  it('should return an object of log levels', () => {
    expect(DebugTool.logLevels && typeof DebugTool.logLevels === 'object').toBe(true)
  })

  it('should default to LOG_LEVELS.INFO', () => {
    expect(DebugTool.getLogLevel()).toEqual(DebugTool.logLevels.INFO)
  })

  it('does not override log level when setLogLevel argument is undefined', () => {
    DebugTool.setLogLevel()
    expect(DebugTool.getLogLevel()).toEqual(DebugTool.logLevels.INFO)
  })

  it('can set a new log level', () => {
    DebugTool.setLogLevel(DebugTool.logLevels.ERROR)
    expect(DebugTool.getLogLevel()).toEqual(DebugTool.logLevels.ERROR)
  })
})

describe('Debug Tool, when intercepting keyValue calls,', () => {
  beforeEach(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => {
      return { getTime: () => { return 1234 } }
    })
    Chronicle.init()
  })

  afterEach(() => {
    DebugTool.tearDown()
    Chronicle.tearDown()
  })

  it('should always add entry to chronicle if the key does not match one of the defined static keys', () => {
    const testObj1 = { key: 'bitrate', value: '1000' }
    const testObj2 = { key: 'imNotSpecial', value: 'nobodylovesme' }
    const testObj3 = { key: 'idontmatch', value: 'pleaseaddme' }

    const expectedArray = [
      { type: 'keyvalue', keyvalue: testObj1, timestamp: 1234 },
      { type: 'keyvalue', keyvalue: testObj2, timestamp: 1234 },
      { type: 'keyvalue', keyvalue: testObj3, timestamp: 1234 }
    ]

    DebugTool.keyValue(testObj1)
    DebugTool.keyValue(testObj2)
    DebugTool.keyValue(testObj3)

    const chronicle = Chronicle.retrieve()

    expect(chronicle).toEqual(expectedArray)
  })

  it('overwrites a keyvalue entry to the chronicle if that keyvalue already exists', () => {
    const testObj = { key: 'akey', value: 'something' }
    const testObj1 = { key: 'bitrate', value: '1000' }
    const testObj2 = { key: 'bitrate', value: '1001' }

    const expectedArray = [
      { type: 'keyvalue', keyvalue: { key: 'akey', value: 'something' }, timestamp: 1234 },
      { type: 'keyvalue', keyvalue: { key: 'bitrate', value: '1001' }, timestamp: 1234 }
    ]

    DebugTool.keyValue(testObj)
    DebugTool.keyValue(testObj1)
    DebugTool.keyValue(testObj2)

    const chronicle = Chronicle.retrieve()

    expect(chronicle).toEqual(expectedArray)
  })
})
