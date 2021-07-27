import MediaState from '../models/mediastate';
import Chronicle from './chronicle';
var view;

function init (newView) {
  view = newView;
}

function update (logs) {
  view.render({ static: parseStaticFields(logs), dynamic: parseDynamicFields(logs) });
}

function parseStaticFields (logs) {
  var latestStaticFields = [];
  var staticFields = logs.filter(function (log) {
    return isStaticLog(log);
  });

  var uniqueKeys = findUniqueKeys(staticFields);
  uniqueKeys.forEach(function (key) {
    var matchingStaticLogs = staticFields.filter(function (log) {
      return log.keyvalue.key === key;
    });
    latestStaticFields.push(matchingStaticLogs.pop());
  });

  return latestStaticFields.map(function (field) {
    return {key: sanitiseKeyString(field.keyvalue.key), value: sanitiseValueString(field.keyvalue.value)};
  });
}

function parseDynamicFields (logs) {
  var dynamicLogs;

  dynamicLogs = logs.filter(function (log) {
    return !isStaticLog(log);
  }).map(function (log) {
    var dateString = new Date(log.timestamp).toISOString();
    switch (log.type) {
      case Chronicle.TYPES.INFO:
        return dateString + ' - Info: ' + log.message;
      case Chronicle.TYPES.TIME:
        return dateString + ' - Video time: ' + parseFloat(log.currentTime).toFixed(2);
      case Chronicle.TYPES.EVENT:
        return dateString + ' - Event: ' + convertToReadableEvent(log.event.state);
      case Chronicle.TYPES.ERROR:
        return dateString + ' - Error: ' + log.error.errorId + ' | ' + log.error.message;
      case Chronicle.TYPES.APICALL:
        return dateString + ' - Api call: ' + log.calltype;
      default:
        return dateString + ' - Unknown log format';
    }
  });

  return dynamicLogs;
}

function isStaticLog (log) {
  return log.type === Chronicle.TYPES.KEYVALUE;
}

function findUniqueKeys (logs) {
  var uniqueKeys = [];
  logs.forEach(function (log) {
    if (uniqueKeys.indexOf(log.keyvalue.key) === -1) {
      uniqueKeys.push(log.keyvalue.key);
    }
  });
  return uniqueKeys;
}

function sanitiseKeyString (key) {
  return key.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function sanitiseValueString (value) {
  if (value instanceof Date) {
    var hours = zeroPadTimeUnits(value.getHours()) + value.getHours();
    var mins = zeroPadTimeUnits(value.getMinutes()) + value.getMinutes();
    var secs = zeroPadTimeUnits(value.getSeconds()) + value.getSeconds();
    return hours + ':' + mins + ':' + secs;
  }
  return value;
}

function zeroPadTimeUnits (unit) {
  return (unit < 10 ? '0' : '');
}

function convertToReadableEvent (type) {
  for (var key in MediaState) {
    if (MediaState[key] === type) {
      return key;
    }
  }
  return type;
}

export default {
  init: init,
  update: update
};
