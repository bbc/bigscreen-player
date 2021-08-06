import WindowTypes from './models/windowtypes';
import LiveSupport from'./models/livesupport';
import TransferFormats from './models/transferformats';
import PluginEnums from './pluginenums';
import MediaSources from './mediasources';
import Plugins from './plugins';
import ManifestLoader from './manifest/manifestloader'

window.bigscreenPlayer = {}

jest.mock('./plugins', () => {
  return {
    interface: {
      onErrorCleared: jest.fn(),
      onBuffering: jest.fn(),
      onBufferingCleared: jest.fn(),
      onError: jest.fn(),
      onFatalError: jest.fn(),
      onErrorHandled: jest.fn(),
      onSubtitlesLoadError: jest.fn()
    }
  }
});

jest.mock('./manifest/manifestloader');

var mockTimeObject = { windowStartTime: 10, windowEndTime: 100, timeCorrection: 0 };

const setupMockManifestLoaderSuccess = (transferFormat) => {
transferFormat = transferFormat ?? TransferFormats.DASH;

ManifestLoader.load = jest.fn((_url, _serverDate, callbacks) =>
  callbacks.onSuccess({
    transferFormat: transferFormat,
    time: mockTimeObject
  }));
};

const setupMockManifestLoaderFail = () => {
  ManifestLoader.load = jest.fn((_url, _serverDate, callbacks) => callbacks.onError());
};

const setupMockManifestLoaderFailOnce = (transferFormat) => {
  transferFormat = transferFormat ?? TransferFormats.DASH;
  var hasFailedOnce = false;

  ManifestLoader.load = jest.fn((_url, _serverDate, callbacks) => {
    if (hasFailedOnce) {
      callbacks.onSuccess({
        transferFormat: transferFormat,
        time: mockTimeObject
      });
    } else {
      hasFailedOnce = true;
      callbacks.onError();
    }
  });
};

function createSpyObj (methodNames) {
  return methodNames.reduce((obj, method) => { obj[method] = jest.fn(); return obj; }, {});
};

describe('Media Sources', function () {
  var testSources;
  var testSubtitlesSources;
  var testMedia;
  var FAILOVER_RESET_TIMEOUT = 60000;
  var SEGMENT_LENGTH = 3.84;
  var testCallbacks;

  var currentStrategy = window.bigscreenPlayer.playbackStrategy;

  beforeEach(function () {
    jest.useFakeTimers();

    testCallbacks = createSpyObj(['onSuccess', 'onError']);
  
    testSources = [
      {url: 'http://source1.com/', cdn: 'http://supplier1.com/'},
      {url: 'http://source2.com/', cdn: 'http://supplier2.com/'}
    ];
    testSubtitlesSources = [
      {url: 'http://subtitlessource1.com/', cdn: 'http://supplier1.com/', segmentLength: SEGMENT_LENGTH},
      {url: 'http://subtitlessource2.com/', cdn: 'http://supplier2.com/', segmentLength: SEGMENT_LENGTH}
    ];

    testMedia = {
      urls: testSources,
      captions: testSubtitlesSources,
      playerSettings: {
        failoverResetTime: FAILOVER_RESET_TIMEOUT
      }
    };

    setupMockManifestLoaderSuccess();
  });

  afterEach(function () {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    window.bigscreenPlayer.playbackStrategy = currentStrategy;

    jest.useRealTimers();
  });

  describe('init', function () {
    it('throws an error when initialised with no sources', function () {
      expect(function () {
        var mediaSources = MediaSources();
        testMedia.urls = [];
        mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
        mediaSources.currentSource();
      }).toThrow(new Error('Media Sources urls are undefined'));
    });

    it('clones the urls', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      testSources[0].url = 'clonetest';

      expect(mediaSources.currentSource()).toEqual('http://source1.com/');
    });

    it('throws an error when callbacks are undefined', function () {
      expect(function () {
        var mediaSources = MediaSources();
        mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {});
      }).toThrow(new Error('Media Sources callbacks are undefined'));

      expect(function () {
        var mediaSources = MediaSources();
        mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {onSuccess: function () {}});
      }).toThrow(new Error('Media Sources callbacks are undefined'));

      expect(function () {
        var mediaSources = MediaSources();
        mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, {onError: function () {}});
      }).toThrow(new Error('Media Sources callbacks are undefined'));
    });

    it('calls onSuccess callback immediately for STATIC window content', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

      expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
    });

    it('calls onSuccess callback immediately for LIVE content on a PLAYABLE device', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.PLAYABLE, testCallbacks);

      expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
    });

    it('calls onSuccess callback when manifest loader returns on success for SLIDING window content', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      expect(testCallbacks.onSuccess).toHaveBeenCalledWith();
    });

    it('calls onSuccess callback when manifest loader fails and there is a source to failover to that completes', function () {
      setupMockManifestLoaderFailOnce();

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      expect(testCallbacks.onSuccess).toHaveBeenCalledTimes(1);
    });

    it('calls onError callback when manifest loader fails and there are insufficent sources to failover to', function () {
      setupMockManifestLoaderFail();
      
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      expect(testCallbacks.onError).toHaveBeenCalledWith({error: 'manifest'});
    });

    it('sets time data correcly when manifest loader successfully returns', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      expect(mediaSources.time()).toEqual(mockTimeObject);
    });

    it('overrides the subtitlesRequestTimeout when set in media object', function () {
      var mediaSources = MediaSources();
      var overriddenTimeout = 60000;

      testMedia.subtitlesRequestTimeout = overriddenTimeout;
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      expect(mediaSources.subtitlesRequestTimeout()).toEqual(overriddenTimeout);
    });
  });

  describe('failover', function () {
    var postFailoverAction;
    var onFailureAction;

    beforeEach(function () {
      postFailoverAction = jest.fn();
      onFailureAction = jest.fn();
    });

    it('should load the manifest from the next url if manifest load is required', function () {      
      var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

      setupMockManifestLoaderSuccess(TransferFormats.HLS);

      var serverDate = new Date();
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, serverDate, WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      expect(ManifestLoader.load).toHaveBeenCalledWith(testSources[1].url, serverDate, expect.anything());
    });

    it('When there are sources to failover to, it calls the post failover callback', function () {
      var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      expect(postFailoverAction).toHaveBeenCalledWith();
      expect(onFailureAction).not.toHaveBeenCalledWith();
    });

    it('When there are no more sources to failover to, it calls failure action callback', function () {
      var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};
      testMedia.urls.pop();

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      expect(onFailureAction).toHaveBeenCalledWith();
      expect(postFailoverAction).not.toHaveBeenCalledWith();
    });

    it('When there are sources to failover to, it emits correct plugin event', function () {
      var failoverInfo = {errorMessage: 'test error', isBufferingTimeoutError: true};

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      var pluginData = {
        status: PluginEnums.STATUS.FAILOVER,
        stateType: PluginEnums.TYPE.ERROR,
        isBufferingTimeoutError: true,
        cdn: 'http://supplier1.com/',
        newCdn: 'http://supplier2.com/',
        isInitialPlay: undefined,
        timeStamp: expect.any(Object)
      };

      expect(Plugins.interface.onErrorHandled).toHaveBeenCalledWith(expect.objectContaining(pluginData));
    });

    it('Plugin event not emitted when there are no sources to failover to', function () {
      var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};
      testMedia.urls.pop();

      var mediaSources = MediaSources();

      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      expect(Plugins.interface.onErrorHandled).not.toHaveBeenCalled();
    });

    it('moves the specified service location to the top of the list', function () {
      var failoverInfo = {
        errorMessage: 'failover',
        isBufferingTimeoutError: true,
        serviceLocation: 'http://source3.com/?key=value#hash'
      };

      var mediaSources = MediaSources();

      testMedia.urls.push({url: 'http://source3.com/', cdn: 'http://supplier3.com/'});
      testMedia.urls.push({url: 'http://source4.com/', cdn: 'http://supplier4.com/'});

      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      expect(mediaSources.currentSource()).toEqual('http://source3.com/');
    });

    it('selects the next CDN when the service location is not in the CDN list', function () {
      var failoverInfo = {
        errorMessage: 'failover',
        isBufferingTimeoutError: true,
        serviceLocation: 'http://sourceInfinity.com/?key=value#hash'
      };

      var mediaSources = MediaSources();

      testMedia.urls.push({url: 'http://source3.com/', cdn: 'http://supplier3.com/'});
      testMedia.urls.push({url: 'http://source4.com/', cdn: 'http://supplier4.com/'});

      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      expect(mediaSources.currentSource()).toEqual('http://source2.com/');
    });
  });

  describe('isFirstManifest', function () {
    it('does not failover if service location is identical to current source cdn besides path', function () {
      var mediaSources = MediaSources();

      testMedia.urls = [
        { url: 'http://source1.com/path/to/thing.extension', cdn: 'http://cdn1.com' },
        { url: 'http://source2.com', cdn: 'http://cdn2.com' }];

      mediaSources.init(
        testMedia,
        new Date(),
        WindowTypes.STATIC,
        LiveSupport.SEEKABLE,
        testCallbacks);

      expect(mediaSources.currentSource()).toBe('http://source1.com/path/to/thing.extension');

      mediaSources.failover(
        function () { }, function () { },
        {
          duration: 999,
          currentTime: 1,
          errorMessage: '',
          isBufferingTimeoutError: false,
          serviceLocation: 'http://source1.com/path/to/different/thing.extension'
        });

      expect(mediaSources.currentSource()).toBe('http://source1.com/path/to/thing.extension');
    });

    it('does not failover if service location is identical to current source cdn besides hash and query', function () {
      var mediaSources = MediaSources();

      testMedia.urls = [
        {url: 'http://source1.com', cdn: 'http://cdn1.com'},
        {url: 'http://source2.com', cdn: 'http://cdn2.com'}];

      mediaSources.init(
        testMedia,
        new Date(),
        WindowTypes.STATIC,
        LiveSupport.SEEKABLE,
        testCallbacks);

      expect(mediaSources.currentSource()).toBe('http://source1.com');

      mediaSources.failover(
        function () {}, function () {},
        {
          duration: 999,
          currentTime: 1,
          errorMessage: '',
          isBufferingTimeoutError: false,
          serviceLocation: 'http://source1.com?key=value#hash'});

      expect(mediaSources.currentSource()).toBe('http://source1.com');
    });
  });

  describe('currentSource', function () {
    beforeEach(function () {
      testSources = [
        {url: 'http://source1.com/', cdn: 'http://supplier1.com/'},
        {url: 'http://source2.com/', cdn: 'http://supplier2.com/'}
      ];
    });

    it('returns the first media source url', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

      expect(mediaSources.currentSource()).toBe(testSources[0].url);
    });

    it('returns the second media source following a failover', function () {
      var postFailoverAction = jest.fn();
      var onFailureAction = jest.fn();
      var failoverInfo = {errorMessage: 'failover', isBufferingTimeoutError: true};

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failover(postFailoverAction, onFailureAction, failoverInfo);

      expect(mediaSources.currentSource()).toBe(testSources[1].url);
    });
  });

  describe('currentSubtitlesSource', function () {
    it('returns the first subtitles source url', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

      expect(mediaSources.currentSubtitlesSource()).toBe(testSubtitlesSources[0].url);
    });

    it('returns the second subtitle source following a failover', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failoverSubtitles();

      expect(mediaSources.currentSubtitlesSource()).toBe(testSubtitlesSources[1].url);
    });
  });

  describe('currentSubtitlesSegmentLength', function () {
    it('returns the first subtitles segment length', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

      expect(mediaSources.currentSubtitlesSegmentLength()).toBe(SEGMENT_LENGTH);
    });
  });

  describe('currentSubtitlesCdn', function () {
    it('returns the first subtitles cdn', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

      expect(mediaSources.currentSubtitlesCdn()).toBe(testSources[0].cdn);
    });
  });

  describe('failoverSubtitles', function () {
    var postFailoverAction;
    var onFailureAction;

    beforeEach(function () {
      postFailoverAction = jest.fn();
      onFailureAction = jest.fn();
    });

    it('When there are subtitles sources to failover to, it calls the post failover callback', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failoverSubtitles(postFailoverAction, onFailureAction);

      expect(postFailoverAction).toHaveBeenCalledTimes(1);
      expect(onFailureAction).not.toHaveBeenCalled();
    });

    it('When there are no more subtitles sources to failover to, it calls failure action callback', function () {
      testMedia.captions.pop();

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failoverSubtitles(postFailoverAction, onFailureAction);

      expect(onFailureAction).toHaveBeenCalledTimes(1);
      expect(postFailoverAction).not.toHaveBeenCalled();
    });

    it('fires onSubtitlesLoadError plugin with a correct parameters when there are sources available to failover to', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failoverSubtitles(postFailoverAction, onFailureAction, 404);

      expect(Plugins.interface.onSubtitlesLoadError).toHaveBeenCalledWith({status: 404, severity: PluginEnums.STATUS.FAILOVER, cdn: 'http://supplier1.com/'});
    });

    it('fires onSubtitlesLoadError plugin with a correct parameters when there are no sources available to failover to', function () {      
      testMedia.captions.pop();

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      mediaSources.failoverSubtitles(postFailoverAction, onFailureAction, 404);

      expect(Plugins.interface.onSubtitlesLoadError).toHaveBeenCalledWith({status: 404, severity: PluginEnums.STATUS.FATAL, cdn: 'http://supplier1.com/'});
    });
  });

  describe('availableSources', function () {
    it('returns an array of media source urls', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);

      expect(mediaSources.availableSources()).toEqual(['http://source1.com/', 'http://source2.com/']);
    });
  });

  describe('should Failover', function () {
    var mediaSources;
    describe('when window type is STATIC', function () {
      beforeEach(function () {
        mediaSources = MediaSources();
        mediaSources.init(testMedia, new Date(), WindowTypes.STATIC, LiveSupport.SEEKABLE, testCallbacks);
      });

      it('should failover if current time is greater than 5 seconds from duration', function () {
        var mediaSourceCallbacks = createSpyObj(['onSuccess', 'onError']);

        var failoverParams = {
          duration: 100,
          currentTime: 94,
          errorMessage: 'test error',
          isBufferingTimeoutError: false
        };

        mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

        expect(mediaSourceCallbacks.onSuccess).toHaveBeenCalledTimes(1);
      });

      it('should not failover if current time is within 5 seconds of duration', function () {
        var mediaSourceCallbacks = createSpyObj(['onSuccess', 'onError']);

        var failoverParams = {
          duration: 100,
          currentTime: 96,
          errorMessage: 'test error',
          isBufferingTimeoutError: false
        };

        mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

        expect(mediaSourceCallbacks.onError).toHaveBeenCalledTimes(1);
      });

      it('should failover if playback has not yet started', function () {
        var mediaSourceCallbacks = createSpyObj(['onSuccess', 'onError']);

        var failoverParams = {
          duration: 0,
          currentTime: undefined,
          errorMessage: 'test error',
          isBufferingTimeoutError: false
        };

        mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

        expect(mediaSourceCallbacks.onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    describe('when window type is not STATIC', function () {
      describe('and transfer format is DASH', function () {
        it('should not reload the manifest', function () {
          setupMockManifestLoaderSuccess();

          mediaSources = MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.GROWING, LiveSupport.SEEKABLE, testCallbacks);
 
          var failoverParams = {
            errorMessage: 'test error',
            isBufferingTimeoutError: false
          };

          ManifestLoader.load.mock.calls = [];

          mediaSources.failover(() => {}, () => {}, failoverParams);

          expect(ManifestLoader.load).not.toHaveBeenCalled();
        });
      });

      describe('and transfer format is HLS', function () {
        it('should reload the manifest', function () {
          setupMockManifestLoaderSuccess(TransferFormats.HLS);

          mediaSources = MediaSources();
          mediaSources.init(testMedia, new Date(), WindowTypes.GROWING, LiveSupport.SEEKABLE, testCallbacks);

          var mediaSourceCallbacks = createSpyObj(['onSuccess', 'onError']);

          var failoverParams = {
            errorMessage: 'test error',
            isBufferingTimeoutError: false
          };

          ManifestLoader.load.mock.calls = [];

          mediaSources.failover(mediaSourceCallbacks.onSuccess, mediaSourceCallbacks.onError, failoverParams);

          expect(ManifestLoader.load).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('refresh', function () {
    it('updates the mediasources time data', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      var existingSource = mediaSources.currentSource();

      var expectedTime = {
        windowStartTime: 1000000,
        windowEndTime: 1234567
      };

      // test the current time hasn't changed
      expect(mediaSources.time()).toEqual(mockTimeObject);

      // update it
      mockTimeObject = expectedTime;

      var callbacks = createSpyObj(['onSuccess', 'onError']);
      mediaSources.refresh(callbacks.onSuccess, callbacks.onError);

      expect(mediaSources.time()).toEqual(expectedTime);
      expect(mediaSources.currentSource()).toEqual(existingSource);
    });
  });

  describe('failoverTimeout', function () {
    var noop = function () {};
    var error = {errorMessage: 'oops', isBufferingTimeoutError: false};

    it('should add the cdn that failed back in to available cdns after a timeout', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);
    
      var expectedCdns = mediaSources.availableSources().reverse();

      mediaSources.failover(noop, noop, error);

      jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT);

      expect(mediaSources.availableSources()).toEqual(expectedCdns);
    });

    it('should not contain the cdn that failed before the timeout has occured', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);
    
      var excludedCdn = mediaSources.availableSources()[0];

      mediaSources.failover(noop, noop, error);

      expect(mediaSources.availableSources()).not.toContain(excludedCdn);
    });

    it('should not preserve timers over teardown boundaries', function () {
      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);
    
      mediaSources.failover(noop, noop, error);

      mediaSources.tearDown();

      jest.advanceTimersByTime(FAILOVER_RESET_TIMEOUT);

      expect(mediaSources.availableSources()).toEqual([]);
    });
  });

  describe('failoverSort', function () {
    it('called when provided as an override in playerSettings', function () {
      var fakeSort = jest.fn(() => testMedia.urls);

      var failoverParams = {
        duration: 500,
        currentTime: 42,
        errorMessage: 'buffering-time-out',
        isBufferingTimeoutError: true
      };

      testMedia.playerSettings = {
        failoverSort: fakeSort
      };

      var mediaSources = MediaSources();
      mediaSources.init(testMedia, new Date(), WindowTypes.SLIDING, LiveSupport.SEEKABLE, testCallbacks);

      function noop () {}

      mediaSources.failover(noop, noop, failoverParams);

      expect(fakeSort).toHaveBeenCalledTimes(1);
    });
  });
});
