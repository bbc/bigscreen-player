window.bigscreenPlayer = { playbackStrategy: 'msestrategy'};

require (['bigscreenplayer/bigscreenplayer'], function(BigscreenPlayer){  
  let playbackElement = document.createElement('div')
  let windowType = 'staticWindow';
  let enableSubtitles = true;
  
  let minimalData = {
    media: {
        captionsUrl: 'https://vod-sub-uk-live.bbcfmt.s.llnwi.net/iplayer/subtitles/ng/modav/bUnknown-c1553d9d-e8b0-4e2e-87e0-f97f00481bb7_p05v9vv2_cUnknown_1604505734224.xml?s=1605597995&e=1605641195&h=da6aff796e8992abc1610fab81109f33',
        type: 'application/dash+xml',
        mimeType: 'video/mp4',
        kind: 'video',
        urls: [
          {
            // Content from DASH IF testing assests (used in their reference player)
            // https://reference.dashif.org/dash.js/v2.9.2/samples/dash-if-reference-player/index.htm
            url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
            cdn: 'dash.akamaized.net'
          }
        ]
      }
    };

  function setUpCaptionsContainerCSS() {
    var captionsContainer = document.getElementById('playerCaptionsContainer');
    captionsContainer.style.position = 'absolute';
    captionsContainer.style.top = '80%';
    captionsContainer.style.right = '50%';
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
})
