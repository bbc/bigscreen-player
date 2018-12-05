define('bigscreenplayer/plugins',
  [
    'bigscreenplayer/utils/playbackutils'
  ],
  function (PlaybackUtils) {
    var plugins = [];

    function callOnAllPlugins (funcKey, evt) {
      var clonedEvent = PlaybackUtils.deepClone(evt);
      for (var i in plugins) {
        if (plugins[i][funcKey]) {
          plugins[i][funcKey](clonedEvent);
        }
      }
    }

    return {
      registerPlugin: function (plugin) {
        plugins.push(plugin);
      },
      unregisterPlugin: function (plugin) {
        if (!plugin && plugins.length > 0) {
          plugins = [];
        } else {
          for (var i = (plugins.length - 1); i >= 0; i--) {
            if (plugins[i] === plugin) {
              plugins.splice(i, 1);
            }
          }
        }
      },
      interface: {
        onError: function (evt) {
          callOnAllPlugins('onError', evt);
        },
        onFatalError: function (evt) {
          callOnAllPlugins('onFatalError', evt);
        },
        onErrorCleared: function (evt) {
          callOnAllPlugins('onErrorCleared', evt);
        },
        onErrorHandled: function (evt) {
          callOnAllPlugins('onErrorHandled', evt);
        },
        onBuffering: function (evt) {
          callOnAllPlugins('onBuffering', evt);
        },
        onBufferingCleared: function (evt) {
          callOnAllPlugins('onBufferingCleared', evt);
        },
        onScreenCapabilityDetermined: function (tvInfo) {
          callOnAllPlugins('onScreenCapabilityDetermined', tvInfo);
        },
        onPlayerInfoUpdated: function (evt) {
          callOnAllPlugins('onPlayerInfoUpdated', evt);
        }
      }
    };
  }
);
