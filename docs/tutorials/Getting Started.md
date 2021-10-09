# Installation
```bash
$ npm install bigscreen-player --save
```

# Configuration

Bigscreen Player has some global configuration that is needed before initialisation. A *playback strategy* must be configured:

```javascript
window.bigscreenPlayer.playbackStrategy = 'msestrategy' // OR 'nativestrategy' OR 'hybridstrategy' OR 'talstrategy' (deprecated)
```

See the [playback strategies](Playback Strategies.md) wiki page for further details on these strategies.


# Initialisation

A playback session can be initialised by simply calling the `init()` function with some initial data.

The player will render itself into a supplied parent element, and playback will begin as soon as enough data has buffered.


```javascript
import { BigscreenPlayer, MediaKinds, WindowTypes } from 'bigscreen-player'

// configure the media player that will be used before loading
// see below for further details of ths config

// options are: msestrategy, nativestrategy, hybridstrategy
window.bigscreenPlayer.playbackStrategy = 'msestrategy'

const bigscreenPlayer = BigscreenPlayer()
const playbackElement = document.createElement('div')
const body = document.getElementByTagName('body')[0]

playbackElement.id = 'BigscreenPlayback'
body.appendChild(playbackElement)

const minimalData = {
  media: {
    type: 'application/dash+xml',
    urls: [
      {
        url: 'https://example.com/video.mpd'
      }
    ]
  }
}

const optionalData = {
  initialPlaybackTime: 0, // Time (in seconds) to begin playback from
  media: {
    type: 'application/dash+xml',
    kind: MediaKinds.VIDEO, // Can be VIDEO, or AUDIO
    urls: [
      // Multiple urls offer the ability to fail-over to another CDN if required
      {
        url: 'https://example.com/video.mpd',
        cdn: 'origin' // For Debug Tool reference
      }, {
        url: 'https://failover.example.com/video.mpd',
        cdn: 'failover'
      }
    ],
    captions: [{
      url: 'https://example.com/captions/$segment$', // $segment$ required for replacement for live subtitle segments
      segmentLength: 3.84, // Required to calculate live subtitle segment to fetch & live subtitle URL.
      cdn: 'origin' // Displayed by Debug Tool
    }, {
      url: 'https://failover.example.com/captions/$segment$',
      segmentLength: 3.84,
      cdn: 'failover'
    }
    ],
    captionsUrl: 'https://example.com/imsc-doc.xml', // NB This parameter is being deprecated in favour of the captions array shown above.
    subtitlesRequestTimeout: 5000, // Optional override for the XHR timeout on sidecar loaded subtitles
    subtitleCustomisation: {
      size: 0.75,
      lineHeight: 1.10,
      fontFamily: 'Arial',
      backgroundColour: 'black' // (css colour, hex)
    },
    playerSettings: { // This currently can be used to customise settings for the msestrategy. It is a pass through of all the dash.js player settings.
      failoverSort: failoverSort, // Post failover custom sorting algorithm
      failoverResetTime: 60000,
      streaming: {
        bufferToKeep: 8
      }
    }
  }
}

// STATIC for VOD content, GROWING/SLIDING for LIVE content
const windowType = WindowTypes.STATIC
const enableSubtitles = false

bigscreenPlayer.init(playbackElement, optionalData, windowType, enableSubtitles)
```

[→ Next - Events](tutorial-events.html)

