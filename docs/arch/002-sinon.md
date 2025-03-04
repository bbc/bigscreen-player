# 002 Use of Sinon for unit testing

Update: Depricated, we no longer use sinon, see future ADRs
Originally Added: April 30th, 2019

## Context

With the addition of manifest loading into `bigscreen-player`, there is a need to stub out network requests with specific responses for unit testing.

It is possible, using a combination of parametrised Squire mocks and multiple asynchronous functions, to achieve this with jasmine.

However, when loading HLS manifests, multiple chained calls to loadUrl are needed within one test (in order to get the final playlist following the loading of the master playlist). This is difficult to achieve with jasmine, but can be simply handled with sinon.

## Decision

We will pull sinon. This is only a dev dependency.

## Status

Accepted

## Consequences

- Using sinon makes it simpler to provide custom responses to network requests.
- Another third party library is now pulled into bigscreen-player as a dev dependency.

## Further Reading

See <https://sinonjs.org/> for more information
