#  Subtitles

You cannot provide subtitles to BigscreenPlayer as you would using f.ex. Dash.js. This page explains how to provide subtitles, and why it is designed this way.

##  Usage

You provide your subtitles to BigscreenPlayer in `media.captions` of the data object calling `.init()`. `media.captions` is an array. Each object in the captions array __must__ have a property `url`: A valid hyperlink to a subtitles resource.

Any subtitles resource you provide to BigscreenPlayer __must__ be encoded with MIME type `application/ttml+xml` or `application/ttaf+xml`.

You __should not__ provide your subtitles in the manifest.

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

The segment number is calculated from the presentation timeline. You __must__ ensure your subtitle segments are enumerated to match your media segments and you account for offsets such as:

1. The availability window (sliding, growing window)
2. The presentation time offset (static window)

The subtitles segment length __must__ match the media's segment length.

##  Design

### Why not include subtitles in the manifest?

It is not recommended to include subtitles in the manifest(s) because the experience will not be consistent across devices. Timing models across devices are inconsistent. For example, there are devices where you cannot rely on the DOM media element to access the correct current time or seekable range (see Playable/Restartable/Seekable devices). Subtitles will be presented inaccurately when the current time is incorrect.

BigscreenPlayer mitigates inaccurate text tracks on devices using custom logic to present subtitles. Subtitles are in other words "side-cared". So you __must__ provide subtitles in the `captions` block (if any), and __should not__ include your in the manifest.

## Architecture

BigscreenPlayer's subtitles presentation interface is implemented by:

- IMSC Subtitles (default)
- Legacy Subtitles

If you suspect a device is struggling to display subtitles for performance reasons, you can try to use the legacy subtitles renderer instead by setting: `window.bigscreenPlayer.overrides.legacySubtitles = true`.
