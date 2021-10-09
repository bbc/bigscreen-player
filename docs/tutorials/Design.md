This document covers the basics of the `bigscreen-player` high level architecture. It describes an overview of the internal workings that is useful to understand in order to carry out development and possibly contribute to the code base.

Further setup code and specific examples can be found in the repo itself. A good place to start is the [README](https://github.com/bbc/bigscreen-player/blob/master/README.md).

## Dependencies
As it stands, the player relies on two dependencies:

#### [Dash.js](https://github.com/bbc/dash.js)
Our custom fork of the reference implementation of the ***dynamic adaptive streaming over http*** protocol. Used for MSE (Media Source Extension) capable devices. This is required in specifically by `bigscreen-player`, when the mse-strategy is used.

#### [imscJS](https://github.com/bbc/imscJS)
Our custom fork for rendering subtitles.

## Player Component
This stage provides a wrapper for the interaction with all of the individual strategies and is what `bigscreen-player` uses to interact with the video element, at its core.

### Strategies
A concept specific to `bigscreen-player` are the different types of strategies. There are four strategies:

- **Native**: A strategy that refactors some of the TAL media playback modifiers, now referred to as *native-modifiers*.
- **Hybrid**: Available to devices that support both types of playback (Native & MSE). Can be configured to optimise playback to use the best strategy for individual types of playback.
- **MSE (Media Source Extensions)**: Handles all of the interaction with the Dash.js dependency. Used for fully certified MSE devices.
- **Basic**: Traditional HTML5 media playback.

## Plugin Interface
This interface is designed to be used for updating statistics on certain events that are surfaced by the `bigscreen-player`. Any custom type of plugin can be registered that conforms to the plugin format. 

Please refer to the player [README](https://github.com/bbc/bigscreen-player/blob/master/README.md) for instructions and examples on creating, and registering a plugin.

## Debugging
During development, `bigscreen-player` offers a form of debugging with an on-screen debugger. Using this tool, specific events can be monitored to check successful execution of the program logic. This is particularly useful where no native JS consoles are accessible on certain devices.

### The Chronicle
The debug-tool latches on top of the `chronicle` which acts similarly to the plugin interface. It has a reference to all of the callbacks that need to be updated upon a debug event occurring. 

This could allow for a possible extension of the debugging interface *if* needed.

## Playback Spinner
Although the player itself doesn't handle UI interaction, the playback spinner element to be shown (when buffering) is generated within `bigscreen-player`. This creates a container, and then places an element of the specified CSS class within the container. This element can then be surfaced upwards to be placed on the UI by an application's UI handler.