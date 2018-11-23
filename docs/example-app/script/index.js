define([
  'bigscreenplayer/bigscreenplayer',
  'bigscreenplayer/models/windowtypes',
  'bigscreenplayer/debugger/debugtool',
  'bigscreenplayer/playbackspinner'
],
  function (BigscreenPlayer, WindowTypes, DebugTool, PlaybackSpinner) {

    var playbackElement = document.getElementById('videoContainer');
    var controlsElement = document.getElementById('bsp_controls');
    var playButton = document.getElementById('playButton');
    var pauseButton = document.getElementById('pauseButton');
    var seekForwardButton = document.getElementById('forwardButton');
    var seekBackButton = document.getElementById('backButton');
    var seekToEndButton = document.getElementById('seekEndButton');
    var debugToolButton = document.getElementById('toggleDebugToolButton');
    var controlsTimeout;

    // Get slider references
    var flSlider = document.getElementById('frontLeftSlider');
    var frSlider = document.getElementById('frontRightSlider');
    var fcSlider = document.getElementById('frontCenterSlider');
    var rlSlider = document.getElementById('rearLeftSlider');
    var rrSlider = document.getElementById('rearRightSlider');
    var lfeSlider = document.getElementById('lfeSlider');

    // Create playback spinner
    var playbackSpinner = new PlaybackSpinner();

    // Set controls to invisible initially
    controlsElement.style.display = "none";

    // Toggle on screen playback controls
    function toggleControls() {
      controlsElement.style.display = controlsElement.style.display == "none" ? "block" : "none";
      if(controlsElement.style.display === "block") {
        playButton.focus();
      }
    }

    // Timeout feature for controls
    function startControlsTimeOut() {

      clearTimeout(controlsTimeout);

      if(controlsElement.style.display === "block") {
        controlsTimeout = setTimeout(function () {
          toggleControls();
        }, 5000);
      } else {
        toggleControls();
      }
    }

    // Create event listeners 
    function setupControls () {

      window.addEventListener('keydown', function() {
        startControlsTimeOut();
      });

      playButton.addEventListener('click', function () {
        bigscreenPlayer.play();
        startControlsTimeOut();
      });

      pauseButton.addEventListener('click', function () {
        bigscreenPlayer.pause();
        startControlsTimeOut();
      });

      seekForwardButton.addEventListener('click', function () {
        bigscreenPlayer.setCurrentTime(bigscreenPlayer.getCurrentTime() + 10);
        startControlsTimeOut();
      });

      seekBackButton.addEventListener('click', function () {
        bigscreenPlayer.setCurrentTime(bigscreenPlayer.getCurrentTime() - 10);
        startControlsTimeOut();
      });

      seekToEndButton.addEventListener('click', function () {
        bigscreenPlayer.setCurrentTime(bigscreenPlayer.getDuration() - 10);
        startControlsTimeOut();
      });

      debugToolButton.addEventListener('click', function () {
        DebugTool.toggleVisibility();
        startControlsTimeOut();
      });

      bigscreenPlayer.registerForTimeUpdates(function (event) {
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
        if(state === 'WAITING') {
          playbackElement.appendChild(playbackSpinner);
        } else {
          playbackElement.removeChild(playbackSpinner);
        }
      });
    }

    // Create player instance
    var bigscreenPlayer = BigscreenPlayer();

    // Init UI controls
    setupControls();

    // Set initial focus
    playButton.focus();

    // Create data source for bigscreen-plauer
    var minimalData = {
      media: {
        mimeType: 'video/mp4',
        urls: [
          {
            // Content from DASH IF testing assests (used in their reference player) 
            // https://reference.dashif.org/dash.js/v2.9.2/samples/dash-if-reference-player/index.htm
            url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd' 
          }
        ]
      }
    };

    // Specify extra input args
    var windowType = WindowTypes.STATIC;
    var liveSupport = 'seekable';
    var enableSubtitles = false;

    // Initialise the player
    // At this point TAL environment can be injected, if needed
    bigscreenPlayer.init(playbackElement, minimalData, windowType, enableSubtitles, liveSupport);

    // Upmix video element audio output
    function upmix() {

      // create web audio api context
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
      // Set channel count
      audioCtx.destination.channelCount = 6;
      audioCtx.destination.channelCountMode = 'explicit';
      audioCtx.destination.channelInterpretation = 'discrete';
    
      // Create splitter
      var merger = audioCtx.createChannelMerger(6);
    
      // Setup merger
      // merger.channelCount = 1;
      merger.channelCountMode = 'explicit';
      merger.channelInterpretation = 'discrete';
      merger.connect(audioCtx.destination);

      // Get video element audio
      var videoRef = document.querySelector('video');
      var mediaSource = audioCtx.createMediaElementSource(videoRef);
      mediaSource.channelCount = 6;
      mediaSource.channelCountMode = 'explicit';
      mediaSource.channelInterpretation = 'discrete';

      // Split media source
      var splitter = audioCtx.createChannelSplitter(2);
      mediaSource.connect(splitter);

      // Create gain array
      var gains = {
        frontLeft: {
          node: audioCtx.createGain(),
          gain: 1.0
        },
        frontRight: {
          node: audioCtx.createGain(),
          gain: 1.0
        },
        frontCenter: {
          node: audioCtx.createGain(),
          gain: 1.0
        },
        rearLeft: {
          node: audioCtx.createGain(),
          gain: 1.0
        },
        rearRight: {
          node: audioCtx.createGain(),
          gain: 1.0
        },
        lfe: {
          node: audioCtx.createGain(),
          gain: 1.0
        }
      };

      // Setup routing splitter-gains
      splitter.connect(gains.frontLeft.node, 0, 0);
      splitter.connect(gains.frontRight.node, 1, 0);
      splitter.connect(gains.frontCenter.node, 0, 0);
      splitter.connect(gains.rearLeft.node, 1, 0);
      splitter.connect(gains.rearRight.node, 0, 0);
      splitter.connect(gains.lfe.node, 1, 0);

      // Setup routing gains-merger
      gains.frontLeft.node.connect(merger, 0, 0);
      gains.frontRight.node.connect(merger, 0, 1);
      gains.frontCenter.node.connect(merger, 0, 2);
      gains.rearLeft.node.connect(merger, 0, 3);
      gains.rearRight.node.connect(merger, 0, 4);
      gains.lfe.node.connect(merger, 0, 5);

      // Setup slider callbacks
      flSlider.addEventListener("input", function(){
        gains.frontLeft.node.gain.setValueAtTime(flSlider.value, audioCtx.currentTime);
      });

      frSlider.addEventListener("input", function(){
        gains.frontRight.node.gain.setValueAtTime(frSlider.value, audioCtx.currentTime);
      });

      fcSlider.addEventListener("input", function(){
        gains.frontCenter.node.gain.setValueAtTime(fcSlider.value, audioCtx.currentTime);
      });

      rlSlider.addEventListener("input", function(){
        gains.rearLeft.node.gain.setValueAtTime(rlSlider.value, audioCtx.currentTime);
      });

      rrSlider.addEventListener("input", function(){ 
        gains.rearRight.node.gain.setValueAtTime(rrSlider.value, audioCtx.currentTime);
      });

      lfeSlider.addEventListener("input", function(){
        gains.lfe.node.gain.setValueAtTime(lfeSlider.value, audioCtx.currentTime);
      });

    }

    upmix();

  }
);


