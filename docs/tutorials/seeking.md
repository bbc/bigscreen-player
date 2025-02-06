A seek is initiated by `BigscreenPlayer#setCurrentTime()`. It can take a number or a number and a timeline. Each timeline is defined in the `Timeline` enum.

BigscreenPlayer will signal a seek is in progress through the `isSeeking` property on the `WAITING` state change.

## Presentation time

The time output by the `MediaElement`. The zero point is determined by the stream and transfer format (aka streaming protocol). For example, for HLS `0` always refers to the start of the first segment in the stream on first load.

Presentation time is output by `BigscreenPlayer#getCurrentTime()` and `BigscreenPlayer#getSeekableRange()`. The value provided to `setCurrentTime()` and `initialPlaybackTime` is treated as presentation time by default.

## Media sample time

The timestamps encoded in the media sample(s).

For DASH the conversion between media sample time and presentation time relies on the `presentationTimeOffset` and `timescale` defined in the MPD. BigscreenPlayer assumes the presentation time offset (in seconds) works out as the same value for all representations in the MPD.

For HLS the conversion between media sample time and presentation time relies on the `programDateTime` defined in the playlist. BigscreenPlayer assumes the `programDateTime` is associated with the first segment in the playlist.

## Availability time

The UTC time denoting the availability of the media. Only applies to dynamic streams.

For DASH the conversion between availability time and presentation time relies on the `availabilityStartTime`. BigscreenPlayer assumes the stream doesn't define any `availabilityOffset`.

For HLS the conversion is erroneous, and relies on `programDateTime`. See decision record `007-estimate-hls-ast`.
