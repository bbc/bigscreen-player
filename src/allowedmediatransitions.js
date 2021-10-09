function AllowedMediaTransitions (mediaplayer) {
  const player = mediaplayer

  const MediaPlayerState = {
    EMPTY: 'EMPTY', // No source set
    STOPPED: 'STOPPED', // Source set but no playback
    BUFFERING: 'BUFFERING', // Not enough data to play, waiting to download more
    PLAYING: 'PLAYING', // Media is playing
    PAUSED: 'PAUSED', // Media is paused
    COMPLETE: 'COMPLETE', // Media has reached its end point
    ERROR: 'ERROR' // An error occurred
  }

  function canBePaused () {
    const pausableStates = [
      MediaPlayerState.BUFFERING,
      MediaPlayerState.PLAYING
    ]

    return pausableStates.indexOf(player.getState()) !== -1
  }

  function canBeStopped () {
    const unstoppableStates = [
      MediaPlayerState.EMPTY,
      MediaPlayerState.ERROR
    ]

    const stoppable = unstoppableStates.indexOf(player.getState()) === -1
    return stoppable
  }

  function canBeginSeek () {
    const unseekableStates = [
      MediaPlayerState.EMPTY,
      MediaPlayerState.ERROR
    ]

    const state = player.getState()
    const seekable = state ? unseekableStates.indexOf(state) === -1 : false

    return seekable
  }

  function canResume () {
    return player.getState() === MediaPlayerState.PAUSED || player.getState() === MediaPlayerState.BUFFERING
  }

  return {
    canBePaused: canBePaused,
    canBeStopped: canBeStopped,
    canBeginSeek: canBeginSeek,
    canResume: canResume
  }
}

export default AllowedMediaTransitions
