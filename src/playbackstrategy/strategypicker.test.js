import WindowTypes from '../models/windowtypes'
import StrategyPicker from './strategypicker'
import NativeStrategy from './nativestrategy'
import MSEStrategy from './msestrategy'

jest.mock('./nativestrategy')
jest.mock('dashjs/index_mediaplayerOnly', () => ({ MediaPlayer: jest.fn() }))
jest.mock('./msestrategy')

describe('Strategy Picker', () => {
  var isUHD = true

  beforeEach(function () {
    window.bigscreenPlayer = {}
  })

  afterEach(function () {
    delete window.bigscreenPlayer
  })

  it('should default to native strategy', (done) => {
    StrategyPicker(WindowTypes.STATIC, isUHD).then(function (strategy) {
      expect(strategy).toEqual(NativeStrategy)
      done()
    })
  })

  it('should use native strategy if UHD is an exception for a hybrid device', (done) => {
    window.bigscreenPlayer = {
      playbackStrategy: 'hybridstrategy',
      mseExceptions: ['uhd']
    }

    StrategyPicker(WindowTypes.STATIC, isUHD).then(function (strategy) {
      expect(strategy).toEqual(NativeStrategy)
      done()
    })
  })

  describe('WindowType Exceptions', () => {
    it('should use native strategy if playing and an exception for a STATIC window', (done) => {
      window.bigscreenPlayer = {
        playbackStrategy: 'hybridstrategy',
        mseExceptions: ['staticWindow']
      }

      StrategyPicker(WindowTypes.STATIC, !isUHD).then(function (strategy) {
        expect(strategy).toEqual(NativeStrategy)
        done()
      })
    })

    it('should use native strategy if playing and an exception for a SLIDING window', (done) => {
      window.bigscreenPlayer = {
        playbackStrategy: 'hybridstrategy',
        mseExceptions: ['slidingWindow']
      }

      StrategyPicker(WindowTypes.SLIDING, !isUHD).then(function (strategy) {
        expect(strategy).toEqual(NativeStrategy)
        done()
      })
    })

    it('should use native strategy if playing and an exception for a GROWING window', (done) => {
      window.bigscreenPlayer = {
        playbackStrategy: 'hybridstrategy',
        mseExceptions: ['growingWindow']
      }

      StrategyPicker(WindowTypes.GROWING, !isUHD).then(function (strategy) {
        expect(strategy).toEqual(NativeStrategy)
        done()
      })
    })
  })

  it('should use mse strategy if there are no exceptions for a hybrid device', (done) => {
    window.bigscreenPlayer = {
      playbackStrategy: 'hybridstrategy'
    }

    StrategyPicker(WindowTypes.STATIC, isUHD).then(function (strategy) {
      expect(strategy).toEqual(MSEStrategy)
      done()
    })
  })

  it('should use mse strategy when configured', (done) => {
    window.bigscreenPlayer.playbackStrategy = 'msestrategy'

    StrategyPicker(WindowTypes.STATIC, isUHD).then(function (strategy) {
      expect(strategy).toEqual(MSEStrategy)
      done()
    })
  })
})
