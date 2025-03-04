import { MediaState } from "./models/mediastate"
import { LiveSupport } from "./models/livesupport"
import { ManifestType } from "./models/manifesttypes"

type SeekableRange = { start: number; end: number } | null
type State = { state?: MediaState }
type Time = { currentTime?: number; seekableRange?: SeekableRange }

function ReadyHelper(
  initialPlaybackTime: number | undefined,
  manifestType: ManifestType,
  liveSupport: LiveSupport,
  callback?: () => void
) {
  let ready = false

  const callbackWhenReady = ({ data, timeUpdate }: { data?: State | Time; timeUpdate?: boolean }) => {
    if (ready) return

    if (!data) {
      ready = false
    } else if (timeUpdate) {
      ready = isValidTime(data as Time)
    } else {
      ready = isValidState(data as State) && isValidTime(data as Time)
    }

    if (ready && callback) {
      callback()
    }
  }

  function isValidState({ state }: State): boolean {
    return state ? state !== MediaState.FATAL_ERROR : false
  }

  function isValidTime({ currentTime, seekableRange }: Time) {
    if (manifestType === ManifestType.STATIC) return validateStaticTime(currentTime)
    return validateLiveTime(currentTime, seekableRange)
  }

  function validateStaticTime(currentTime?: number) {
    if (currentTime !== undefined) {
      return initialPlaybackTime ? currentTime > 0 : currentTime >= 0
    }
    return false
  }

  function validateLiveTime(currentTime?: number, seekableRange?: SeekableRange) {
    if (liveSupport === LiveSupport.PLAYABLE || liveSupport === LiveSupport.RESTARTABLE) {
      return currentTime ? currentTime >= 0 : false
    }

    return isValidSeekableRange(seekableRange)
  }

  function isValidSeekableRange(seekableRange?: SeekableRange) {
    return seekableRange ? !(seekableRange.start === 0 && seekableRange.end === 0) : false
  }

  return {
    callbackWhenReady,
  }
}

export default ReadyHelper
