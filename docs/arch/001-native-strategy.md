# 001 Native Strategy

Originally Added: February 20th, 2019

## Context

- As it stands, `bigscreen-player` requires using the `tal` device object - when in `talstrategy` - to obtain a media player for playback
- Since the `tal` device media player exists as a singleton, applications using `talstrategy` can only access one active media element.
- Unlike `msestrategy`, `talstrategy` also requires loading in the extra dependency (`tal` device) - and is therefore limited by the limitations of the `tal` device.

## Decision

- A new strategy type - `nativestrategy` - has been created which pulls the media player out of `tal`
- This is a refactor of the `tal` device media player code which allows further manipulation and control i.e. multiple video playback

## Status

Approved

## Consequences

- Multiple active video instances can be controlled
  - Preloading of content on different media elements is more achievable
- The successful migration of all media player code from `tal` will create much greater modularity for `bigscreen-player` - therefore removing any limitations introduced by the current coupling with `tal`
