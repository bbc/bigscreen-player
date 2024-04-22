import MediaState from "./mediastate"
import PauseTriggers from "./pausetriggers"

export type StateChange = {
    state: MediaState
    isSeeking?: boolean
    trigger?: PauseTriggers
    isBufferingTimeoutError?: boolean
    code?: number
    message?: string
}