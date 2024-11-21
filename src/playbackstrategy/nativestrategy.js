import LegacyAdapter from "./legacyplayeradapter"

import Cehtml from "./modifiers/cehtml"
import Html5 from "./modifiers/html5"
import SamsungMaple from "./modifiers/samsungmaple"
import SamsungStreaming from "./modifiers/samsungstreaming"
import SamsungStreaming2015 from "./modifiers/samsungstreaming2015"

import None from "./modifiers/live/none"
import Playable from "./modifiers/live/playable"
import Restartable from "./modifiers/live/restartable"
import Seekable from "./modifiers/live/seekable"
import { ManifestType } from "../models/manifesttypes"

function NativeStrategy(mediaSources, mediaKind, playbackElement, isUHD) {
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

  if (mediaSources.time().manifestType === ManifestType.DYNAMIC) {
    switch (window.bigscreenPlayer.liveSupport) {
      case "none":
        mediaPlayer = None(mediaPlayer, mediaSources)
        break
      case "playable":
        mediaPlayer = Playable(mediaPlayer, mediaSources)
        break
      case "restartable":
        mediaPlayer = Restartable(mediaPlayer, mediaSources)
        break
      case "seekable":
        mediaPlayer = Seekable(mediaPlayer, mediaSources)
        break
      default:
        mediaPlayer = Playable(mediaPlayer, mediaSources)
    }
  }

  return LegacyAdapter(mediaSources, playbackElement, isUHD, mediaPlayer)
}

NativeStrategy.getLiveSupport = () => window.bigscreenPlayer.liveSupport

export default NativeStrategy
