<img src="https://user-images.githubusercontent.com/6772464/124460623-7f3d9d80-dd87-11eb-9833-456c9f20bab7.png" width="300" alt="Bigscreen Player logo"/>

[![Build Status](https://github.com/bbc/bigscreen-player/actions/workflows/pull-requests.yml/badge.svg)](https://github.com/bbc/bigscreen-player/actions/workflows/npm-publish.yml) [![npm](https://img.shields.io/npm/v/bigscreen-player)](https://www.npmjs.com/package/bigscreen-player) [![GitHub](https://img.shields.io/github/license/bbc/bigscreen-player)](https://github.com/bbc/bigscreen-player/blob/master/LICENSE)

> Simplified media playback for bigscreen devices.

## Introduction

_Bigscreen Player_ is an open source project developed by the BBC to simplify video and audio playback on a wide range of 'bigscreen' devices (TVs, set-top boxes, games consoles, and streaming devices).

For documentation on using this library, please see our [Getting Started guide](https://bbc.github.io/bigscreen-player/api/tutorial-Getting%20Started.html).

## Running Locally

Install dependencies:

```bash
$ npm install
```

You can run Bigscreen Player locally in a dev environment by running:

```bash
$ npm run start
```

This will open a web page at `localhost:8080`.

## Testing

The project is unit tested using [Jest](https://jestjs.io/). To run the tests:

```bash
$ npm test
```

This project currently has unit test coverage but no integration test suite. This is on our Roadmap to address.

## Releasing

1. Create a PR.
2. Label the PR with one of these labels; `semver prerelease`, `semver patch`, `semver minor` or `semver major`
3. Get a review from the core team.
4. If the PR checks are green. The core team can merge to master.
5. Automation takes care of the package versioning.
6. Publishing to NPM is handled with our [GitHub Actions CI integration](https://github.com/bbc/bigscreen-player/blob/master/.github/workflows/npm-publish.yml).

## Documentation

Bigscreen Player uses JSDocs to autogenerate API documentation. To regenerate the documentation run:

```bash
$ npm run docs
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

Bigscreen Player is available to everyone under the terms of the Apache 2.0 open source license. Take a look at the LICENSE file in the code for more information.
