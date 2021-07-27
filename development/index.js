import BigscreenPlayer from '../src/bigscreenplayer'

window.bigscreenPlayer = { playbackStrategy: 'msestrategy'};
// Reminder - Add overrides as appropriate
// e.g overrides: {legacySubtitles: true}

  let playbackElement = document.createElement('div')

  playbackElement.style.position = 'absolute';
  playbackElement.style.height = '720px';
  playbackElement.style.width = '1280px';

  let windowType = 'staticWindow';
  let enableSubtitles = false;
  
  let minimalData = {
    initialPlaybackTime: 30,
    media: {
      captions: [],
      type: 'application/dash+xml',
      mimeType: 'video/mp4',
      kind: 'video',
      urls: [{
        // Content from DASH IF testing assests (used in their reference player)
        // https://reference.dashif.org/dash.js/v2.9.2/samples/dash-if-reference-player/index.htm
        url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
        cdn: 'dash.akamaized.net'
      }]
    }
  };

  // Useful for testing legacy subtitles implementation
  function setUpCaptionsContainerCSS() {
    var captionsContainer = document.getElementById('playerCaptionsContainer');
    if (captionsContainer) {
      captionsContainer.style.position = 'absolute';
      captionsContainer.style.top = '80%';
      captionsContainer.style.right = '50%';
    }
  }

  document.body.appendChild(playbackElement)
  let bigscreenPlayer = BigscreenPlayer();
  window._bigscreenPlayer = bigscreenPlayer;

  bigscreenPlayer.registerPlugin({onSubtitlesLoadError: function () {
    console.log('Loading subtitles failed...')
  }})

  bigscreenPlayer.registerPlugin({onSubtitlesRenderError: function () {
    console.log('Rendering subtitles failed...')
  }})

  bigscreenPlayer.registerPlugin({onSubtitlesTransformError: function () {
    console.log('Transforming subtitles failed...')
  }})

  bigscreenPlayer.init(playbackElement, minimalData, windowType, enableSubtitles,
    {
      onSuccess: function () {
        bigscreenPlayer.toggleDebug();
        setUpCaptionsContainerCSS();
      },
      onError: function () {
        bigscreenPlayer.toggleDebug();
        DebugTool.info('Initialisation failed.')
      }
  });
