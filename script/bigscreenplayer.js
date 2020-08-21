/**
 * @module bigscreenplayer/bigscreenplayer
 */
define('bigscreenplayer/bigscreenplayer',
  [
    'bigscreenplayer/models/mediastate',
    'bigscreenplayer/playercomponent',
    'bigscreenplayer/models/pausetriggers',
    'bigscreenplayer/dynamicwindowutils',
    'bigscreenplayer/models/windowtypes',
    'bigscreenplayer/mockbigscreenplayer',
    'bigscreenplayer/plugins',
    'bigscreenplayer/debugger/chronicle',
    'bigscreenplayer/debugger/debugtool',
    'bigscreenplayer/utils/timeutils',
    'bigscreenplayer/mediasources',
    'bigscreenplayer/version'
  ],
  function (MediaState, PlayerComponent, PauseTriggers, DynamicWindowUtils, WindowTypes, MockBigscreenPlayer, Plugins, Chronicle, DebugTool, SlidingWindowUtils, MediaSources, Version) {
    'use strict';
    function BigscreenPlayer () {
      var stateChangeCallbacks = [];
      var timeUpdateCallbacks = [];
      var subtitleCallbacks = [];

      var mediaKind;
      var initialPlaybackTimeEpoch;
      var serverDate;
      var playerComponent;
      var pauseTrigger;
      var isSeeking = false;
      var endOfStream;
      var windowType;
      var device;
      var mediaSources;

      var END_OF_STREAM_TOLERANCE = 10;

      function mediaStateUpdateCallback (evt) {
        if (evt.timeUpdate) {
          DebugTool.time(evt.data.currentTime);
          timeUpdateCallbacks.forEach(function (callback) {
            callback({
              currentTime: evt.data.currentTime,
              endOfStream: endOfStream
            });
          });
        } else {
          var stateObject = {state: evt.data.state};
          if (evt.data.state === MediaState.PAUSED) {
            endOfStream = false;
            stateObject.trigger = pauseTrigger || PauseTriggers.DEVICE;
            pauseTrigger = undefined;
          }

          if (evt.data.state === MediaState.FATAL_ERROR) {
            stateObject = {
              state: MediaState.FATAL_ERROR,
              isBufferingTimeoutError: evt.isBufferingTimeoutError
            };
          }

          if (evt.data.state === MediaState.WAITING) {
            stateObject.isSeeking = isSeeking;
            isSeeking = false;
          }

          stateObject.endOfStream = endOfStream;
          DebugTool.event(stateObject);

          stateChangeCallbacks.forEach(function (callback) {
            callback(stateObject);
          });
        }

        if (evt.data.seekableRange) {
          DebugTool.keyValue({key: 'seekableRangeStart', value: deviceTimeToDate(evt.data.seekableRange.start)});
          DebugTool.keyValue({key: 'seekableRangeEnd', value: deviceTimeToDate(evt.data.seekableRange.end)});
        }

        if (evt.data.duration) {
          DebugTool.keyValue({key: 'duration', value: evt.data.duration});
        }
      }

      function deviceTimeToDate (time) {
        if (getWindowStartTime()) {
          return new Date(convertVideoTimeSecondsToEpochMs(time));
        } else {
          return new Date(time * 1000);
        }
      }

      function convertVideoTimeSecondsToEpochMs (seconds) {
        return getWindowStartTime() ? getWindowStartTime() + (seconds * 1000) : undefined;
      }

      function bigscreenPlayerDataLoaded (playbackElement, bigscreenPlayerData, enableSubtitles, device, successCallback) {
        if (windowType !== WindowTypes.STATIC) {
          bigscreenPlayerData.time = mediaSources.time();
          serverDate = bigscreenPlayerData.serverDate;

          initialPlaybackTimeEpoch = bigscreenPlayerData.initialPlaybackTime;
          // overwrite initialPlaybackTime with video time (it comes in as epoch time for a sliding/growing window)
          bigscreenPlayerData.initialPlaybackTime = SlidingWindowUtils.convertToSeekableVideoTime(bigscreenPlayerData.initialPlaybackTime, bigscreenPlayerData.time.windowStartTime);
        }

        mediaKind = bigscreenPlayerData.media.kind;
        endOfStream = windowType !== WindowTypes.STATIC && (!bigscreenPlayerData.initialPlaybackTime && bigscreenPlayerData.initialPlaybackTime !== 0);

        playerComponent = new PlayerComponent(
          playbackElement,
          bigscreenPlayerData,
          mediaSources,
          windowType,
          enableSubtitles,
          mediaStateUpdateCallback,
          device
        );

        if (enableSubtitles) {
          callSubtitlesCallbacks(true);
        }

        if (successCallback) {
          successCallback();
        }
      }

      function getWindowStartTime () {
        return mediaSources && mediaSources.time().windowStartTime;
      }

      function getWindowEndTime () {
        return mediaSources && mediaSources.time().windowEndTime;
      }

      function toggleDebug () {
        if (playerComponent) {
          DebugTool.toggleVisibility();
        }
      }

      function callSubtitlesCallbacks (enabled) {
        subtitleCallbacks.forEach(function (callback) {
          callback({ enabled: enabled });
        });
      }

      return /** @alias module:bigscreenplayer/bigscreenplayer */{
        /**
         * Data required for playback
         * @typedef {Object} BigscreenPlayerData
         * @property {Object} media
         * @property {String} media.type - source type e.g 'application/dash+xml'
         * @property {String} media.mimeType - mimeType e.g 'video/mp4'
         * @property {String} media.kind - 'video' or 'audio'
         * @property {String} media.captionsUrl - 'Location for a captions file'
         * @property {MediaUrl[]} media.urls - Media urls to use
         * @property {Date} serverDate - Date object with server time offset
         */

        /**
          * @typedef {Object} MediaUrl
          * @property {String} url - media endpoint
          * @property {String} cdn - identifier for the endpoint
          */

        /**
         *
         * @typedef {object} InitCallbacks
         * @property {function} [callbacks.onSuccess] - Called after Bigscreen Player is initialised
         * @property {function} [callbacks.onError] - Called when an error occurs during initialisation
         */

        /**
         * Call first to initialise bigscreen player for playback.
         * @function
         * @name init
         * @param {HTMLDivElement} playbackElement - The Div element where content elements should be rendered
         * @param {BigsceenPlayerData} bigscreenPlayerData
         * @param {WindowTypes} newWindowType - @see {@link module:bigscreenplayer/models/windowtypes}
         * @param {boolean} enableSubtitles - Enable subtitles on initialisation
         * @param {TALDevice} newDevice - An optional TAL device object
         * @param {InitCallbacks} callbacks
         */
        init: function (playbackElement, bigscreenPlayerData, newWindowType, enableSubtitles, newDevice, callbacks) {
          Chronicle.init();
          DebugTool.setRootElement(playbackElement);
          DebugTool.keyValue({key: 'framework-version', value: Version});
          device = newDevice;
          windowType = newWindowType;
          serverDate = bigscreenPlayerData.serverDate;
          if (!callbacks) {
            callbacks = {};
          }

          var mediaSourceCallbacks = {
            onSuccess: function () {
              bigscreenPlayerDataLoaded(playbackElement, bigscreenPlayerData, enableSubtitles, device, callbacks.onSuccess);
            },
            onError: function (error) {
              if (callbacks.onError) {
                callbacks.onError(error);
              }
            }
          };

          mediaSources = new MediaSources();
          mediaSources.init(bigscreenPlayerData.media.urls, serverDate, windowType, getLiveSupport(device), mediaSourceCallbacks);
        },

        /**
         * Should be called at the end of all playback sessions. Resets state and clears any UI.
         * @function
         * @name tearDown
         */
        tearDown: function () {
          if (playerComponent) {
            playerComponent.tearDown();
            playerComponent = undefined;
          }
          stateChangeCallbacks = [];
          timeUpdateCallbacks = [];
          subtitleCallbacks = [];
          endOfStream = undefined;
          mediaKind = undefined;
          pauseTrigger = undefined;
          windowType = undefined;
          mediaSources = undefined;
          this.unregisterPlugin();
          DebugTool.tearDown();
          Chronicle.tearDown();
        },

        /**
         * Pass a function to call whenever the player transitions state.
         * @see {@link module:models/mediastate}
         * @function
         * @param {Function} callback
         */
        registerForStateChanges: function (callback) {
          stateChangeCallbacks.push(callback);
          return callback;
        },

        /**
         * Unregisters a previously registered callback.
         * @function
         * @param {Function} callback
         */
        unregisterForStateChanges: function (callback) {
          var indexOf = stateChangeCallbacks.indexOf(callback);
          if (indexOf !== -1) {
            stateChangeCallbacks.splice(indexOf, 1);
          }
        },

        /**
         * Pass a function to call whenever the player issues a time update.
         * @function
         * @param {Function} callback
         */
        registerForTimeUpdates: function (callback) {
          timeUpdateCallbacks.push(callback);
          return callback;
        },

        /**
         * Unregisters a previously registered callback.
         * @function
         * @param {Function} callback
         */
        unregisterForTimeUpdates: function (callback) {
          var indexOf = timeUpdateCallbacks.indexOf(callback);

          if (indexOf !== -1) {
            timeUpdateCallbacks.splice(indexOf, 1);
          }
        },

        /**
         * Pass a function to be called whenever subtitles are enabled or disabled.
         * @function
         * @param {Function} callback
         */
        registerForSubtitleChanges: function (callback) {
          subtitleCallbacks.push(callback);
          return callback;
        },

        /**
         * Unregisters a previously registered callback for changes to subtitles.
         * @function
         * @param {Function} callback
         */
        unregisterForSubtitleChanges: function (callback) {
          var indexOf = subtitleCallbacks.indexOf(callback);
          if (indexOf !== -1) {
            subtitleCallbacks.splice(indexOf, 1);
          }
        },

        /**
         * Sets the current time of the media asset.
         * @function
         * @param {Number} time - In seconds
         */
        setCurrentTime: function (time) {
          DebugTool.apicall('setCurrentTime');
          if (playerComponent) {
            isSeeking = true; // this flag must be set before calling into playerComponent.setCurrentTime - as this synchronously fires a WAITING event (when native strategy).
            playerComponent.setCurrentTime(time);
            endOfStream = windowType !== WindowTypes.STATIC && Math.abs(this.getSeekableRange().end - time) < END_OF_STREAM_TOLERANCE;
          }
        },

        /**
         * Returns the media asset's current time in seconds.
         * @function
         */
        getCurrentTime: function () {
          return playerComponent && playerComponent.getCurrentTime() || 0;
        },

        /**
         * Returns the current media kind.
         * 'audio' or 'video'
         * @function
         */
        getMediaKind: function () {
          return mediaKind;
        },

        /**
         * Returns the current window type.
         * @see {@link module:bigscreenplayer/models/windowtypes}
         * @function
         */
        getWindowType: function () {
          return windowType;
        },

        /**
         * Returns an object including the current start and end times.
         * @function
         * @returns {Object} {start: Number, end: Number}
         */
        getSeekableRange: function () {
          return playerComponent ? playerComponent.getSeekableRange() : {};
        },

        /**
        * @function
        * @returns {boolean} Returns true if media is initialised and playing a live stream within a tolerance of the end of the seekable range (10 seconds).
        */
        isPlayingAtLiveEdge: function () {
          return !!playerComponent && windowType !== WindowTypes.STATIC && Math.abs(this.getSeekableRange().end - this.getCurrentTime()) < END_OF_STREAM_TOLERANCE;
        },

        /**
         * @function
         * @return {Object} An object of the shape {windowStartTime: Number, windowEndTime: Number, initialPlaybackTime: Number, serverDate: Date}
         */
        getLiveWindowData: function () {
          if (windowType === WindowTypes.STATIC) {
            return {};
          }

          return {
            windowStartTime: getWindowStartTime(),
            windowEndTime: getWindowEndTime(),
            initialPlaybackTime: initialPlaybackTimeEpoch,
            serverDate: serverDate
          };
        },

        /**
         * @function
         * @returns the duration of the media asset.
         */
        getDuration: function () {
          return playerComponent && playerComponent.getDuration();
        },

        /**
         * @function
         * @returns if the player is paused.
         */
        isPaused: function () {
          return playerComponent ? playerComponent.isPaused() : true;
        },

        /**
         * @function
         * @returns if the media asset has ended.
         */
        isEnded: function () {
          return playerComponent ? playerComponent.isEnded() : false;
        },

        /**
         * Play the media assest from the current point in time.
         * @function
         */
        play: function () {
          DebugTool.apicall('play');
          playerComponent.play();
        },

        /**
         * Pause the media asset.
         * @function
         * @param {*} opts
         * @param {boolean} opts.userPause
         * @param {boolean} opts.disableAutoResume
         */
        pause: function (opts) {
          DebugTool.apicall('pause');
          pauseTrigger = opts && opts.userPause === false ? PauseTriggers.APP : PauseTriggers.USER;
          playerComponent.pause(opts);
        },

        /**
         * Set whether or not subtitles should be enabled.
         * @function
         * @param {boolean} value
         */
        setSubtitlesEnabled: function (value) {
          playerComponent.setSubtitlesEnabled(value);
          callSubtitlesCallbacks(value);
        },

        /**
         * @function
         * @return if subtitles are currently enabled.
         */
        isSubtitlesEnabled: function () {
          return playerComponent ? playerComponent.isSubtitlesEnabled() : false;
        },

        /**
         * @function
         * @return Returns whether or not subtitles are currently enabled.
         */
        isSubtitlesAvailable: function () {
          return playerComponent ? playerComponent.isSubtitlesAvailable() : false;
        },

        /**
         *
         * An enum may be used to set the on-screen position of any transport controls
         * (work in progress to remove this - UI concern).
         * @function
         * @param {*} position
         */
        setTransportControlsPosition: function (position) {
          playerComponent.setTransportControlPosition(position);
        },

        /**
         * @function
         * @return Returns whether the current media asset is seekable.
         */
        canSeek: function () {
          return windowType === WindowTypes.STATIC || DynamicWindowUtils.canSeek(getWindowStartTime(), getWindowEndTime(), getLiveSupport(device), this.getSeekableRange());
        },

        /**
         * @function
         * @return Returns whether the current media asset is pausable.
         */
        canPause: function () {
          return windowType === WindowTypes.STATIC || DynamicWindowUtils.canPause(getWindowStartTime(), getWindowEndTime(), getLiveSupport(device));
        },

        /**
         * Return a mock for in place testing.
         * @function
         * @param {*} opts
         */
        mock: function (opts) {
          MockBigscreenPlayer.mock(this, opts);
        },

        /**
         * Unmock the player.
         * @function
         */
        unmock: function () {
          MockBigscreenPlayer.unmock(this);
        },

        /**
         * Return a mock for unit tests.
         * @function
         * @param {*} opts
         */
        mockJasmine: function (opts) {
          MockBigscreenPlayer.mockJasmine(this, opts);
        },

        /**
         * Register a plugin for extended events.
         * @function
         * @param {*} plugin
         */
        registerPlugin: function (plugin) {
          Plugins.registerPlugin(plugin);
        },

        /**
         * Unregister a previously registered plugin.
         * @function
         * @param {*} plugin
         */
        unregisterPlugin: function (plugin) {
          Plugins.unregisterPlugin(plugin);
        },

        /**
         * Returns an object with a number of functions related to the ability to transition state
         * given the current state and the playback strategy in use.
         * @function
         */
        transitions: function () {
          return playerComponent ? playerComponent.transitions() : {};
        },

        /**
         * @function
         * @return The media element currently being used.
         */
        getPlayerElement: function () {
          return playerComponent && playerComponent.getPlayerElement();
        },

        /**
         * @function
         * @param {Number} epochTime - Unix Epoch based time in milliseconds.
         * @return the time in seconds within the current sliding window.
         */
        convertEpochMsToVideoTimeSeconds: function (epochTime) {
          return getWindowStartTime() ? Math.floor((epochTime - getWindowStartTime()) / 1000) : undefined;
        },

        /**
         * @function
         * @return The runtime version of the library.
         */
        getFrameworkVersion: function () {
          return Version;
        },

        /**
         * @function
         * @param {Number} time - Seconds
         * @return the time in milliseconds within the current sliding window.
         */
        convertVideoTimeSecondsToEpochMs: convertVideoTimeSecondsToEpochMs,

        /**
         * Toggle the visibility of the debug tool overlay.
         * @function
         */
        toggleDebug: toggleDebug,

        /**
         * @function
         * @return {Object} - Key value pairs of available log levels
         */
        getLogLevels: function () {
          return DebugTool.logLevels;
        },

        /**
         * @function
         * @param logLevel -  log level to display @see getLogLevels
         */
        setLogLevel: DebugTool.setLogLevel
      };
    }

    /**
     * @function
     * @param {TALDevice} device
     * @return the live support of the device.
     */
    function getLiveSupport (device) {
      return PlayerComponent.getLiveSupport(device);
    }

    BigscreenPlayer.getLiveSupport = getLiveSupport;

    BigscreenPlayer.version = Version;

    return BigscreenPlayer;
  }
);
