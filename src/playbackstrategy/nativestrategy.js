import LegacyAdapter from "./legacyplayeradapter"
import WindowTypes from "../models/windowtypes"

import Cehtml from "./modifiers/cehtml"
import Html5 from "./modifiers/html5"
import SamsungMaple from "./modifiers/samsungmaple"
import SamsungStreaming from "./modifiers/samsungstreaming"
import SamsungStreaming2015 from "./modifiers/samsungstreaming2015"

import None from "./modifiers/live/none"
import Playable from "./modifiers/live/playable"
import Restartable from "./modifiers/live/restartable"
import Seekable from "./modifiers/live/seekable"

function NativeStrategy(mediaSources, windowType, mediaKind, playbackElement, isUHD) {
  let mediaPlayer

  switch (window.bigscreenPlayer.mediaPlayer) {
    case "cehtml":
      mediaPlayer = Cehtml()
      break
    case "html5":
      mediaPlayer = Html5()
      break
    case "samsungmaple":
      mediaPlayer = SamsungMaple()
      break
    case "samsungstreaming":
      mediaPlayer = SamsungStreaming()
      break
    case "samsungstreaming2015":
      mediaPlayer = SamsungStreaming2015()
      break
    default:
      mediaPlayer = Html5()
  }

  if (windowType !== WindowTypes.STATIC) {
    switch (window.bigscreenPlayer.liveSupport) {
      case "none":
        mediaPlayer = None(mediaPlayer, windowType, mediaSources)
        break
      case "playable":
        mediaPlayer = Playable(mediaPlayer, windowType, mediaSources)
        break
      case "restartable":
        mediaPlayer = Restartable(mediaPlayer, windowType, mediaSources)
        break
      case "seekable":
        mediaPlayer = Seekable(mediaPlayer, windowType, mediaSources)
        break
      default:
        mediaPlayer = Playable(mediaPlayer, windowType, mediaSources)
    }
  }

  return LegacyAdapter(mediaSources, windowType, playbackElement, isUHD, mediaPlayer)
}

NativeStrategy.getLiveSupport = () => window.bigscreenPlayer.liveSupport

export default NativeStrategy
