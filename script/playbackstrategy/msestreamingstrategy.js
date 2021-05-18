define('bigscreenplayer/playbackstrategy/msestreamingstrategy', [], function () {
  function MSEStreamingStrategy (
    mediaSources,
    windowType,
    mediaKind,
    playbackElement,
    isUHD
  ) {
    var audio = document.createElement('audio');
    audio.volume = 0.1;
    var mediaSource = new MediaSource();
    var buffer = [];
    var sourceBuffer;
    var bufferedDuration = 0;

    mediaSource.addEventListener('sourceopen', function () {
      sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      sourceBuffer.addEventListener('updateend', function (evt) {
        bufferedDuration = sourceBuffer.buffered.length > 0 ? (sourceBuffer.buffered.end(0) - sourceBuffer.buffered.start(0)) : 0;

        if (bufferedDuration > 20 && !sourceBuffer.updating) {
          sourceBuffer.remove(audio.seekable.start(0), audio.currentTime);
        }
      });

      setInterval(function () {
        if (!sourceBuffer.updating && bufferedDuration < 20) {
          sourceBuffer.appendBuffer(buffer.shift());
        }
      }, 500);

      setInterval(function () {
        console.log('bufferedDuration duration ' + bufferedDuration);
      }, 1000);
    });

    function streamFetcher (stream) {
      fetch(stream).then(function (response) {
        if (response.body) {
          var reader = response.body.getReader();

          reader.read()
            .then(function process (result) {
              if (result.done) {
                console.log('Done!');
                return;
              }

              console.log(result.value.length);
              buffer.push(result.value);

              return reader.read().then(process);
            });
        }
      });
    }

    audio.src = URL.createObjectURL(mediaSource);
    audio.play();

    return {
      load: function () {
        console.log('load called');
        streamFetcher(mediaSources.currentSource());
      },
      addEventCallback: function (callback) {
        return;
      },
      addTimeUpdateCallback: function (callback) {
        return;
      },
      addErrorCallback: function (callback) {
        return;
      }
    };
  }

  MSEStreamingStrategy.getLiveSupport = function () {
    return 'seekable';
  };

  return MSEStreamingStrategy;
});
