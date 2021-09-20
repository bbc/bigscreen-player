import WindowTypes from '../models/windowtypes'
import StrategyPicker from './strategypicker'
import NativeStrategy from './nativestrategy'
import MSEStrategy from './msestrategy'

jest.mock('./nativestrategy')
jest.mock('dashjs/index_mediaplayerOnly', () => ({ MediaPlayer: () => {} }))
jest.mock('./msestrategy', () => jest.fn)

describe('Strategy Picker', () => {
  const isUHD = true

  beforeEach(() => {
    window.bigscreenPlayer = {}
    jest.resetModules()
  })

  afterEach(() => {
    delete window.bigscreenPlayer
  })

  it('should default to native strategy', () => {
    return StrategyPicker(WindowTypes.STATIC, isUHD).then((strategy) => {
      expect(strategy).toEqual(NativeStrategy)
    })
  })

  it('should use native strategy if UHD is an exception for a hybrid device', () => {
    window.bigscreenPlayer = {
      playbackStrategy: 'hybridstrategy',
      mseExceptions: ['uhd']
    }

    return StrategyPicker(WindowTypes.STATIC, isUHD).then((strategy) => {
      expect(strategy).toEqual(NativeStrategy)
    })
  })

  describe('WindowType Exceptions', () => {
    it('should use native strategy if playing and an exception for a STATIC window', () => {
      window.bigscreenPlayer = {
        playbackStrategy: 'hybridstrategy',
        mseExceptions: ['staticWindow']
      }

      return StrategyPicker(WindowTypes.STATIC, !isUHD).then((strategy) => {
        expect(strategy).toEqual(NativeStrategy)
      })
    })

    it('should use native strategy if playing and an exception for a SLIDING window', () => {
      window.bigscreenPlayer = {
        playbackStrategy: 'hybridstrategy',
        mseExceptions: ['slidingWindow']
      }

      return StrategyPicker(WindowTypes.SLIDING, !isUHD).then((strategy) => {
        expect(strategy).toEqual(NativeStrategy)
      })
    })

    it('should use native strategy if playing and an exception for a GROWING window', () => {
      window.bigscreenPlayer = {
        playbackStrategy: 'hybridstrategy',
        mseExceptions: ['growingWindow']
      }

      return StrategyPicker(WindowTypes.GROWING, !isUHD).then((strategy) => {
        expect(strategy).toEqual(NativeStrategy)
      })
    })
  })

  it('should use mse strategy if there are no exceptions for a hybrid device', () => {
    window.bigscreenPlayer = {
      playbackStrategy: 'hybridstrategy'
    }

    return StrategyPicker(WindowTypes.STATIC, isUHD).then((strategy) => {
      expect(strategy).toEqual(MSEStrategy)
    })
  })

  it('should use mse strategy when configured', () => {
    window.bigscreenPlayer.playbackStrategy = 'msestrategy'

    return StrategyPicker(WindowTypes.STATIC, isUHD).then((strategy) => {
      expect(strategy).toEqual(MSEStrategy)
    })
  })

  it('should reject when mse strategy cannot be loaded', () => {
    window.bigscreenPlayer.playbackStrategy = 'msestrategy'

    jest.doMock('./msestrategy', () => {
      throw new Error()
    })

    return StrategyPicker(WindowTypes.STATIC, isUHD).catch((rejection) => {
      expect(rejection).toEqual('strategyDynamicLoadError')
    })
  })

  it('should reject when mse strategy cannot be loaded for hybrid strategy configuration', () => {
    window.bigscreenPlayer.playbackStrategy = 'hybridstrategy'

    jest.doMock('./msestrategy', () => {
      throw new Error()
    })

    return StrategyPicker(WindowTypes.STATIC, isUHD).catch((rejection) => {
      expect(rejection).toEqual('strategyDynamicLoadError')
    })
  })
})
