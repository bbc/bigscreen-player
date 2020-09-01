define('bigscreenplayer/subtitles/renderer',
  [
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/utils/loadurl',
    'bigscreenplayer/subtitles/transformer'
  ],
  function (DebugTool, LoadURL, Transformer) {
    'use strict';

    var Renderer = function (id, url, mediaPlayer) {
      var subtitles;
      var liveItems = [];
      var interval = 0;
      var outputElement;
      outputElement = document.createElement('div');
      outputElement.id = id;

      DebugTool.info('Loading captions from: ' + url);

      var xhr = LoadURL(url, {
        onLoad: function (response, status) {
          if (status === 200) {
            var transformedSubtitles = Transformer().transformXML(xhr.responseXML);
            subtitles = transformedSubtitles;
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

      // function groupUnseenFor (time) {
      //   // Basic approach first.
      //   // TODO - seek backwards and do fast seeking if long timestamp
      //   // differences. Also add a cache for last timestamp seen. If next time is older, reset.
      //   var it;
      //   if (time < lastTimeSeen) {
      //     it = 0;
      //   } else {
      //     it = iterator || 0;
      //   }
      //   lastTimeSeen = time;
      //   var itms = subtitles;
      //   var max = itms.length;

      //   // The current iterated item was not returned last time.
      //   // If its time has not come, we return nothing.
      //   var ready = [];
      //   var itm = itms[it];
      //   while (it !== max && itm.start < time) {
      //     if (itm.end > time) {
      //       ready.push(itm);
      //     }
      //     it++;
      //     itm = itms[it];
      //   }
      //   iterator = it;

      //   return ready;
      // }

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
        var fresh = subtitles.subtitlesForTime(time);
        liveItems = live.concat(fresh);
        for (var i = 0, j = fresh.length; i < j; i++) {
          // TODO: Probably start doing this in here rather than calling through.
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
