define('bigscreenplayer/debugger/debugview',
  function () {
    'use strict';
    var appElement, logBox, logContainer, staticContainer, staticBox;

    function init () {
      logBox = document.createElement('div');
      logContainer = document.createElement('span');
      staticBox = document.createElement('div');
      staticContainer = document.createElement('span');

      if (appElement === undefined) {
        appElement = document.body;
      }

      logBox.id = 'logBox';
      logBox.style.position = 'absolute';
      logBox.style.width = '63%';
      logBox.style.left = '5%';
      logBox.style.top = '15%';
      logBox.style.bottom = '25%';
      logBox.style.backgroundColor = '#1D1D1D';
      logBox.style.opacity = 0.9;
      logBox.style.overflow = 'hidden';

      staticBox.id = 'staticBox';
      staticBox.style.position = 'absolute';
      staticBox.style.width = '26%';
      staticBox.style.right = '5%';
      staticBox.style.top = '15%';
      staticBox.style.bottom = '25%';
      staticBox.style.backgroundColor = '#1D1D1D';
      staticBox.style.opacity = 0.9;
      staticBox.style.overflow = 'hidden';

      logContainer.id = 'logContainer';
      logContainer.style.color = '#ffffff';
      logContainer.style.fontSize = '11pt';
      logContainer.style.position = 'absolute';
      logContainer.style.bottom = '1%';
      logContainer.style.left = '1%';
      logContainer.style.wordWrap = 'break-word';
      logContainer.style.whiteSpace = 'pre-line';

      staticContainer.id = 'staticContainer';
      staticContainer.style.color = '#ffffff';
      staticContainer.style.fontSize = '11pt';
      staticContainer.style.wordWrap = 'break-word';
      staticContainer.style.left = '1%';
      staticContainer.style.whiteSpace = 'pre-line';

      logBox.appendChild(logContainer);
      staticBox.appendChild(staticContainer);
      appElement.appendChild(logBox);
      appElement.appendChild(staticBox);
    }

    function setRootElement (root) {
      if (root) {
        appElement = root;
      }
    }

    function render (logData) {
      var dynamicLogs = logData.dynamic;
      var LINES_TO_DISPLAY = 29;
      if (dynamicLogs.length === 0) {
        logContainer.innerHTML = '';
      }

      dynamicLogs = dynamicLogs.slice(-LINES_TO_DISPLAY);
      logContainer.innerHTML = dynamicLogs.join('\n');

      var staticLogString = '';
      logData.static.forEach(function (log) {
        staticLogString = staticLogString + log.key + ': ' + log.value + '\n\n';
      });

      staticContainer.innerHTML = staticLogString;
    }

    function tearDown () {
      if (appElement) {
        appElement.removeChild(document.getElementById('logBox'));
        appElement.removeChild(document.getElementById('staticBox'));
        appElement = undefined;
      }
      staticContainer = undefined;
      logContainer = undefined;
      logBox = undefined;
      staticBox = undefined;
    }

    return {
      init: init,
      setRootElement: setRootElement,
      render: render,
      tearDown: tearDown
    };
  });
