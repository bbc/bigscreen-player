As part of the configuration of Bigscreen Player, a 'playback strategy' should be provided.

There are four options available:
* `msestrategy`
* `nativestrategy`
* `hybridstrategy`
* `basicstrategy`

Your app should write this globally to the window before initialising Bigscreen Player. This enables only the required media player code to be loaded. For example, if MSE playback is not needed, the *dashjs* library does not have to be loaded.

```javascript
window.bigscreenPayer.playbackStrategy = 'msestrategy' // OR 'nativestrategy' OR 'hybridstrategy' OR 'basicstategy'
```

The player will require in the correct strategy file at runtime.

## MSE Strategy

The MSE strategy utilises the open source [*dashjs*](https://github.com/Dash-Industry-Forum/dash.js/wiki) library. Dashjs handles much of the playback, and the strategy interacts with this to provide a consistent interface. No other dependencies are requried.

## Native Strategy

We have migrated TAL media player implementations into the Native Strategy, so that you can play media on devices that do not support Media Source Extensions without TAL. So far there is support for playback via:
- `HTHML5`
- `CEHTML`
- `SAMSUNG_MAPLE`
- `SAMSUNG_STREAMING`
- `SAMSUNG_STREAMING_2015`

This requires additional config, to select which implementation to use and indicate the device's live playback capability:
```javascript
window.bigscreenPlayer.liveSupport: 'seekable', // OR 'none' OR 'playable' OR 'restartable'; defaults to 'playable'
window.bigscreenPlayer.mediaPlayer: 'html5' // OR 'cehtml'; defaults to 'html5'
```

## Hybrid Strategy

In some circumstances, you may wish to use both the MSE and Native strategies. For example, using MSE for Video on Demand and Native for Live Video. In our experience, we have found this helpful for targeting certain devices that are unable to play growing or static window type content using MSE.

When using hybrid, the strategy is chosen at the point of playback. It defaults to the *msestrategy* and will switch to *nativestrategy* if an exception is configured.

### Configuring Exceptions

The Native strategy can be reverted to on a hybrid device by adding exceptions based on the media's window type (STATIC, SLIDING, GROWING) and whether the content is UHD.

The following example would use MSE playback for STATIC and GROWING window types, and Native playback for UHD and SLIDING window content.

```javascript
window.bigscreenPlayer.playbackStrategy = 'hybridstrategy';
window.bigscreenPlayer.mseExceptions = ['uhd', 'slidingWindow'];
```

## Basic Strategy

This strategy is similar to native, in that it relies on the browser's media element to handle play back of the source provided. It is intended to be a lightweight wrapper around standard HTML5 media playback. It is media element event driven, and contains none of the workarounds (such as overrides and sentinels) that the native strategy does.