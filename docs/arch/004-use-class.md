#  004 Use Class

Originally added: 1 December, 2022.

##  Context

BigscreenPlayer would benefit from being more in-line with established Web APIs such as `EventTarget`. To acheive this it should first become a class, so we can extend f.ex. `EventTarget`. `EventTarget` specifically would deprecate all `onStateChange` and `onTimeChange` handlers, as well as the Plugin interface.

##  Decision

TBD.

##  Status

Proposed.

##  Consequences

- Implementing BigscreenPlayer as a class makes it easier to implement Web APIs such as `EventTarget` to combat our tech debt. `EventTarget` specifically would deprecate all `onStateChange` and `onTimeChange` handlers, as well as the Plugin interface.
- `BREAKING CHANGE!` All downstream libraries that directly consume BSP must update to instantiate BSP as a class (`BigscreenPlayer().init()` -> `new BigscreenPlayer()`).

##  Further Reading

- [MDN web docs on JavaScript Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes). Raw link: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes>
- [MDN web docs on EventTarget Web API](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget). Raw link: <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget>
