# 006 Detect timeshift to enable auto-resume

Originally added: 2025-02-04

## Status

| Discussing | Approved | Superceded |
| ---------- | -------- | ---------- |
|            | x        |            |

## Context

BigscreenPlayer's auto-resume feature prevents undefined behaviour when native players resume playback outside the seekable range. Auto-resume consists of two mechanisms:

1. Playback is resumed before current time can drift outside of the seekable range
2. Pausing isn't possible when current time is close to the start of the seekable range

Auto-resume is only relevant for streams with time shift. The presence of time shift was signalled through the `windowType === WindowTypes.SLIDING` parameter prior to v9.0.0. v9.0.0 deprecates `windowType`.

DASH manifests explicitly encode the time shift of the stream through the `timeShiftBufferDepth`. On the other hand, time shift in HLS manifests is only detectable by refreshing the manifest.

- How might we detect timeshift and enable the auto-resume feature for DASH and HLS streams?

### Considered Options

1. Poll the HLS manifest to check if the first segment changes
2. Poll the seekable range for changes to the start of the seekable range
3. Provide a "magic" time shift buffer depth for HLS streams

## Decision

Chosen option: 2

## Consequences

The time it takes the `timeshiftdetector` to detect and signal timeshift depends on it's polling rate. Hence, there is a risk the user navigates outside of the seekable range in the span of time before the `timeshiftdetector` detects a sliding seekable range.
