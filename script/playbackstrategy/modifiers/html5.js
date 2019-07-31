define(
  'bigscreenplayer/playbackstrategy/modifiers/html5',
  [],
  function () {
    'use strict';

    function generateMediaPlayer (tagName) {
      var mediaElement = document.createElement(tagName.toLowerCase(), 'mediaPlayer' + tagName);
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

    return function (url, mimeType, tagName, sourceContainer) {
      var mediaElement = generateMediaPlayer(tagName);
      prependChildElement(sourceContainer, mediaElement);
      var sourceElement = generateSourceElement(url, mimeType);
      mediaElement.preload = 'auto';
      appendChildElement(mediaElement, sourceElement);

      var callbacks;
      var isReadyToPlayFrom = false;

      function tearDown () {
        isReadyToPlayFrom = false;
        if (mediaElement) {
          removeElement(sourceElement);
          mediaElement.removeAttribute('src');
          mediaElement.load();
          removeElement(mediaElement);

          mediaElement = null;
          sourceElement = null;
        }
      }

      function finishedBuffering () {
        metadataLoaded();
        if (callbacks && callbacks.finishedBuffering) {
          callbacks.finishedBuffering();
        }
      }

      function metadataLoaded () {
        isReadyToPlayFrom = true;
        if (callbacks && callbacks.loadedMetadata) {
          callbacks.loadedMetadata();
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
        addCallbacks: function (newCallbacks) {
          callbacks = newCallbacks;
          mediaElement.addEventListener('canplay', finishedBuffering, false);
          mediaElement.addEventListener('seeked', finishedBuffering, false);
          mediaElement.addEventListener('playing', finishedBuffering, false);
          mediaElement.addEventListener('error', callbacks.error, false);
          mediaElement.addEventListener('ended', callbacks.ended, false);
          mediaElement.addEventListener('waiting', callbacks.waiting, false);
          mediaElement.addEventListener('timeupdate', callbacks.timeUpdate, false);
          mediaElement.addEventListener('loadedmetadata', metadataLoaded, false);
          mediaElement.addEventListener('pause', callbacks.pause, false);
          sourceElement.addEventListener('error', callbacks.sourceError, false);
        },
        removeCallbacks: function () {
          if (callbacks) {
            mediaElement.removeEventListener('canplay', finishedBuffering, false);
            mediaElement.removeEventListener('seeked', finishedBuffering, false);
            mediaElement.removeEventListener('playing', finishedBuffering, false);
            mediaElement.removeEventListener('error', callbacks.error, false);
            mediaElement.removeEventListener('ended', callbacks.ended, false);
            mediaElement.removeEventListener('waiting', callbacks.waiting, false);
            mediaElement.removeEventListener('timeupdate', callbacks.timeUpdate, false);
            mediaElement.removeEventListener('loadedmetadata', metadataLoaded, false);
            mediaElement.removeEventListener('pause', callbacks.pause, false);
            sourceElement.removeEventListener('error', callbacks.sourceError, false);
          }

          callbacks = undefined;
        },
        load: function () {
          mediaElement.load();
        },
        getPlayerElement: function () {
          return mediaElement;
        },
        isReadyToPlayFrom: function () {
          return isReadyToPlayFrom;
        }
      };
    };
  }
);
