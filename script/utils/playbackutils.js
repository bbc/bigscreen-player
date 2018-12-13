define(
    'bigscreenplayer/utils/playbackutils',
    function () {
      'use strict';

      return {
        durationToSeconds: function (duration) {
          var matches = duration.match(/^PT(\d+(?:[,\.]\d+)?H)?(\d+(?:[,\.]\d+)?M)?(\d+(?:[,\.]\d+)?S)?/) || [];

          var hours = parseFloat(matches[1] || 0) * 60 * 60;
          var mins = parseFloat(matches[2] || 0) * 60;
          var secs = parseFloat(matches[3] || 0);

          return (hours + mins + secs) || undefined;
        },

        clone: function (args) {
          var clone = {};
          for (var prop in args) {
            if (args.hasOwnProperty(prop)) {
              clone[prop] = args[prop];
            }
          }
          return clone;
        },

        deepClone: function (objectToClone) {
          if (!objectToClone) {
            return objectToClone;
          }

          var clone, propValue, propName;
          clone = Array.isArray(objectToClone) ? [] : {};
          for (propName in objectToClone) {
            propValue = objectToClone[propName];

            // check for date
            if (propValue && Object.prototype.toString.call(propValue) === '[object Date]') {
              clone[propName] = new Date(propValue);
              continue;
            }

            clone[propName] = (typeof propValue === 'object') ? this.deepClone(propValue) : propValue;
          }
          return clone;
        },

        cloneArray: function (arr) {
          var clone = [];

          for (var i = 0, n = arr.length; i < n; i++) {
            clone.push(this.clone(arr[i]));
          }

          return clone;
        },

        merge: function () {
          var merged = {};

          for (var i = 0; i < arguments.length; i++) {
            var obj = arguments[i];
            for (var param in obj) {
              merged[param] = obj[param];
            }
          }

          return merged;
        },

        arrayStartsWith: function (array, partial) {
          for (var i = 0; i < partial.length; i++) {
            if (array[i] !== partial[i]) {
              return false;
            }
          }

          return true;
        },

        find: function (array, predicate) {
          return array.reduce(function (acc, it, i) {
            return acc !== false ? acc : predicate(it) && it;
          }, false);
        },

        findIndex: function (array, predicate) {
          return array.reduce(function (acc, it, i) {
            return acc !== false ? acc : predicate(it) && i;
          }, false);
        },

        swap: function (array, i, j) {
          var arr = array.slice();
          var temp = arr[i];

          arr[i] = arr[j];
          arr[j] = temp;

          return arr;
        },

        pluck: function (array, property) {
          var plucked = [];

          for (var i = 0; i < array.length; i++) {
            plucked.push(array[i][property]);
          }

          return plucked;
        },

        flatten: function (arr) {
          return [].concat.apply([], arr);
        },

        without: function (arr, value) {
          var newArray = [];

          for (var i = 0; i < arr.length; i++) {
            if (arr[i] !== value) {
              newArray.push(arr[i]);
            }
          }

          return newArray;
        },

        contains: function (arr, subset) {
          return [].concat(subset).every(function (item) { return [].concat(arr).indexOf(item) > -1; });
        },

        pickRandomFromArray: function (arr) {
          return arr[Math.floor(Math.random() * arr.length)];
        },

        filter: function (arr, predicate) {
          var filteredArray = [];

          for (var i = 0; i < arr.length; i++) {
            if (predicate(arr[i])) {
              filteredArray.push(arr[i]);
            }
          }

          return filteredArray;
        },

        noop: function () {},

        generateUUID: function () {
          var d = new Date().getTime();

          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
        },

        path: function (object, keys) {
          return (keys || []).reduce(function (accum, key) {
            return (accum || {})[key];
          }, object || {});
        }
      };
    }
  );
