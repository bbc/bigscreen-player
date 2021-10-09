<img src="https://user-images.githubusercontent.com/6772464/124460623-7f3d9d80-dd87-11eb-9833-456c9f20bab7.png" width="300" alt="Bigscreen Player logo"/>   

[![Build Status](https://github.com/bbc/bigscreen-player/actions/workflows/pull-requests.yml/badge.svg)](https://github.com/bbc/bigscreen-player/actions/workflows/npm-publish.yml) [![npm](https://img.shields.io/npm/v/bigscreen-player)](https://www.npmjs.com/package/bigscreen-player) [![GitHub](https://img.shields.io/github/license/bbc/bigscreen-player)](https://github.com/bbc/bigscreen-player/blob/master/LICENSE)

> Simplified media playback for bigscreen devices.

## Introduction

*Bigscreen Player* is an open source project developed by the BBC to simplify video and audio playback on a wide range of 'bigscreen' devices (TVs, set-top boxes, games consoles, and streaming devices).

For documentation on how to use this library, please see [here](https://bbc.github.io/bigscreen-player/api).

## Running Locally

Install dependencies:
```
$ npm install
### Initialisation

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

### Configuration

Bigscreen Player has some global configuration that is needed before initialisation. A *playback strategy* may be configured, or defaulted to the native Html5 strategy:

```javascript
window.bigscreenPlayer.playbackStrategy = 'msestrategy' // OR 'nativestrategy' OR 'hybridstrategy'
```

See the [configuration](https://github.com/bbc/bigscreen-player/wiki/Playback-Strategy) wiki page for further details on these strategies.

### Reacting to state changes

State changes which are emitted from the player can be acted upon to by registering a callback. The callback will receive all of the following state changes as the `state` property of the event:
- `MediaState.STOPPED`
- `MediaState.PAUSED`
- `MediaState.PLAYING`
- `MediaState.WAITING`
- `MediaState.ENDED`
- `MediaState.FATAL_ERROR`

State changes may be registered for before initialisation and will automatically be cleared upon `tearDown()` of the player.

```javascript
const bigscreenPlayer = BigscreenPlayer()

// The token is only required in the case where the function is anonymous, a reference to the function can be stored and used to unregister otherwise.
var stateChangeToken = bigscreenPlayer.registerForStateChanges(function (event) {
  if(event.state == MediaState.PLAYING) {
    console.log('Playing')
    // handle playing event
  }
})

bigscreenPlayer.unregisterForStateChanges(stateChangeToken)
```

You can run Bigscreen Player locally in a dev environment by running:
```
$ npm run start
```

This will open a web page at `localhost:8080`.

## Documentation

Bigscreen Player uses JSDocs to autogenerate API documentation. To regenerate the documentation run:
```
$ npm run docs:jsdoc
```

## Testing

The project is unit tested using [Jest](https://jestjs.io/). To run the tests:

`$ npm test`

This project currently has unit test coverage but no integration test suite. This is on our Roadmap to address.

### Mocking media playback

When writing tests for your application it may be useful to use the mocking functions provided. This creates a fake player with mocking hook functions to simulate real world scenarios.

See [here](https://github.com/bbc/bigscreen-player/wiki/Mocking-Bigscreen-Player) for example usage.

## Releasing

1. Create a PR.
2. Label the PR with one of these labels: 
    - `semver prerelease` 
    - `semver patch`
    - `semver minor`
    - `semver major`

3. Get a review from the core team.
4. If the PR checks are green. The core team can merge to master.
5. Automation takes care of the package versioning.
6. Publishing to NPM is handled with our [GitHub Actions CI integration](https://github.com/bbc/bigscreen-player/blob/master/.github/workflows/npm-publish.yml).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

Bigscreen Player is available to everyone under the terms of the Apache 2.0 open source license. Take a look at the LICENSE file in the code for more information.
