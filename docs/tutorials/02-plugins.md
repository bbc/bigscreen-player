Plugins can be created to extend the functionality of the Bigscreen Player by adhering to an interface which propogates non state change events from the player. For example, when an error is raised or cleared.

The full interface is as follows:

- `onError`
- `onFatalError`
- `onErrorCleared`
- `onErrorHandled`
- `onBuffering`
- `onBufferingCleared`
- `onScreenCapabilityDetermined`
- `onPlayerInfoUpdated`
- `onManifestLoaded`
- `onManifestParseError`
- `onQualityChangeRequested` (deprecated: use `onDownloadQualityChange`)
- `onQualityChangeRendered` (deprecated: use `onPlaybackQualityChange`)
- `onDownloadQualityChange`
- `onPlaybackQualityChange`
- `onSubtitlesLoadError`
- `onSubtitlesTimeout`
- `onSubtitlesXMLError`
- `onSubtitlesTransformError`
- `onSubtitlesRenderError`
- `onSubtitlesDynamicLoadError`
- `onFragmentContentLengthMismatch`
- `onPlaybackRateChanged`

An example plugin may look like:

```javascript
function ExamplePlugin(appName) {
  var name = appName

  function onFatalError(evt) {
    console.log("A fatal error has occured in the app: " + name)
  }

  function onErrorHandled(evt) {
    console.log("The " + name + " app is handling a playback error")
  }

  return {
    onFatalError: onFatalError,
    onErrorHandled: onErrorHandled,
  }
}
```

```javascript
var bigscreenPlayer = BigscreenPlayer()

var examplePlugin = ExamplePlugin("myApp")

bigscreenPlayer.registerPlugin(examplePlugin)

// initialise bigscreenPlayer - see above

// you should unregister your plugins as part of your playback cleanup

// calling with no argument will unregister all plugins
bigscreenPlayer.unregisterPlugin(examplePlugin)
```
