import { MediaPlayerSettingClass } from "dashjs"

type Connection = {
  cdn: string
  url: string
}

type CaptionsConnection = Connection & {
  segmentLenght: number
}

type Settings = MediaPlayerSettingClass & {
  failoverResetTime: number
  failoverSort: (sources: string[]) => string[]
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

export type InitData = {
  media: {
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
  /**
   * @deprecated
   * Date object with server time offset
   */
  serverDate?: Date
}

export type InitCallbacks = {
  onError: () => void
  onSuccess: () => void
}
