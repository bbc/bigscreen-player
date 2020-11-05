define('bigscreenplayer/subtitles/renderer',
  [
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/utils/loadurl',
    'bigscreenplayer/subtitles/transformer',
    'bigscreenplayer/plugins'
  ],
  function (DebugTool, LoadURL, Transformer, Plugins) {
    'use strict';

    var Renderer = function (id, url, mediaPlayer, autoStart) {
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
            if (autoStart) {
              start();
            }
          }
        },
        onError: function (error) {
          DebugTool.info('Error loading captions data: ' + error);
          Plugins.interface.onSubtitlesLoadError();
        }
      });

      function render () {
        return outputElement;
      }

      function start () {
        if (transformedSubtitles) {
          interval = setInterval(function () { update(); }, 750);
          if (outputElement) {
            outputElement.style.display = 'block';
            outputElement.setAttribute('style', transformedSubtitles.baseStyle);
            outputElement.style.cssText = transformedSubtitles.baseStyle;
          }
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
        try {
          if (!mediaPlayer) {
            stop();
          }

          var time = mediaPlayer.getCurrentTime();
          updateCaptions(time);

          confirmCaptionsRendered();
        } catch (e) {
          DebugTool.info('Exception while rendering subtitles: ' + e);
          Plugins.interface.onSubtitlesRenderError();
        }
      }

      function confirmCaptionsRendered () {
        // Did it actually get added to the DOM each time?
        if (outputElement && !outputElement.hasChildNodes && liveItems.length > 0) {
          // There were live items that should be displayed but aren't on the DOM.
          Plugins.interface.onSubtitlesRenderError();
        }
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
