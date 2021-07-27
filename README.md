# Bigscreen Player

[![Build Status](https://travis-ci.com/bbc/bigscreen-player.svg?branch=master)](https://travis-ci.com/bbc/bigscreen-player/branches)

> Simplified media playback for bigscreen devices.

## Introduction

The *Bigscreen Player* is an open source project developed by the BBC to simplify video and audio playback on a wide range of 'bigscreen' devices (TVs, set-top boxes, games consoles, and streaming devices).

## Documentation

Documentation on how to use this library can be found [here](https://bbc.github.io/bigscreen-player).

## Getting Started

`$ npm install`

## Testing

The project is fully unit tested using the [Jasmine](https://jasmine.github.io/) framework. To run the tests:

`$ npm run spec`

This project currently has unit test coverage but no integration test suite. This is on our Roadmap to address. Quality is ensured via extensive manual testing however.
## Releasing

1. Create a PR.
2. Label the PR with one of these labels: 
    - `semver prerelease` 
    - `semver patch`
    - `semver minor`
    - `semver major` 
  
    along with one of the following:
    - `has a user facing change`
    - `has no user facing changes`

    The labels-checker PR check will let you know if it is correct.
3. Get a review from the core team.
4. If the PR checks are green. The core team can merge to master.
5. Automation takes care of the package versioning.
6. Publishing to NPM is handled with our [Travis CI integration](https://github.com/bbc/bigscreen-player/blob/master/.travis.yml).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

The Bigscreen Player is available to everyone under the terms of the Apache 2.0 open source licence. Take a look at the LICENSE file in the code for more information.
