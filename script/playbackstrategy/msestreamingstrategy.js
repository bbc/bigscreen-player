define('bigscreenplayer/playbackstrategy/msestreamingstrategy', [], function () {
  function MSEStreamingStrategy (
    mediaSources,
    windowType,
    mediaKind,
    playbackElement,
    isUHD
  ) {
    var audio = document.createElement('audio');
    var mediaSource = new MediaSource();
    var sourceBuffer;

    mediaSource.addEventListener('sourceopen', function () {
      sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
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
              sourceBuffer.appendBuffer(result.value);

              return reader.read().then(process);
            });
          // emitter.trigger('responseLoaded', response.body);
        }
      });
    }

    audio.src = URL.createObjectURL(mediaSource);
    audio.play();

    // function MediaSourceController () {
    //   emitter.on('responseLoaded', function (chunk) {
    //     sourceBuffer.appendBuffer(chunk);
    //   });
    // }

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
