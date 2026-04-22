## Installation

```bash
npm install bigscreen-player --save
```

## Get To Playback

For a start, let's play back an on-demand video.

To start a playback session you must minimally provide:

- Some configuration. See [Configuration](#configuration)
- A streaming manifest. See [Minimal Data](#minimal-data)
- A HTML element to render playback. See [Initialisation](#initialisation)

### Configuration

Configuration for bigscreen-player can be set using an object on the window:

```javascript
window.bigscreenPlayer
```

You must provide a _playback strategy_ to use BigscreenPlayer:

```javascript
window.bigscreenPlayer.playbackStrategy = "msestrategy" // OR 'nativestrategy' OR 'basicstrategy'
```

The `msestrategy` uses Dash.js under the hood. It is likely to be what you want. You should read [the documentation on playback strategies](https://bbc.github.io/bigscreen-player/api/tutorial-01-playback-strategies.html) if you want to use a native media player from your browser. You should also have a peek at the [documentation on settings and overrides](https://bbc.github.io/bigscreen-player/api/tutorial-02-settings-and-overrides.html)

### Minimal Data

You must provide a manifest and its MIME type.

```javascript
const minimalData = {
  media: {
    type: "application/dash+xml",
    urls: [{ url: "https://example.com/video.mpd" }],
  },
}
```

## Initialisation

A playback session can be initialised by simply calling the `init()` function with some initial data.

The player will render itself into a supplied parent element, and playback will begin as soon as enough data has buffered.

```javascript
import { BigscreenPlayer, MediaKinds, WindowTypes } from 'bigscreen-player'

// See Configuration
window.bigscreenPlayer.playbackStrategy

// See Minimal Data
const minimalData

const bigscreenPlayer = BigscreenPlayer()

const body = document.querySelector('body')

const playbackElement = document.createElement('div')
playbackElement.id = 'BigscreenPlayback'

body.appendChild(playbackElement)

bigscreenPlayer.init(playbackElement, minimalData)
```

## All Options

The full set of options for BigscreenPlayer is:

```javascript
const optionalData = {
  initialPlaybackTime: 0, // Time (in seconds) to begin playback from
  enableSubtitles: false,
  debug: {
    fragmentResponseHeaders: [], // video fragment response headers to output in the debug tool
  },
  media: {
    type: "application/dash+xml",
    kind: MediaKinds.VIDEO, // Can be VIDEO, or AUDIO
    urls: [
      // Multiple urls offer the ability to fail-over to another CDN if required
      {
        url: "https://example.com/video.mpd",
        cdn: "origin", // For Debug Tool reference
      },
      {
        url: "https://failover.example.com/video.mpd",
        cdn: "failover",
      },
    ],
    captions: [
      {
        url: "https://example.com/captions/$segment$", // $segment$ required for replacement for live subtitle segments
        segmentLength: 3.84, // Required to calculate live subtitle segment to fetch & live subtitle URL.
        cdn: "origin", // Displayed by Debug Tool
      },
      {
        url: "https://failover.example.com/captions/$segment$",
        segmentLength: 3.84,
        cdn: "failover",
      },
    ],
    captionsUrl: "https://example.com/imsc-doc.xml", // NB This parameter is being deprecated in favour of the captions array shown above.
    subtitlesRequestTimeout: 5000, // Optional override for the XHR timeout on sidecar loaded subtitles
    subtitleCustomisation: {
      size: 0.75,
      lineHeight: 1.1,
      fontFamily: "Arial",
      backgroundColour: "black", // (css colour, hex)
    },
    audioDescribed: [
      // Multiple urls offer the ability to fail-over to another CDN if required
      {
        url: "https://example.com/video.mpd",
        cdn: "origin", // For Debug Tool reference
      },
      {
        url: "https://failover.example.com/video.mpd",
        cdn: "failover",
      },
    ],
    playerSettings: {
      // See settings documentation for more details
      failoverResetTime: 60000,
      streaming: {
        buffer: {
          bufferToKeep: 8,
        },
      },
    },
  },
}
```
