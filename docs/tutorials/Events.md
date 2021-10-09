Bigscreen Player uses a variety of events to signal its current state.

## Reacting to state changes

State changes which are emitted from the player can be acted upon to by registering a callback. The callback will receive all of the following state changes as the `state` property of the event:
- `MediaState.STOPPED`
- `MediaState.PAUSED`
- `MediaState.PLAYING`
- `MediaState.WAITING`
- `MediaState.ENDED`
- `MediaState.FATAL_ERROR`

State changes may be registered for before initialisation and will automatically be cleared upon `tearDown()` of the player.

```javascript
var bigscreenPlayer = BigscreenPlayer();

// The token is only required in the case where the function is anonymous, a reference to the function can be stored and used to unregister otherwise.
var stateChangeToken = bigscreenPlayer.registerForStateChanges(function (event) {
  if(event.state == MediaState.PLAYING) {
    console.log('Playing');
    // handle playing event
  }
});

bigscreenPlayer.unRegisterForStateChanges(stateChangeToken);
```

## Reacting to time updates

Time updates are emitted multiple times a second. Your application can register to receive these updates. The emitted object contains the `currentTime` and `endOfStream` properties.

Time updates may be registered for before initialisation and will automatically be cleared upon `tearDown()` of the player.

```javascript
var bigscreenPlayer = BigscreenPlayer();

// The token is only required in the case where the function is anonymous, a reference to the function can be stored and used to unregister otherwise.
var timeUpdateToken = bigscreenPlayer.registerForTimeUpdates(function (event) {
    console.log('Current Time: ' + event.currentTime);
});

bigscreenPlayer.unRegisterForTimeUpdates(timeUpdateToken);
```

## Reacting to subtitles being turned on/off

This is emitted on every `setSubtitlesEnabled` call. The emitted object contains an `enabled` property.

This may be registered for before initialisation and will automatically be cleared upon `tearDown()` of the player.

```javascript
var bigscreenPlayer = BigscreenPlayer();

// The token is only required in the case where the function is anonymous, a reference to the function can be stored and used to unregister otherwise.
var subtitleChangeToken = bigscreenPlayer.registerForSubtitleChanges(function (event) {
    console.log('Subttiles enabled: ' + event.enabled);
});

bigscreenPlayer.unregisterForSubtitleChanges(subtitleChangeToken);
```
[← Prev - Usage](tutorial-usage.html)

[→ Next - Creating a plugin](tutorial-creating-a-plugin.html)