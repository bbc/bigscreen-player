/**
 * Encapsulate Subtitles, Captions, Availability
 */
define('bigscreenplayer/subtitles/subtitles',
  [ ],
  // TODO: Needs captions, callbacks, DOM element, networking.
  function () {
    'use strict';
    return function (url, domElement, subtitleStateCallback) {
      var deviceControlledSubtitles = false;
      var userPreference = false;
      var deviceSubtitleState = false;
      var oipfcfg = document.getElementById('oipfcfg');
      var subtitlesEnabledCheck;

      if (oipfcfg) {
        if (oipfcfg.configuration.subtitlesEnabled !== undefined) {
          deviceControlledSubtitles = true;
          startObserver();
        }
      }

      function startObserver () {
        subtitlesEnabledCheck = setInterval(function () {
          deviceSubtitleState = oipfcfg.configuration.subtitlesEnabled;
          subtitleStateCallback(deviceSubtitleState);
        }, 250);
      }

      function stopObserver () {
        // Stop Observing.
        clearInterval(subtitlesEnabledCheck);
      }

      function state () {
        return deviceControlledSubtitles !== undefined ? deviceSubtitleState : userPreference;
      }

      function isDeviceControlled () {
        return deviceControlledSubtitles;
      }

      function toggleSubtitles () {
        if (!deviceControlledSubtitles) {
          userPreference = !userPreference;
        }
      }

      function available () {
        return url !== undefined;
      }

      function tearDown () {
        stopObserver();
        // remove from DOM, clean up objects.
      }

      return {
        enable: toggleSubtitles,
        disable: toggleSubtitles,
        enabled: state,
        available: available,
        isDeviceControlled: isDeviceControlled,
        tearDown: tearDown
      };
    };
  }
);
