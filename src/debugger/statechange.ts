import MediaState from "../models/mediastate"
import PauseTriggers from "../models/pausetriggers"

export type StateChange = {
    state: MediaState
    isSeeking?: boolean
    trigger?: PauseTriggers
    isBufferingTimeout?: boolean
    code?: number
    message?: string
}