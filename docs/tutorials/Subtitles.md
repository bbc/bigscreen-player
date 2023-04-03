#  Subtitles

TL;DR

##  Usage

You provide your subtitles to BigscreenPlayer in `media.captions` of the data object calling `.init()`. `media.captions` is an array. Each object in the captions array __must__ have a property `url`: A valid hyperlink to a subtitles resource.

Any subtitles resource you provide to BigscreenPlayer must be encoded with MIME type `application/ttml+xml` or `application/ttaf+xml`.

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

Subtitles are delivered "as segments" when the captions' `url` is an URL template. An URL is considered a segment template when it ends with a `$...$` block. For example:

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

The segment number is calculated from the presentation timeline. You must your subtitle segments are enumerated to match your media segments and you account for offsets such as:

1. The availability window (sliding, growing window)
2. The presentation time offset (static window)

The subtitles segment length __must__ match the media's segment length.

##  Design

- Why do we sidecar subtitles?

## Architecture

![An architecture diagram of the logic to render legacy subtitles.](subtitles.drawio.svg)
