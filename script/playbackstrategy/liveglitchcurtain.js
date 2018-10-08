define('bigscreenplayer/playbackstrategy/liveglitchcurtain',
  [
    'bigscreenplayer/playbackspinner'
  ],
  function (PlaybackSpinner) {
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
          curtain.removeChild(spinner);
        },

        tearDown: function () {
          if (curtain) {
            parentElement.removeChild(curtain);
          }

          if (spinner) {
            spinner = undefined;
          }
        }
      };
    };
  }
);
