define('bigscreenplayer/debugger/chronicle',
function () {
  'use strict';
  var chronicle = [];
  var firstTimeElement;
  var compressTime;
  var updateCallbacks = [];

  var TYPES = {
    INFO: 'info',
    ERROR: 'error',
    EVENT: 'event',
    APICALL: 'apicall',
    TIME: 'time',
    KEYVALUE: 'keyvalue'
  };

  function init () {
    clear();
  }

  function clear () {
    firstTimeElement = true;
    compressTime = false;
    chronicle = [];
  }

  function registerForUpdates (callback) {
    updateCallbacks.push(callback);
  }

  function unregisterForUpdates (callback) {
    var indexOf = updateCallbacks.indexOf(callback);
    if (indexOf !== -1) {
      updateCallbacks.splice(indexOf, 1);
    }
  }

  function info (message) {
    pushToChronicle({type: TYPES.INFO, message: message});
  }

  function error (err) {
    pushToChronicle({type: TYPES.ERROR, error: err});
  }

  function event (event) {
    pushToChronicle({type: TYPES.EVENT, event: event});
  }

  function apicall (callType) {
    pushToChronicle({type: TYPES.APICALL, calltype: callType});
  }

  function time (time) {
    if (firstTimeElement) {
      pushToChronicle({type: TYPES.TIME, currentTime: time});
      firstTimeElement = false;
    } else if (!compressTime) {
      pushToChronicle({type: TYPES.TIME, currentTime: time});
      compressTime = true;
    } else {
      var lastElement = chronicle.pop();
      lastElement.currentTime = time;
      pushToChronicle(lastElement);
    }
  }

  function keyValue (obj) {
    pushToChronicle({type: TYPES.KEYVALUE, keyvalue: obj});
  }

  function retrieve () {
    return chronicle.slice();
  }

  function timestamp (obj) {
    obj.timestamp = new Date().getTime();
  }

  function pushToChronicle (obj) {
    if (obj.type !== TYPES.TIME) {
      firstTimeElement = true;
      compressTime = false;
    }
    timestamp(obj);
    chronicle.push(obj);
    updates();
  }

  function updates () {
    updateCallbacks.forEach(function (callback) {
      callback(retrieve());
    });
  }

  function tearDown () {
    clear();
  }

  return {
    init: init,
    TYPES: TYPES,
    clear: clear,
    info: info,
    error: error,
    event: event,
    apicall: apicall,
    time: time,
    keyValue: keyValue,
    retrieve: retrieve,
    tearDown: tearDown,
    registerForUpdates: registerForUpdates,
    unregisterForUpdates: unregisterForUpdates
  };
});
