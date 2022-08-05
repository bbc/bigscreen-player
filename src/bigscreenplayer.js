/**
 * @module bigscreenplayer/bigscreenplayer
 */
import MediaState from './models/mediastate'
import PlayerComponent from './playercomponent'
import PauseTriggers from './models/pausetriggers'
import DynamicWindowUtils from './dynamicwindowutils'
import WindowTypes from './models/windowtypes'
import MockBigscreenPlayer from './mockbigscreenplayer'
import Plugins from './plugins'
import Chronicle from './debugger/chronicle'
import DebugTool from './debugger/debugtool'
import SlidingWindowUtils from './utils/timeutils'
import callCallbacks from './utils/callcallbacks'
import MediaSources from './mediasources'
import Version from './version'
import Resizer from './resizer'
import ReadyHelper from './readyhelper'
import Subtitles from './subtitles/subtitles'
import './typedefs'


// Pop these in player data: newWindowType, enableSubtitles
export default class BigscreenPlayer extends EventTarget {

   #serverDate
   #windowType
   #mediaSources
   #playbackElement
   #subtitles
   #emitter
   #mediaKind
   #endOfStream
   #playerComponent

  static #END_OF_STREAM_TOLERANCE = 10

  constructor(elem, playerData) {
    super()
    this.#emitter = this.#emit.bind(this)
    this.#playbackElement = elem
    Chronicle.init()

    DebugTool.setRootElement(this.#playbackElement)
    DebugTool.keyValue({key: 'framework-version', value: Version})
    this.#windowType = playerData.windowType
    this.#serverDate = playerData.serverDate

    const mediaSourceCallbacks = {
      onSuccess: () => {
        console.log('initialising...')
        this.#bigscreenPlayerDataLoaded(playerData, playerData.enableSubtitles)
      },
      onError: (error) => {
        if (callbacks.onError) {
          callbacks.onError(error)
        }
      }
    }

    this.mediaSources = MediaSources()

    // Backwards compatibility with Old API; to be removed on Major Version Update
    if (playerData.media && !playerData.media.captions && playerData.media.captionsUrl) {
      playerData.media.captions = [{
        url: playerData.media.captionsUrl
      }]
    }

    this.mediaSources.init(playerData.media, this.#serverDate,  this.#windowType, this.#getLiveSupport(), mediaSourceCallbacks)
  }

  #emit(event) {
    this.dispatchEvent(new CustomEvent(event.type, { detail: event}))
  }

  #getLiveSupport() {
    return PlayerComponent.getLiveSupport()
  }


  #bigscreenPlayerDataLoaded (playerData, enableSubtitles) {
    if (playerData.windowType !== WindowTypes.STATIC) {
      playerData.time = mediaSources.time()
      serverDate = playerData.serverDate

      initialPlaybackTimeEpoch = playerData.initialPlaybackTime
      // overwrite initialPlaybackTime with video time (it comes in as epoch time for a sliding/growing window)
      playerData.initialPlaybackTime = SlidingWindowUtils.convertToSeekableVideoTime(playerData.initialPlaybackTime, playerData.time.windowStartTime)
    }

    this.#mediaKind = playerData.media.kind
    this.#endOfStream = playerData.windowType !== WindowTypes.STATIC && (!playerData.initialPlaybackTime && playerData.initialPlaybackTime !== 0)

    this.#playerComponent = new PlayerComponent(
      this.#playbackElement,
      playerData,
      this.mediaSources,
      playerData.windowType,
      this.#emitter,
      this.#emitter
    )
  }
}
