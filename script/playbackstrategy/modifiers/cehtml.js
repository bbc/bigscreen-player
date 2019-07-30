define(
  'bigscreenplayer/playbackstrategy/modifiers/html5',
  [],
  function () {
    'use strict';

    var STATE = {
      STOPPED: 0,
      PLAYING: 1,
      PAUSED: 2,
      CONNECTING: 3,
      BUFFERING: 4,
      FINISHED: 5,
      ERROR: 6
    };

    function generateMediaPlayer (mimeType) {
      var mediaElement = document.createElement('object', 'mediaPlayer');
      mediaElement.type = mimeType;
      mediaElement.style.position = 'absolute';
      mediaElement.style.top = '0px';
      mediaElement.style.left = '0px';
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';

      return mediaElement;
    }

    function addElementToDOM (mediaElement) {
      var body = document.getElementsByTagName('body')[0];
      body.insertBefore(mediaElement, body.firstChild);
    }

    function removeElement (el) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }

    return function (url, mimeType) {
      var mediaElement = generateMediaPlayer(mimeType);
      addElementToDOM(mediaElement);
      mediaElement.data = url;

      var updateInterval;
      var isPaused = false;

      function tearDown () {
        delete mediaElement.onPlayStateChange;
        removeElement(mediaElement);
        mediaElement = undefined;
      }

      return {
        tearDown: tearDown,
        isPaused: function () {
          return isPaused;
        },
        getCurrentTime: function () {
          return mediaElement ? mediaElement.playPosition / 1000 : undefined;
        },
        setCurrentTime: function (value) {
          mediaElement.seek(value * 1000);
        },
        getDuration: function () {
          return mediaElement ? mediaElement.playTime / 1000 : undefined;
        },
        pause: function () {
          isPaused = true;
          mediaElement.play(0);
        },
        play: function () {
          isPaused = false;
          mediaElement.play(1);
        },
        getErrorCode: function () {
          return mediaElement.error;
        },
        addCallbacks: function (callbacks) {
          var DEVICE_UPDATE_PERIOD_MS = 500;

          mediaElement.onPlayStateChange = function () {
            switch (mediaElement.playState) {
              case STATE.STOPPED:
                break;
              case STATE.PLAYING:
                callbacks.finishedBuffering();
                break;
              case STATE.PAUSED:
                break;
              case STATE.CONNECTING:
                break;
              case STATE.BUFFERING:
                callbacks.waiting();
                break;
              case STATE.FINISHED:
                callbacks.ended();
                break;
              case STATE.ERROR:
                callbacks.error();
                break;
              default:
                // do nothing
                break;
            }
          };

          updateInterval = setInterval(function () {
            callbacks.timeUpdate();
          }, DEVICE_UPDATE_PERIOD_MS);
        },
        removeCallbacks: function () {
          clearInterval(updateInterval);
        },
        load: function () {},
        getPlayerElement: function () {
          return mediaElement;
        }
      };
    };
  }
);
