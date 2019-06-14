
define('bigscreenplayer/debugger/cdndebugoutput',
['bigscreenplayer/debugger/debugtool', 'bigscreenplayer/utils/playbackutils'],
function (DebugTool, Utils) {
  'use strict';
  function CdnDebugOutput (initialMedia) {
    var media = Utils.cloneArray(initialMedia);
    var currentCDN = media[0];

    DebugTool.keyValue({key: 'available cdns', value: availableCdns()});
    DebugTool.keyValue({key: 'current cdn', value: currentCDN.cdn});
    DebugTool.keyValue({key: 'url', value: currentCDN.url});

    function availableCdns () {
      return media.map(function (element) {
        return element && element.cdn;
      });
    }

    function updateMedia () {
      media.shift();
      currentCDN = media[0];
    }

    function update () {
      updateMedia();
      DebugTool.keyValue({key: 'available cdns', value: availableCdns()});
      DebugTool.keyValue({key: 'current cdn', value: currentCDN.cdn});
      DebugTool.keyValue({key: 'url', value: currentCDN.url});
    }

    return {
      update: update,
      tearDown: function () {
        media = undefined;
        currentCDN = undefined;
      }
    };
  }

  return CdnDebugOutput;
}
);
