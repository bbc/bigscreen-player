import { MediaPlayerSettingClass } from "dashjs"

export type Connection = {
  cdn: string
  url: string
}

export type CaptionsConnection = Connection & {
  segmentLength: number
}

type Settings = MediaPlayerSettingClass & {
  failoverResetTime: number
  failoverSort: (sources: Connection[]) => Connection[]
  streaming: {
    seekDurationPadding: number
  }
}

export type SubtitlesCustomisationOptions = Partial<{
  /** CSS background-color string or hex string */
  backgroundColor: string
  /** CSS font-family string */
  fontFamily: string
  /** lineHeight multiplier to authored subtitles */
  lineHeight: number
  /** size multiplier to authored subtitles */
  size: number
}>

export type MediaDescriptor = {
  kind: "audio" | "video"
  /** f.ex. 'video/mp4' */
  mimeType: string
  /** source type. f.ex. 'application/dash+xml' */
  type: string
  urls: Connection[]
  captions?: CaptionsConnection[]
  /** Location for a captions file */
  captionsUrl?: string
  playerSettings?: Partial<Settings>
  subtitlesCustomisation?: SubtitlesCustomisationOptions
  subtitlesRequestTimeout?: number
}

export type ServerDate = number

export type InitData = {
  media: MediaDescriptor
  /**
   * @deprecated
   * Date object with server time offset
   */
  serverDate?: ServerDate
}

export type InitCallbacks = {
  onError: () => void
  onSuccess: () => void
}
