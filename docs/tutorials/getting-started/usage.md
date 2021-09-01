## Configuration

Bigscreen Player has some global configuration that is needed before initialisation. A *playback strategy* must be configured:

```javascript
window.bigscreenPlayer.playbackStrategy = 'msestrategy' // OR 'nativestrategy' OR 'hybridstrategy' OR 'talstrategy' (deprecated)
```

See the [playback strategies](design/playback-strategies.md) wiki page for further details on these strategies.


## Initialisation

The player will render itself into a supplied parent element, and playback will begin as soon as enough data has buffered.


```javascript
// configure the media player that will be used before loading
// see below for further details of ths config

// options are: msestrategy, nativestrategy, hybridstrategy, talstrategy (deprecated)
window.bigscreenPlayer.playbackStrategy = 'msestrategy';

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
    mimeType: 'video/mp4', // Used by TAL
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

```

[← Prev - Installation](tutorial-installation.html)

[→ Next - Events](tutorial-events.html)