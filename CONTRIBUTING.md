# Contributing

We welcome and encourage contributions. We are open minded to suggestions, encourage debate, and aim to build a consensus.

Unless an Issue or Pull Request can be resolved within 2 working days, we will raise an internal ticket for it on our backlog and note this on GitHub.

## Opening an Issue

For any queries, suggestions, or bug reports, please raise an issue.

## Opening a Pull Request

We will look at any and all contributions and aim to get everything adopted, even if we have to make changes to the contribution ourselves for it to be production ready. In the rare cases we cannot accept a contribution, we will explain why to the best of our abilities.

### Guidelines

Don't worry if you are unable to meet all these guidelines, even a rough idea contributed can be made production ready with time and effort.

- For any changes to the Bigscreen Player API or event model, please raise an issue first to discuss the implications and agree an approach
- Code style:
  - We prefer composition over inheritance
  - Modules return object creation factory functions or singleton objects
  - We prefer verbose, well named, readable code over terse code and comments
- Changes should be covered by unit tests
- Please include any appropriate documentation changes
- Please fill in the PR template as best you can

### Review, test, and release process

- CI runs linting and unit tests against all PRs, which must be passing for a PR to be merged
- Developer maintainers will code review and may request changes
- Once approved by a developer, test engineer maintainers will run manual tests on a range of connected TV devices appropriate for the changes made
  - Our test guidelines are documented [here](https://bbc.github.io/bigscreen-player/api/tutorial-Testing.html)
- CI will bump the npm version, tag in git, create a GitHub release and publish the new version to NPM

**Note:** Other BBC teams may wish to test and release their contributions themselves. In these cases, please reference your Jira ticket and add your test plan (in line with our [test guidelines](https://bbc.github.io/bigscreen-player/api/tutorial-Testing.html)) to the Pull Request for review.
