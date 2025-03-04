As part of the configuration of Bigscreen Player, a 'playback strategy' should be provided.

There are three options available:

- `msestrategy`
- `nativestrategy`
- `basicstrategy`

Your app should write this to the `globalThis` object (i.e. the `window` on browsers) before initialising Bigscreen Player. This enables only the required media player code to be loaded. For example, if MSE playback is not needed, the _dashjs_ library does not have to be loaded.

```javascript
window.bigscreenPayer.playbackStrategy = "msestrategy" // OR 'nativestrategy' OR 'basicstategy'
```

The player will require in the correct strategy file at runtime.

## MSE Strategy

The MSE strategy utilises the open source [_dashjs_](https://github.com/Dash-Industry-Forum/dash.js/wiki) library. Dashjs handles much of the playback, and the strategy interacts with this to provide a consistent interface. No other dependencies are requried.

## Native Strategy

We have migrated TAL media player implementations into the Native Strategy, so that you can play media on devices that do not support Media Source Extensions without TAL. So far there is support for playback via:

- `HTML5`
- `CEHTML`
- `SAMSUNG_MAPLE`
- `SAMSUNG_STREAMING`
- `SAMSUNG_STREAMING_2015`

This requires additional config to select which media player implementation to use.

```javascript
window.bigscreenPlayer.mediaPlayer: 'html5'
```

You must also indicate the device's live playback capability. There's more info in [the documentation on live-streaming](https://bbc.github.io/bigscreen-player/api/tutorial-live-streaming.html)

```javascript
window.bigscreenPlayer.liveSupport = "seekable"
```

## Basic Strategy

This strategy is similar to native, in that it relies on the browser's media element to handle play back of the source provided. It is intended to be a lightweight wrapper around standard HTML5 media playback. It is media element event driven, and contains none of the workarounds (such as overrides and sentinels) that the native strategy does.
