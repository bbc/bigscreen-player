// 'bigscreenplayer/subtitles/' + (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles ? 'legacysubtitles' : 'imscsubtitles')

// import IMSCSubtitles from './imscsubtitles';

export default function (mediaPlayer, autoStart, playbackElement, defaultStyleOpts, mediaSources) {
  var subtitlesEnabled = autoStart;
  var liveSubtitles = !!mediaSources.currentSubtitlesSegmentLength();
  var subtitlesContainer;
  // TODO: dynamic import legacy/current subtitles

  var useLegacySubs = window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles || false;

// Shall we invert this now?

  if (useLegacySubs) {
    import('./legacysubtitles.js').then(({default: LegacySubtitles}) => {
      subtitlesContainer = LegacySubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts);
      subtitlesContainer.start();
    });
  } else {
    import('./imscsubtitles.js').then(({default: IMSCSubtitles}) => {
      subtitlesContainer = IMSCSubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts);
      subtitlesContainer.start();
    });
  }


  // subtitlesContainer = IMSCSubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts);

  // subtitlesContainerLegacy.start();


  // import('./imscsubtitles.js').then(({default: IMSCSubtitles}) => {
  //   imscSubs = IMSCSubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts);
  //   imscSubs.start();
  // });

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
      return !!mediaSources.currentSubtitlesSource();
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
}
