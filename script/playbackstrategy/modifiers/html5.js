define(
  'bigscreenplayer/playbackstrategy/modifiers/html5',
  [],
  function () {
    'use strict';

    function generateMediaPlayer (idSuffix) {
      var mediaElement = document.createElement(idSuffix.toLowerCase(), 'mediaPlayer' + idSuffix);
      mediaElement.autoplay = false;
      mediaElement.style.position = 'absolute';
      mediaElement.style.top = '0px';
      mediaElement.style.left = '0px';
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';

      return mediaElement;
    }

    function generateSourceElement (url, mimeType) {
      var sourceElement = document.createElement('source');
      sourceElement.src = url;
      sourceElement.type = mimeType;
      return sourceElement;
    }

    function appendChildElement (to, el) {
      to.appendChild(el);
    }

    function prependChildElement (to, el) {
      if (to.childNodes.length > 0) {
        to.insertBefore(el, to.childNodes[0]);
      } else {
        to.appendChild(el);
      }
    }

    function removeElement (el) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }

    return function (idSuffix, sourceContainer, url, mimeType) {
      var mediaElement = generateMediaPlayer(idSuffix);
      prependChildElement(sourceContainer, mediaElement);
      var sourceElement = generateSourceElement(url, mimeType);
      mediaElement.preload = 'auto';
      appendChildElement(mediaElement, sourceElement);

      function tearDown () {
        if (mediaElement) {
          removeElement(sourceElement);
          mediaElement.removeAttribute('src');
          mediaElement.load();
          removeElement(mediaElement);

          mediaElement = null;
          sourceElement = null;
        }
      }

      return {
        tearDown: tearDown,
        isPaused: function () {
          return mediaElement.paused;
        },
        getCurrentTime: function () {
          return mediaElement ? mediaElement.currentTime : undefined;
        },
        setCurrentTime: function (value) {
          mediaElement.currentTime = value;
        },
        getDuration: function () {
          return mediaElement ? mediaElement.duration : undefined;
        },
        getSeekable: function () {
          return mediaElement.seekable;
        },
        pause: function () {
          mediaElement.pause();
        },
        play: function () {
          mediaElement.play();
        },
        getErrorCode: function () {
          return mediaElement.error.code;
        },
        addEventListener: function (type, listener, useCapture) {
          mediaElement.addEventListener(type, listener, useCapture);
        },
        removeEventListener: function (type, listener, useCapture) {
          if (mediaElement) {
            mediaElement.removeEventListener(type, listener, useCapture);
          }
        },
        load: function () {
          mediaElement.load();
        },
        onSourceError: function (callback) {
          sourceElement.addEventListener('error', callback, false);
        },
        removeSourceError: function (callback) {
          if (sourceElement) {
            sourceElement.removeEventListener('error', callback, false);
          }
        },
        getPlayerElement: function () {
          return mediaElement;
        }
      };
    };
  }
);
