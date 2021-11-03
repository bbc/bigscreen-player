When writing tests for your application it may be useful to use the mocking functions provided. This creates a fake player with mocking hook functions to simulate real world scenarios.

Bigscreen Player includes a test mode than can be triggered by calling `mock()` or `mockJasmine()`.

## `mock(opts)` and `mockJasmine(opts)`

`mockJasmine()` should be used when you want to mock Bigscreen Player within Jasmine tests. This turns each Bigsceen Player api function into a Jasmine spy, so you can call all the spy function on them e.g. `expect(BigscreenPlayer.play).toHaveBeenCalled()`.

`mock()` should be used when you are not running Jasmine tests.

### `opts`

- `autoProgress = true|false` (optional; defaults to false) - playback will automatically progress after 100ms, transitioning into PLAYING, then updates the time every 500ms.

## `unmock()`

Should be called when you want to stop mocking Bigsceen Player, including in the `afterEach()` of Jasmine tests.

## Mocking hooks

When Bigsceen Player has been mocked, there are various hooks added to the API in order to modify its behaviour or emulate certain real life scenarios.

### `changeState(state, eventTrigger, opts)`

Hook for changing the state e.g. `BigscreenPlayer.changeState(MediaState.WAITING)` would emulate playback buffering.

- `state = MediaState` - [MediaState](global.html#WindowTypes) to change to.
- `eventTrigger = 'device'|'other'` (optional; defaults to device) - determines whether the state change was caused by the device or not; affects `onBufferingCleared` and `onErrorCleared` plugin calls.

### `getSource()`

Get the URL of the current media.

### `progressTime(time)`

Emulate playback jumping to a given `time`.

### `setCanPause(value)`

Make `canPause()` return `value`.

### `setCanSeek(value)`

Make `canSeek()` return `value`.

### `setDuration(mediaDuration)`

Set the duration to `mediaDuration`.

### `setEndOfStream(isEndOfStream)`

Sets the `endOfStream` value to be sent with events to `isEndOfStream`.

### `setInitialBuffering(value)`

If Mock Bigsceen Player is setup to automatically progress, it will by default start progressing 100ms after `init()` has been called. If `setInitialBuffering(true)` is called, playback will not progress until something else causes it e.g. `play()` or `changeState(MediaState.PLAYING)`.

### `setLiveWindowStart(value)`

Sets the live window start time to `value`; used in the calculation for `convertVideoTimeSecondsToEpochMs(seconds)`.

### `setMediaKind(kind)`

Sets return value of `getMediaKind()` and `avType` for AV stats to `kind`.

### `setSeekableRange(newSeekableRange)`

Set the seekable range to `newSeekableRange`.

* `newSeekableRange`
  * `start` - seekable range start
  * `end` - seekable range end

### `setWindowType(type)`

Sets the [WindowType](/models/windowtypes.js). Mock Bigsceen Player will behave differently for VOD, WEBCAST, and SIMULCAST as in production.

### `setSubtitlesAvailable(value)`

Sets the return value of `isSubtitlesAvailable()` to `value`.

### `triggerError()`

Triggers a non-fatal error which stalls playback. Will be dismissed when any call to Bigsceen Player is made which results in a state change, or with mocking hooks `changeState()` or `triggerErrorHandled()`.

### `triggerErrorHandled()`

Makes Bigsceen Player handle an error - changes the URL if multiple were passed in, and the list hasn't already been exhausted, and resumes playback if Mock Bigsceen Player is automatically progressing.