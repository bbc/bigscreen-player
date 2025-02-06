# 004 Removing `windowType`; changing time representation

Originally added: 2025-02-03

## Status

| Discussing | Approved | Superceded |
| ---------- | -------- | ---------- |
|            | x        |            |

## Context

BigscreenPlayer supports DASH and HLS streaming. Each transfer format (aka streaming protocol) represents time in a stream in a different way. BigscreenPlayer normalised these times in versions prior to v9.0.0. This normalisation made multiple assumptions:

- The timestamp in the media samples are encoded as UTC times (in seconds) for "sliding window" content i.e. streams with time shift.
- Streams with time shift never use a presentation time offset.

What is more, metadata (i.e. the `windowType`) determined BigscreenPlayer's manifest parsing strategy from v7.1.0 and codified these assumptions.

- How might we overhaul our time representation to support streams that don't comply with these assumptions?

### Considered Options

1. Expose time reported by the `MediaElement` directly. Provide functions to convert the time from the `MediaElement` into availability and media sample time.
2. Do not apply time correction based on `timeShiftBufferDepth` if `windowType === WindowTypes.GROWING`
3. Do not apply time correction based on `timeShiftBufferDepth` if SegmentTemplates in the MPD have `presentationTimeOffset`

## Decision

Chosen option: 1

This approach provides a lot of flexibility to consumers of BigscreenPlayer. It also simplifies time-related calculations such as failover, start time, and subtitle synchronisation.

## Consequences

A major version (v9.0.0) to remove window type and overhaul BigscreenPlayer's internals.
