define(
  'bigscreenplayer/utils/loadurl',
  function () {
    'use strict';

    return function (url, opts) {
      var xhr = new XMLHttpRequest();
      if (opts.timeout) {
        xhr.timeout = opts.timeout;
      }

      if (opts.onTimeout) {
        xhr.ontimeout = opts.onTimeout;
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          xhr.onreadystatechange = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            if (opts.onLoad) {
              opts.onLoad(xhr.responseXML, xhr.responseText, xhr.status);
            }
          } else {
            if (opts.onError) {
              opts.onError(xhr.status);
            }
          }
        }
      };

      try {
        xhr.open(opts.method || 'GET', url, true);
        // TODO The opts protection in the following expression is redundant as there are lots of other places an undefined opts will cause TypeError to be thrown
        if (opts && opts.headers) {
          for (var header in opts.headers) {
            if (opts.headers.hasOwnProperty(header)) {
              xhr.setRequestHeader(header, opts.headers[header]);
            }
          }
        }
        xhr.send(opts.data || null);
      } catch (ex) {
        if (opts.onError) {
          opts.onError(xhr.status);
        }
      }
    };
  }
);
