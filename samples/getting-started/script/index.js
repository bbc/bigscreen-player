define([
  'bigscreenplayer/bigscreenplayer',
  'bigscreenplayer/models/windowtypes',
  'bigscreenplayer/debugger/debugtool'
],
  function (BigscreenPlayer, WindowTypes, DebugTool) {
    var playbackElement = document.getElementById('videoContainer');
    var playButton = document.getElementById('playButton');
    var pauseButton = document.getElementById('pauseButton');
    var seekForwardButton = document.getElementById('forwardButton');
    var seekBackButton = document.getElementById('backButton');
    var seekToEndButton = document.getElementById('seekEndButton');
    var toggleDebugTool = document.getElementById('toggleDebugToolButton');
    var timeLabel = document.getElementById('timeLabel');
    var latestState = document.getElementById('latestState');

    function setupControls () {
      playButton.addEventListener('click', function () {
        bigscreenPlayer.play();
      });

      pauseButton.addEventListener('click', function () {
        bigscreenPlayer.pause();
      });

      seekForwardButton.addEventListener('click', function () {
        bigscreenPlayer.setCurrentTime(bigscreenPlayer.getCurrentTime() + 10);
      });

      seekBackButton.addEventListener('click', function () {
        bigscreenPlayer.setCurrentTime(bigscreenPlayer.getCurrentTime() - 10);
      });

      seekToEndButton.addEventListener('click', function () {
        bigscreenPlayer.setCurrentTime(bigscreenPlayer.getDuration() - 10);
      });

      toggleDebugTool.addEventListener('click', function () {
        DebugTool.toggleVisibility();
      });

      bigscreenPlayer.registerForTimeUpdates(function (event) {
        timeLabel.innerText = 'Current Time: ' + event.currentTime;
      });

      bigscreenPlayer.registerForStateChanges(function (event) {
        var state = 'EMPTY';
        switch (event.state) {
          case 0: state = 'STOPPED'; break;
          case 1: state = 'PAUSED'; break;
          case 2: state = 'PLAYING'; break;
          case 4: state = 'WAITING'; break;
          case 5: state = 'ENDED'; break;
          case 6: state = 'FATAL_ERROR'; break;
        }
        latestState.innerText = 'Latest State: ' + state;
      });
    }

    var bigscreenPlayer = BigscreenPlayer();

    setupControls();

    var minimalData = {
      media: {
        mimeType: 'video/mp4',
        urls: [
          {
            url: 'http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-events.mpd'
          }
        ]
      }
    };

    var windowType = WindowTypes.STATIC;
    var liveSupport = 'seekable';
    var enableSubtitles = false;

    bigscreenPlayer.init(playbackElement, minimalData, windowType, enableSubtitles, liveSupport);
  }
);
