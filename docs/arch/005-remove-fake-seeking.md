# 005 Remove fake seeking from restartable strategy

Originally added: 2025-02-04

## Status

| Discussing | Approved | Superceded |
| ---------- | -------- | ---------- |
|            | x        |            |

## Context

Native media players with the capability to start playback in a livestream from any (available) point in the stream are called "restartable" in BigscreenPlayer's jargon. Unlike "seekable" devices, "restartable" devices don't support in-stream navigation. In other words, seeking is not supported.

BigscreenPlayer exploited this restart capability to implement "fake seeking" prior to v9.0.0. The restartable player effectively polyfilled the native media player's implementation of `MediaElement#currentTime` and `MediaElement#seekable`. This polyfill relied on the `windowType` metadata to make assumptions about the shape of the stream's seekable range. v9.0.0 deprecates `windowType`.

- Should we continue to support fake seeking for native playback?
- How might we continue to support fake seeking?

### Considered Options

1. Remove fake seeking from restartable strategy
2. Poll the HLS manifest for time shift
3. Provide a "magic" time shift buffer depth for HLS streams

## Decision

Chosen option: 1

The effort to contine support for fake seeking on restartable devices is not justified by the small number of people that benefit from the continued support.

## Consequences

Viewers that use devices on the restartable strategy will no longer be able to pause or seek in-stream.
