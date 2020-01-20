require ('', ['bigscreenplayer/bigscreenplayer'], function(BigscreenPlayer){
  window.bigscreenPlayer = { playbackStrategy: 'msestrategy'};
  
  let playbackElement = document.createElement('div')
  let windowType = 'staticWindow';
  let enableSubtitles = false;
  
  let minimalData = {
      media: {
        mimeType: 'video/mp4',
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
  
  document.body.appendChild(playbackElement)
  BigscreenPlayer.init(playbackElement, minimalData, windowType, enableSubtitles);
})
