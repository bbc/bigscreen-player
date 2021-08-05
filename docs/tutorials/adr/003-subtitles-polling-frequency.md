# 003 Subtitles Polling Frequency

Originally Added: April 7th, 2020

## Context

Subtitles in Bigscreen Player are updated by checking for the next available subtitle using a set timeout of 750ms. 
This number of 750ms was originally used with no record of why it was picked, and is also potentially too infrequent to keep the subtitles perfectly in sync with the audio and visual cues.
There was a piece of work done to increase the polling rate to 250ms, however we found that this caused some slower devices to buffer due to the increased load on the devices memory.

## Decision

We will continue to use 750ms as the polling frequency.

## Status

Accepted

## Consequences

* Synchronisation issues are negligible.
* It does not cause device performance to suffer.