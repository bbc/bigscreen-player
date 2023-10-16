BigscreenPlayer can be configured past playback strategy and live support. You can also provide [player settings](#player-settings) and [playback overrides](#overrides).

## Overrides

This library works across a multitude of different devices. But in order to do so, different configuration options are available to ensure the experience is good on those devices.

In order to add an override, simply add an override object to the `window.bigscreenPlayer.overrides` object.

| Name                | Description                                                                                                                                                                                                                        | Values     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `disableSeekSentinel` | Does what it says on the tin, if we are about to fire a seekSentinel it will just return early if this flag is true. Some devices don't get timeupdates quickly enough and fire a seek sentinel, returning to beginning of playback | boolean |
| `showLiveCurtain` | This is a black html div element placed on top of the video, this is used to hide seeking issues such as the `forceBeginPlaybackToEndOfWindow` | boolean |
| `forceBeginPlaybackToEndOfWindow` | This is a an override that happens in the restartable/seekable players, whenever we start a stream without a start time and this override is true it will give the player a start time of infinity to force it to the end of the window. It is also used in conjunction with the showLiveCurtain for seeking as some devices will play from the wrong point for a few frames before jumping to the correct time. | boolean |
| `pauseOnExitSeek` | This is a workaround for devices which will error if you try to pause straight after seeking. This is a business decision that if you are paused before you seek you should remain paused on exiting seek. This is done by waiting for a time update event to make sure we are playing after the seek before we attempt to pause the player. | boolean |
| `deferedPlayback` | Currently a workaround for devices that will call play before seek on a deferedPlayFrom, instead of calling seek then play. | boolean |
| `mseDurationOverride` | dash.js v3.0 update caused issues for certain devices when playing from the live point. This will force set the duration when playing live content and stop any issues. | boolean |
| `restartTimeout` | This is used after a seek attempted to ensure that a seek has happened correctly. | number |
| `disableMediaSourceUnload` | When tearing down in HTML5 we unload the source as part of the html5 spec. This prevents this from happening as it was causing issues on devices. | boolean |
| `legacySubtitles` | This can be used to render subtitles using our legacy method, rather than the new method which utilises the third party imscJS library. | boolean |
| `liveUhdDisableSentinels` | Disables any sentinels when consuming live UHD content | boolean |
| `cacheSeekableRange` | Caches the seekable range so it can't be requested more than every 250ms for devices that struggle. | boolean |

## Player Settings

Player settings are provided to BigscreenPlayer during initialisation through the `.init()` function. They extend the player settings provided by Dash.js: (<http://cdn.dashjs.org/latest/jsdoc/module-Settings.html>).

In the case where a setting is called out as alleviating a known device issue, we picked the default value to do so across all devices we test.

### `failoverResetTime`

Specify the time (in milliseconds) til a media source is added back to the list of available media sources after it has been failed over. What is a failover? See [the failover documentation](https://bbc.github.io/bigscreen-player/api/tutorial-cdn-failover.html)

```ts
type failoverResetTime = number is FiniteNumber
```

### `failoverSort`

Provide a sorting algorithm to reorder the available media sources after a failover.

```ts
type failoverSort = (...sources: [...string]) => [...string]
```

### `streaming.seekDurationPadding`

Add a padding to prevent seeking too close to the duration of the media.

```ts
type seekDurationPadding = number is FiniteNumber
```

Fixes:

- Media element seeking back to start when end of stream is signalled during a seek to duration.
- Media element failing to complete a seek to a time close to the duration when end of stream is signalled during the seek because of media tracks with unequal length. The padding prevents seeking into the time range up to the duration where only some tracks have data.
