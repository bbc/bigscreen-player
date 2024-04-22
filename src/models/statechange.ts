import MediaState from "./mediastate"
import PauseTriggers from "./pausetriggers"

export type StateChange =
  | { state: (typeof MediaState)["STOPPED"] }
  | { state: (typeof MediaState)["PAUSED"]; trigger: PauseTriggers }
  | { state: (typeof MediaState)["PLAYING"] }
  | { state: (typeof MediaState)["WAITING"]; isSeeking: boolean }
  | { state: (typeof MediaState)["ENDED"] }
  | { state: (typeof MediaState)["FATAL_ERROR"]; isBufferingTimeoutError: boolean; code: number; message: string }
