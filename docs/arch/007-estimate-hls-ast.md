# 007 Estimate HLS Availability Start Time

Originally added: 2025-02-04

## Status

| Discussing | Approved | Superceded |
| ---------- | -------- | ---------- |
|            | x        |            |

## Context

BigscreenPlayer adds functions to convert between three timelines:

1. Presentation time: Output by the MediaElement
2. Media sample time: Timestamps encoded in the current media
3. Availablity time: UTC times that denote time available. Only relevant for dynamic streams.

BigscreenPlayer relies on metadata in the manifest to calculate each conversion.

For DASH:

- Presentation time <-> Media sample time relies on `presentationTimeOffset`
- Presentation time <-> Availability time relies on `availabilityStartTime`

For HLS:

- Presentation time <-> Media sample time relies on `programDateTime`
- Presentation time <-> Availability time relies on ???

HLS signals availability through the segment list. An HLS media player must refresh the segment list to track availability. Availability start time can be estimated as the difference between the current wallclock time and the duration of the stream so far. This estimate should also correct for any difference between the client and server's UTC wallclock time.

### Considered Options

1. Accept the conversion between availability and presentation time is broken for HLS streams.
2. Estimate availability start time for HLS streams. This requires clients provide the offset between the client and server's UTC wallclock time in order to synchronise the calculation.

## Decision

Chosen option: 1

## Consequences

The conversion between presentation time and availability start time is erroneous for HLS.
