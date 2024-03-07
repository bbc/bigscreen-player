BigscreenPlayer offers logging through "Chronicle", our own debugging solution. This tool can be used to monitor specific events and changes in metrics over time in order to validate execution of the program logic.

## On-Screen Debugging

We offer an on-screen debugger as part of our solution. This is particularly useful where no native JavaScript consoles are natively accessible on devices.

The on-screen debugger can be shown using:

```js
bigscreenPlayer.toggleDebug()
```

### Structured Logging

Logs in the Chronicle are _structured_. What is more, logs are captured even when the on-screen debugger isn't active. You can access the complete record of the playback session using:

```js
bigscreenPlayer.getDebugLogs()
```

You can find the full structure of the data returned by this function in the source file `chronicle.ts`. In short, `getDebugLogs` returns the Chronicle record as a flat array of entries. Each entry falls into one of three (3) categories:

1. Message: Unstructured string data. Think `console` output.
2. Metrics: Values that change over time, such as dropped frames.
3. Traces: Snapshots and one-of data, such as errors and events.
