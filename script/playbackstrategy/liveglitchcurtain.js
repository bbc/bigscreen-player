define('bigscreenplayer/playbackstrategy/liveglitchcurtain',
  [
    'bigscreenplayer/playbackspinner',
    'bigscreenplayer/domhelpers'
  ],
  function (PlaybackSpinner, DOMHelpers) {
    return function (parentElement) {
      var curtain;
      var spinner = new PlaybackSpinner();

      curtain = document.createElement('div');

      curtain.id = 'liveGlitchCurtain';
      curtain.style.display = 'none';
      curtain.style.position = 'absolute';
      curtain.style.top = 0;
      curtain.style.left = 0;
      curtain.style.right = 0;
      curtain.style.bottom = 0;
      curtain.style.backgroundColor = '#3c3c3c';

      curtain.appendChild(spinner);

      return {
        showCurtain: function () {
          curtain.style.display = 'block';
          parentElement.appendChild(curtain);
        },

        hideCurtain: function () {
          curtain.style.display = 'none';
          DOMHelpers.safeRemoveElement(spinner);
        },

        tearDown: function () {
          DOMHelpers.safeRemoveElement(curtain);

          if (spinner) {
            spinner = undefined;
          }
        }
      };
    };
  }
);
