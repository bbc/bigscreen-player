#  Subtitles

BigscreenPlayer aims to provide a consistent experience across all devices regardless of the underlying playback strategy and native functionality. The player can render subtitles with on-demand and live content. You can also customise the appearance of your subtitles using this library.

To achieve that consistent experience BigscreenPlayer cannot render subtitles as you would using f.ex. Dash.js. Some devices do not support text tracks natively, others do not present cues accurately ([more detail here](#why-not-include-subtitles-in-the-manifest)). For this reason you SHOULD NOT specify subtitles in your manifest. Instead you SHOULD provide subtitles to BigscreenPlayer separately to make use of the capabilities BigscreenPlayer provides.

##  Usage

You provide subtitles to BigscreenPlayer by setting `media.captions` in the `.init()` data:

1. `media.captions` MUST be an array containing at least one object.
2. Each object in the captions array MUST have a property `url`.
3. Each `url` SHOULD be a valid hyperlink to a subtitles resource.

Any subtitles resource you provide to BigscreenPlayer MUST be encoded with MIME type `application/ttml+xml` or `application/ttaf+xml`.

You SHOULD NOT provide your subtitles in the manifest.

There are different requirements for subtitles delivered _as a whole_ and subtitles delivered _as segments_:

###  As A Whole

Subtitles are delivered "as a whole" when the captions' `url` refers to a single file that contains all subtitles for the programme. For example:

```js
const captions = [
  { url: "https://some.cdn/subtitles.xml" },
  { url: "https://other.cdn/subtitles.xml" },
  /* ... */
];
```

Subtitles delivered as a whole do not require any additional metadata in the manifest to work.

### As Segments

Subtitles are delivered "as segments" when the captions' `url` is an URL template. An URL is considered a segment template when it contains a `$...$` block. For example:

```js
const captions = [
  { 
    url: "https://some.cdn/subtitles/$segment$.m4s",
    segmentLength: 3.84,
  },
  {
    url: "https://other.cdn/subtitles/$segment$.m4s",
    segmentLength: 3.84,
  },
  /* ... */
];
```

The segment number is calculated from the presentation timeline. You MUST ensure your subtitle segments are enumerated to match your media segments and you account for offsets such as:

1. The availability window (sliding, growing window)
2. The presentation time offset (static window)

The subtitles segment length MUST match the media's segment length.

###  Styling

You can style the subtitles by setting `media.subtitleCustomisation` in the `.init()` data. `media.subtitleCustomisation` should be a key-value object containing valid TTML or HTML styles. If you use the legacy subtitles renderer TTML styles may not be supported.

####  Styling: Example

```js
const subtitleCustomisation = { lineHeight: 1.5, size: 1 };

playbackData.media.subtitleCustomisation = subtitleCustomisation;

player.init(document.querySelector("video"), playbackData, /* other opts */);
```

##  Design

### Why not include subtitles in the manifest?

It is not recommended to include subtitles in the manifest(s) because the experience will not be consistent across devices. Timing models across devices are inconsistent. For example, there are devices where you cannot rely on the DOM media element to access the correct current time or seekable range (see Playable/Restartable/Seekable devices). Subtitles will be presented inaccurately when the current time is incorrect.

BigscreenPlayer mitigates inaccurate text tracks on devices using custom logic to present subtitles. Subtitles are in other words "side-cared". So you MUST provide subtitles in the `captions` block (if any), and SHOULD NOT include your in the manifest.

## Architecture

BigscreenPlayer's subtitles presentation interface is implemented by:

- IMSC Subtitles (default)
- Legacy Subtitles

If you suspect a device is struggling to display subtitles for performance reasons, you can try to use the legacy subtitles renderer instead by setting: `window.bigscreenPlayer.overrides.legacySubtitles = true`.

Live/segmented subtitles are not supported by the legacy subtitles renderer.
