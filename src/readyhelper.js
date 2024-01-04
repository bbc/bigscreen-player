import MediaState from "./models/mediastate"
import WindowTypes from "./models/windowtypes"
import LiveSupport from "./models/livesupport"

function ReadyHelper(initialPlaybackTime, windowType, liveSupport, callback) {
  let ready = false

  const callbackWhenReady = (evt) => {
    if (ready) return

    if (!evt.data) {
      ready = false
    } else if (evt.timeUpdate) {
      ready = isValidTime(evt.data)
    } else {
      ready = isValidState(evt.data) && isValidTime(evt.data)
    }

    if (ready && callback) {
      callback()
    }
  }

  function isValidState(evtData) {
    return evtData.state && evtData.state !== MediaState.FATAL_ERROR
  }

  function isValidTime(evtData) {
    const isStatic = windowType === WindowTypes.STATIC

    return isStatic
      ? validateStaticTime(evtData.currentTime)
      : validateLiveTime(evtData.currentTime, evtData.seekableRange)
  }

  function validateStaticTime(currentTime) {
    if (currentTime !== undefined) {
      return initialPlaybackTime ? currentTime > 0 : currentTime >= 0
    }
    return false
  }

  function validateLiveTime(currentTime, seekableRange) {
    if (liveSupport === LiveSupport.PLAYABLE) {
      return currentTime >= 0
    }

    return isValidSeekableRange(seekableRange)
  }

  function isValidSeekableRange(seekableRange) {
    return seekableRange ? !(seekableRange.start === 0 && seekableRange.end === 0) : false
  }

  return {
    callbackWhenReady,
  }
}

export default ReadyHelper
