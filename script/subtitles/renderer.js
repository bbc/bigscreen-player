define('bigscreenplayer/subtitles/renderer',
  [
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/utils/loadurl',
    'bigscreenplayer/subtitles/transformer'
  ],
  function (DebugTool, LoadURL, Transformer) {
    'use strict';

    var Renderer = function (id, url, mediaPlayer) {
      var transformedSubtitles;
      var liveItems = [];
      var interval = 0;
      var outputElement;
      outputElement = document.createElement('div');
      outputElement.id = id;

      DebugTool.info('Loading captions from: ' + url);

      var xhr = LoadURL(url, {
        onLoad: function (response, status) {
          if (status === 200) {
            transformedSubtitles = Transformer().transformXML(xhr.responseXML);
            outputElement.setAttribute('style', transformedSubtitles.baseStyle);
            outputElement.style.cssText = transformedSubtitles.baseStyle;
          }
        },
        onError: function (error) {
          DebugTool.info('Error loading captions data: ' + error);
        }
      });

      function render () {
        return outputElement;
      }

      function start () {
        interval = setInterval(function () { update(); }, 750);

        if (outputElement) {
          outputElement.style.display = 'block';
        }
      }

      function stop () {
        if (outputElement) {
          outputElement.style.display = 'none';
        }

        cleanOldCaptions(mediaPlayer.getDuration());
        clearInterval(interval);
      }

      function update () {
        if (!mediaPlayer) {
          stop();
        }

        var time = mediaPlayer.getCurrentTime();
        updateCaptions(time);
      }

      function updateCaptions (time) {
        cleanOldCaptions(time);
        addNewCaptions(time);
      }

      function cleanOldCaptions (time) {
        var live = liveItems;
        for (var i = live.length - 1; i >= 0; i--) {
          if (live[i].removeFromDomIfExpired(time)) {
            live.splice(i, 1);
          }
        }
      }

      function addNewCaptions (time) {
        var live = liveItems;
        var fresh = transformedSubtitles.subtitlesForTime(time);
        liveItems = live.concat(fresh);
        for (var i = 0, j = fresh.length; i < j; i++) {
          // TODO: Probably start adding to the DOM here rather than calling through.
          fresh[i].addToDom(outputElement);
        }
      }

      return {
        render: render,
        start: start,
        stop: stop
      };
    };

    return Renderer;
  }
);
