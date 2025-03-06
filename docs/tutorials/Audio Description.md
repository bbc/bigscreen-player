BigscreenPlayer provides Audio Description (AD) support for accessible media playback. This document details the two implementations.

## Implementations

BigscreenPlayer uses two distinct methods for handling AD: a generic approach and an MSE-specific approach.

### 1. Generic Audio Description (MediaSources)

The `MediaSources` module manages AD by accepting separate sources for audio description tracks. This method is used when AD is provided as a distinct media resource.

- **Separate Source Management:**
  - `MediaSources` accepts a separate `media.audioDescribed` source, containing URLs and CDNs, distinct from the main media source.
  - Failover for AD sources occurs **independently** within this provided source.
- **Manifest Switching:**
  - Enabling or disabling AD triggers the loading of a new manifest from the appropriate URL within the provided AD source.
  - This effectively switches between the main and AD audio streams.

### 2. MSE Strategy-Specific Audio Description (MSEStrategy)

The `MSEStrategy` strategy implementation manages AD within the same media stream.

- **Track Selection:**
  - AD tracks are identified within the DASH manifest by their roles and accessibility schemes.
  - Currently, a track is identified as AD if it matches the `Broadcast mix AD` descriptor values. These values are:
    - Role `value` of `alternate`
    - Accessibility `schemeIdUri` of `urn:tva:metadata:cs:AudioPurposeCS:2007` and `value` of `1`.
  - These values are defined in [ETSI TS 103 285 V1.1.1 Technical Specification](https://www.etsi.org/deliver/etsi_ts/103200_103299/103285/01.01.01_60/ts_103285v010101p.pdf#%5B%7B%22num%22%3A59%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22FitH%22%7D%2C392%5D)

## Developer API

Audio Described functionality can be interacted with through BigScreenPlayers API, which exposes the following functions:

- **`isAudioDescribedAvailable()`:**
  - Checks if AD tracks are available.
  - If the generic implementation (MediaSources) provides AD, **this takes priority**.
- **`isAudioDescribedEnabled()`:**
  - Checks if an AD track/source is currently active.
- **`setAudioDescribed(enable)`:**
  - Enables or disables AD.
  - Example:
    ```javascript
    bigScreenPlayer.setAudioDescribed(true)
    ```

## Priority

If there are separate audioDescribed media sources provided, it will take priority over the MSE specific implementation.
