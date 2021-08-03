import ManifestLoader from './manifestloader'
import TransferFormats from '../models/transferformats'
import LoadUrl from '../utils/loadurl'

jest.mock('../utils/loadurl')

describe('Manifest Loader', function () {
  describe('With HLS media', function () {
    it('Retrieves a matched HLS url', function () {
      var url = 'hlsurl.m3u8'
      ManifestLoader.load(url, undefined, {})

      expect(LoadUrl).toHaveBeenCalledWith(url, expect.anything())
    })
  })

  describe('With Dash Media', function () {
    it('Retrieves a matched DASH url', function () {
      var url = 'dashurl.mpd'
      ManifestLoader.load(url, undefined, {})

      expect(LoadUrl).toHaveBeenCalledWith(url, expect.anything())
    })
  })

  describe('With neither Dash or HLS', function () {
    it('Calls error when no hls urls found', function () {
      var callbackSpies = {
        onError: jest.fn()
      }
      var url = 'bad_url'
      ManifestLoader.load(url, undefined, callbackSpies)

      expect(callbackSpies.onError).toHaveBeenCalledWith('Invalid media url')
    })
  })

  describe('On manifestDataSource load', function () {
    var callbackSpies
    var dashResponse = '<?xml version="1.0" encoding="utf-8"?> <MPD xmlns="urn:mpeg:dash:schema:mpd:2011"></MPD>'
    var hlsMasterResponse = '#EXTM3U\n' +
      '#EXT-X-VERSION:2\n' +
      '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2255680,CODECS="mp4a.40.2,avc1.100.31",RESOLUTION=1024x576\n' +
      'live.m3u8\n' +
      '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=433540,CODECS="mp4a.40.2,avc1.66.30",RESOLUTION=384x216\n' +
      'bar.m3u8\n'
    var hlsLiveResponse = 'hls live playlist'

    beforeEach(function () {
      callbackSpies = {
        onSuccess: jest.fn(),
        onError: jest.fn()
      }
    })

    describe('DASH manifest fetching', function () {
      it('Calls success when network returns a DASH response', function () {
        LoadUrl.mockImplementationOnce(function (url, config) {
          config.onLoad(dashResponse)
        })

        ManifestLoader.load('http://foo.bar/test.mpd', undefined, callbackSpies)

        var expectedResponse = {
          transferFormat: TransferFormats.DASH,
          time: expect.any(Object)
        }

        expect(callbackSpies.onSuccess).toHaveBeenCalledWith(expectedResponse)
      })

      it('Calls error when response is invalid', function () {
        LoadUrl.mockImplementationOnce(function (url, config) {
          config.onLoad()
        })

        ManifestLoader.load('http://foo.bar/test.mpd', undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve DASH XML response')
      })

      it('Calls error when network request fails', function () {
        LoadUrl.mockImplementationOnce(function (url, config) {
          config.onError()
        })

        ManifestLoader.load('http://foo.bar/test.mpd', undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve DASH manifest')
      })
    })

    describe('HLS manifest fetching', function () {
      it('Calls success when network returns a HLS live playlist response', function () {
        LoadUrl.mockImplementationOnce(function (url, config) {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce(function (url, config) {
          config.onLoad(undefined, hlsLiveResponse)
        })

        ManifestLoader.load('http://foo.bar/test.m3u8', undefined, callbackSpies)

        var expectedResponse = {
          transferFormat: TransferFormats.HLS,
          time: expect.any(Object)
        }

        expect(callbackSpies.onSuccess).toHaveBeenCalledWith(expectedResponse)
      })

      it('calls error when network request fails', function () {
        LoadUrl.mockImplementation(function (url, config) {
          config.onError()
        })

        ManifestLoader.load('http://foo.bar/test.m3u8', undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve HLS master playlist')
      })

      it('calls error if not valid HLS response', function () {
        LoadUrl.mockImplementation(function (url, config) {
          config.onLoad()
        })

        ManifestLoader.load('http://foo.bar/test.m3u8', undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve HLS master playlist')
      })

      it('calls error when HLS live playlist response is invalid', function () {
        LoadUrl.mockImplementationOnce(function (url, config) {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce(function (url, config) {
          config.onLoad()
        })

        ManifestLoader.load('http://foo.bar/test.m3u8', undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith('Unable to retrieve HLS live playlist')
      })

      it('calls error when network request for HLS live playlist fails', function () {
        LoadUrl.mockImplementationOnce(function (url, config) {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce(function (url, config) {
          config.onError()
        })

        ManifestLoader.load('http://foo.bar/test.m3u8', undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith('Network error: Unable to retrieve HLS live playlist')
      })
    })
  })
})
