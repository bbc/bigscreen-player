define('bigscreenplayer/subtitles/subtitles',
  [
    'bigscreenplayer/subtitles/' + (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles ? 'legacysubtitles' : 'imscsubtitles')
  ],
  function (SubtitlesContainer) {
    'use strict';
    return function (mediaPlayer, captions, autoStart, playbackElement, defaultStyleOpts, windowStartTime) {
      var subtitlesEnabled = autoStart;
      var liveSubtitles = captions.segmentLength;
      var subtitlesContainer = SubtitlesContainer(mediaPlayer, captions, autoStart, playbackElement, defaultStyleOpts, windowStartTime);

      function enable () {
        subtitlesEnabled = true;
      }

      function disable () {
        subtitlesEnabled = false;
      }

      function show () {
        if (available() && enabled()) {
          subtitlesContainer.start();
        }
      }

      function hide () {
        if (available()) {
          subtitlesContainer.stop();
        }
      }

      function enabled () {
        return subtitlesEnabled;
      }

      function available () {
        if (liveSubtitles && (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles)) {
          return false;
        } else {
          return !!captions.captionsUrl;
        }
      }

      function setPosition (position) {
        subtitlesContainer.updatePosition(position);
      }

      function customise (styleOpts) {
        subtitlesContainer.customise(styleOpts, subtitlesEnabled);
      }

      function renderExample (exampleXmlString, styleOpts, safePosition) {
        subtitlesContainer.renderExample(exampleXmlString, styleOpts, safePosition);
      }

      function clearExample () {
        subtitlesContainer.clearExample();
      }

      function tearDown () {
        subtitlesContainer.tearDown();
      }

      return {
        enable: enable,
        disable: disable,
        show: show,
        hide: hide,
        enabled: enabled,
        available: available,
        setPosition: setPosition,
        customise: customise,
        renderExample: renderExample,
        clearExample: clearExample,
        tearDown: tearDown
      };
    };
  }
);
