define(
  'bigscreenplayer/playbackstrategy/modifiers/live/none',
  [],
  function () {
    return function () {
      throw new Error('Cannot create a none live support player');
    };
  }
);
