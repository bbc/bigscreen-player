#  004 Use Class

Originally added: 1 December, 2022.

##  Context

BigscreenPlayer would benefit from being more in-line with established Web APIs such as `EventTarget`. To acheive this it should first become a class, so we can extend f.ex. `EventTarget`. `EventTarget` specifically would deprecate all `onStateChange` and `onTimeChange` handlers, as well as the Plugin interface.

Implementing EventTarget would deprecate the current `onStateChange` and `onTimeChange` callbacks in favour of `addEventListener` as well as BSP plugins. We have had issues before with downstream consumers using these APIs in unexpected ways (see [BSP v5.6.1: Fix unregistered callbacks being called](https://github.com/bbc/bigscreen-player/releases/tag/5.6.1). Raw link: <https://github.com/bbc/bigscreen-player/releases/tag/5.6.1>).

##  Decision

Refactor BigscreenPlayer to use the `Class` JavaScript construct and syntax instead of `Function` syntax.

##  Status

Proposed.

##  Consequences

- Implementing BigscreenPlayer as a class makes it easier to implement Web APIs such as `EventTarget` to combat our tech debt. `EventTarget` specifically would deprecate all `onStateChange` and `onTimeChange` handlers, as well as the Plugin interface.

##  Further Reading

- [ADR Github Organisation](https://adr.github.io/). Raw link: <https://adr.github.io/>
- [MDN web docs on JavaScript Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes). Raw link: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes>
- [MDN web docs on EventTarget Web API](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget). Raw link: <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget>
