> This tutorial assumes you have read [Getting Started](https://bbc.github.io/bigscreen-player/api/tutorial-00-getting-started.html)
>

## Live Playback Capability

You must define the device's live playback capability. This describes the capabilities of the device's seekable range.

```javascript
window.bigscreenPlayer.liveSupport: 'playable' // default
```

LiveSupport can be one of:

- `none`
- `playable`
- `restartable`
- `seekable`

## Requirements for DASH

The MPD must define an availability start time.

### DASH Timing Element

A `<UTCTiming>` element must be in the DASH manifest in order to play live content (simul/webcast). The `<UTCTiming>` element's `value` attribute must be an URL to a timing server that returns a valid ISO date.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MPD>
  <UTCTiming value="https://time.some-cdn.com/?iso" />
  <Period>
    ...
  </Period>
</MPD>
```
