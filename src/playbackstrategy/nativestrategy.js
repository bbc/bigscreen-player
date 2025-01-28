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

const getBasePlayer = (mediaPlayer) => {
  if (mediaPlayer === "cehtml") return Cehtml()
  if (mediaPlayer === "samsungmaple") return SamsungMaple()
  if (mediaPlayer === "samsungstreaming") return SamsungStreaming()
  if (mediaPlayer === "samsungstreaming2015") return SamsungStreaming2015()

  return Html5()
}

const getMediaPlayer = (mediaSources) => {
  const configuredPlayer = window.bigscreenPlayer.mediaPlayer
  const liveSupport = window.bigscreenPlayer.liveSupport

  const basePlayer = getBasePlayer(configuredPlayer)

  if (mediaSources.time().manifestType !== ManifestType.DYNAMIC) return basePlayer

  if (liveSupport === "none") return None(basePlayer, mediaSources)
  if (liveSupport === "restartable") return Restartable(basePlayer, mediaSources)
  if (liveSupport === "seekable") return Seekable(basePlayer, mediaSources)

  return Playable(basePlayer, mediaSources)
}

const NativeStrategy = (mediaSources, mediaKind, playbackElement, isUHD) =>
  LegacyAdapter(mediaSources, playbackElement, isUHD, getMediaPlayer(mediaSources))

NativeStrategy.getLiveSupport = () => window.bigscreenPlayer.liveSupport

export default NativeStrategy
