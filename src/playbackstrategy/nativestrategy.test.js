import NativeStrategy from "./nativestrategy"
import LegacyAdapter from "./legacyplayeradapter"

import HTML5Player from "./modifiers/html5"
import CehtmlPlayer from "./modifiers/cehtml"
import SamsungMaplePlayer from "./modifiers/samsungmaple"
import SamsungStreamingPlayer from "./modifiers/samsungstreaming"
import SamsungStreaming2015Player from "./modifiers/samsungstreaming2015"

import None from "./modifiers/live/none"
import Playable from "./modifiers/live/playable"
import RestartablePlayer from "./modifiers/live/restartable"
import SeekablePlayer from "./modifiers/live/seekable"

import { ManifestType } from "../models/manifesttypes"

jest.mock("./legacyplayeradapter")

jest.mock("./modifiers/html5")
jest.mock("./modifiers/cehtml")
jest.mock("./modifiers/samsungmaple")
jest.mock("./modifiers/samsungstreaming")
jest.mock("./modifiers/samsungstreaming2015")

jest.mock("./modifiers/live/none")
jest.mock("./modifiers/live/playable")
jest.mock("./modifiers/live/restartable")
jest.mock("./modifiers/live/seekable")

describe("Native Strategy", () => {
  const mediaKind = "mediaKind"
  const playbackElement = "playbackElement"
  const isUHD = "isUHD"

  const html5Player = "mockHtml5Player"
  const cehtmlPlayer = "mockCehtmlPlayer"
  const samsungMaplePlayer = "mockSamsungMaplePlayer"
  const samsungStreamingPlayer = "mockSamsungStreamingPlayer"
  const samsungStreaming2015Player = "mockSamsungStreaming2015Player"

  const nonePlayer = "mockNonePlayer"
  const playablePlayer = "mockPlayablePlayer"
  const restartablePlayer = "mockRestartablePlayer"
  const seekablePlayer = "mockSeekablePlayer"

  const mockMediaSources = {
    time: jest.fn(),
    currentSource: jest.fn().mockReturnValue(""),
    availableSources: jest.fn().mockReturnValue([]),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    window.bigscreenPlayer = {}

    HTML5Player.mockReturnValue(html5Player)
    CehtmlPlayer.mockReturnValue(cehtmlPlayer)
    SamsungMaplePlayer.mockReturnValue(samsungMaplePlayer)
    SamsungStreamingPlayer.mockReturnValue(samsungStreamingPlayer)
    SamsungStreaming2015Player.mockReturnValue(samsungStreaming2015Player)

    None.mockReturnValue(nonePlayer)
    Playable.mockReturnValue(playablePlayer)
    RestartablePlayer.mockReturnValue(restartablePlayer)
    SeekablePlayer.mockReturnValue(seekablePlayer)
  })

  afterEach(() => {
    delete window.bigscreenPlayer
  })

  describe("stream types", () => {
    it("calls LegacyAdapter with a static media player when called for STATIC stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(HTML5Player).toHaveBeenCalledWith()

      expect(LegacyAdapter).toHaveBeenCalled()
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, html5Player)
    })

    it("calls LegacyAdapter with a live media player when called for a DYNAMIC stream", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(HTML5Player).toHaveBeenCalledWith()
      expect(Playable).toHaveBeenCalledWith(html5Player, mockMediaSources)

      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, playablePlayer)
    })
  })

  describe("players", () => {
    it("should default to html5 when no configuration", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })
      window.bigscreenPlayer.mediaPlayer = undefined

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(HTML5Player).toHaveBeenCalledWith()
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, html5Player)
    })

    it("should use the cehtml when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })
      window.bigscreenPlayer.mediaPlayer = "cehtml"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(CehtmlPlayer).toHaveBeenCalledWith()
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, cehtmlPlayer)
    })

    it("should use the html5 when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })
      window.bigscreenPlayer.mediaPlayer = "html5"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(HTML5Player).toHaveBeenCalledWith()
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, html5Player)
    })

    it("should use the samsungmaple when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })
      window.bigscreenPlayer.mediaPlayer = "samsungmaple"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(SamsungMaplePlayer).toHaveBeenCalledWith()
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, samsungMaplePlayer)
    })

    it("should use the samsungstreaming when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })
      window.bigscreenPlayer.mediaPlayer = "samsungstreaming"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(SamsungStreamingPlayer).toHaveBeenCalledWith()
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, samsungStreamingPlayer)
    })

    it("should use the samsungstreaming2015 when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.STATIC })
      window.bigscreenPlayer.mediaPlayer = "samsungstreaming2015"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(SamsungStreaming2015Player).toHaveBeenCalledWith()
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, samsungStreaming2015Player)
    })
  })

  describe("live players", () => {
    it("should default to playable when no configuration", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(Playable).toHaveBeenCalledWith(html5Player, mockMediaSources)
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, playablePlayer)
    })

    it("should use none when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })
      window.bigscreenPlayer.liveSupport = "none"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(None).toHaveBeenCalledWith(html5Player, mockMediaSources)
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, nonePlayer)
    })

    it("should use playable when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })
      window.bigscreenPlayer.liveSupport = "playable"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(Playable).toHaveBeenCalledWith(html5Player, mockMediaSources)
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, playablePlayer)
    })

    it("should use restartable when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })
      window.bigscreenPlayer.liveSupport = "restartable"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(RestartablePlayer).toHaveBeenCalledWith(html5Player, mockMediaSources)
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, restartablePlayer)
    })

    it("should use seekable when configured", () => {
      mockMediaSources.time.mockReturnValueOnce({ manifestType: ManifestType.DYNAMIC })
      window.bigscreenPlayer.liveSupport = "seekable"

      NativeStrategy(mockMediaSources, mediaKind, playbackElement, isUHD)

      expect(SeekablePlayer).toHaveBeenCalledWith(html5Player, mockMediaSources)
      expect(LegacyAdapter).toHaveBeenCalledWith(mockMediaSources, playbackElement, isUHD, seekablePlayer)
    })
  })
})
