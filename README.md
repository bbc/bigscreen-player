# Bigscreen Player

[![Build Status](https://github.com/bbc/bigscreen-player/actions/workflows/pull-requests.yml/badge.svg)](https://github.com/bbc/bigscreen-player/actions/workflows/npm-publish.yml)

> Simplified media playback for bigscreen devices.

## Introduction

The *Bigscreen Player* is an open source project developed by the BBC to simplify video and audio playback on a wide range of 'bigscreen' devices (TVs, set-top boxes, games consoles, and streaming devices).

This project should be considered **Work in Progress**. A full roadmap will be released soon.

## Getting Started

`$ npm install`

### Initialisation

Bigscreen Player uses requirejs for managing dependencies. Once you have required the player, a playback session can be initialised by simply calling the `init()` function with some initial data.


The player will render itself into a supplied parent element, and playback will begin as soon as enough data has buffered.

```javascript
// configure the media player that will be used before loading
// see below for further details of ths config

// options are: msestrategy, nativestrategy, hybridstrategy
window.bigscreenPlayer.playbackStrategy = 'msestrategy';

require(
  [
    'bigscreenplayer/bigscreenplayer',
    'bigscreenplayer/windowtypes',
    'bigscreenplayer/mediakinds'
  ],

  function (BigscreenPlayer, WindowType, MediaKind) {

    var bigscreenPlayer = BigscreenPlayer();

    var playbackElement = document.createElement('div');
    playbackElement.id = 'BigscreenPlayback';

    var body = document.getElementByTagName('body')[0];
    body.appendChild(playbackElement);

    var minimalData = {
      media: {
        mimeType: 'video/mp4',
        urls: [
          {
            url: 'https://www.cdn1url.com/reallygoodvideo'
          }
        ]
      }
    }

    var optionalData = {
      initialPlaybackTime: 0, // Time (in seconds) to begin playback from
      media: {
        mimeType: 'video/mp4',
        bitrate: 8940,         // Displayed by Debug Tool
        captionsUrl: 'https://www.somelovelycaptionsurl.com/captions',
        codec: 'h264',
        kind: MediaKind.VIDEO, // Can be VIDEO, or AUDIO
        urls: [
          // Multiple urls offer the ability to fail-over to another CDN if required
          {
            url: 'https://www.cdn1url.com/reallygoodvideo',
            cdn: 'cdn1' // Displayed by Debug Tool
          }, {
            url: 'https://www.cdn2url.com/reallygoodvideo',
            cdn: 'cdn2'
          }
        ]
      }
    }

    // STATIC for VOD content, GROWING/SLIDING for LIVE content
    var windowType = WindowType.STATIC;
    var enableSubtitles = false;

    bigscreenPlayer.init(playbackElement, optionalData, windowType, enableSubtitles);
  }
)
```

### Configuration

The Bigscreen Player has some global configuration that is needed before initialisation. A *playback strategy* must be configured:

```javascript
window.bigscreenPlayer.playbackStrategy = 'msestrategy' // OR 'nativestrategy' OR 'hybridstrategy'
```

See the [configuration](https://github.com/bbc/bigscreen-player/wiki/Playback-Strategy) wiki page for further details on these strategies.

### Reacting to state changes

State changes which are emitted from the player can be acted upon to by registering a callback. The callback will receive all of the following state changes as the `state` property of the event:
- MediaState.STOPPED
- MediaState.PAUSED
- MediaState.PLAYING
- MediaState.WAITING
- MediaState.ENDED
- MediaState.FATAL_ERROR

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

### Reacting to time updates

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

### Reacting to subtitles being turned on/off

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

### Creating a plugin

Plugins can be created to extend the functionality of the Bigscreen Player by adhering to an interface which propagates non state change events from the player. For example, when an error is raised or cleared.

The full interface is as follows:
- onError
- onFatalError
- onErrorCleared
- onErrorHandled
- onBuffering
- onBufferingCleared
- onScreenCapabilityDetermined

An example plugin may look like:

```javascript
function ExamplePlugin (appName) {

  var name = appName;

  function onFatalError (evt) {
    console.log('A fatal error has occured in the app: ' + name);
  }

  function onErrorHandled (evt) {
    console.log('The ' + name + ' app is handling a playback error');
  }

  return {
    onFatalError: onFatalError,
    onErrorHandled: onErrorHandled
  };
}
```

```javascript
var bigscreenPlayer = BigscreenPlayer();

var examplePlugin = ExamplePlugin('myApp');

bigscreenPlayer.registerPlugin(examplePlugin);

// initialise bigscreenPlayer - see above

// you should unregister your plugins as part of your playback cleanup

// calling with no argument will unregister all plugins
bigscreenPlayer.unregisterPlugin(examplePlugin);

```

## Testing

The project is fully unit tested using the [Jasmine](https://jasmine.github.io/) framework. To run the tests:

`$ npm run spec`

This project currently has unit test coverage but no integration test suite. This is on our Roadmap to address. Quality is ensured via extensive manual testing however.

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
  
    along with one of the following:
    - `has a user facing change`
    - `has no user facing changes`

    The labels-checker PR check will let you know if it is correct.
3. Get a review from the core team.
4. If the PR checks are green. The core team can merge to master.
5. Automation takes care of the package versioning.
6. Publishing to NPM is handled with our [GitHub Actions CI integration](https://github.com/bbc/bigscreen-player/blob/master/.github/workflows/deploy-requests.yml).



## API Reference

The full api is documented [here](https://github.com/bbc/bigscreen-player/wiki/API-Reference).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

The Bigscreen Player is available to everyone under the terms of the Apache 2.0 open source license. Take a look at the LICENSE file in the code for more information.
