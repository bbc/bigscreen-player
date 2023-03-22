import ManifestLoader from "./manifestloader"
import TransferFormats from "../models/transferformats"
import LoadUrl from "../utils/loadurl"

jest.mock("../utils/loadurl")

describe("Manifest Loader", () => {
  describe("With HLS media", () => {
    it("Retrieves a matched HLS url", () => {
      const url = "hlsurl.m3u8"
      ManifestLoader.load(url, undefined, {})

      expect(LoadUrl).toHaveBeenCalledWith(url, expect.anything())
    })
  })

  describe("With Dash Media", () => {
    it("Retrieves a matched DASH url", () => {
      const url = "dashurl.mpd"
      ManifestLoader.load(url, undefined, {})

      expect(LoadUrl).toHaveBeenCalledWith(url, expect.anything())
    })
  })

  describe("With neither Dash or HLS", () => {
    it("Calls error when no hls urls found", () => {
      const callbackSpies = {
        onError: jest.fn(),
      }
      const url = "bad_url"
      ManifestLoader.load(url, undefined, callbackSpies)

      expect(callbackSpies.onError).toHaveBeenCalledWith("Invalid media url")
    })
  })

  describe("On manifestDataSource load", () => {
    let callbackSpies
    const dashResponse = '<?xml version="1.0" encoding="utf-8"?> <MPD xmlns="urn:mpeg:dash:schema:mpd:2011"></MPD>'
    const hlsMasterResponse =
      "#EXTM3U\n" +
      "#EXT-X-VERSION:2\n" +
      '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2255680,CODECS="mp4a.40.2,avc1.100.31",RESOLUTION=1024x576\n' +
      "live.m3u8\n" +
      '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=433540,CODECS="mp4a.40.2,avc1.66.30",RESOLUTION=384x216\n' +
      "bar.m3u8\n"
    const hlsLiveResponse = "hls live playlist"

    beforeEach(() => {
      callbackSpies = {
        onSuccess: jest.fn(),
        onError: jest.fn(),
      }
    })

    describe("DASH manifest fetching", () => {
      it("Calls success when network returns a DASH response", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(dashResponse)
        })

        ManifestLoader.load("http://foo.bar/test.mpd", undefined, callbackSpies)

        const expectedResponse = {
          transferFormat: TransferFormats.DASH,
          time: expect.any(Object),
        }

        expect(callbackSpies.onSuccess).toHaveBeenCalledWith(expectedResponse)
      })

      it("Calls error when response is invalid", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad()
        })

        ManifestLoader.load("http://foo.bar/test.mpd", undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith("Unable to retrieve DASH XML response")
      })

      it("Calls error when network request fails", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onError()
        })

        ManifestLoader.load("http://foo.bar/test.mpd", undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith("Network error: Unable to retrieve DASH manifest")
      })
    })

    describe("HLS manifest fetching", () => {
      it("Calls success when network returns a HLS live playlist response", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsLiveResponse)
        })

        ManifestLoader.load("http://foo.bar/test.m3u8", undefined, callbackSpies)

        const expectedResponse = {
          transferFormat: TransferFormats.HLS,
          time: expect.any(Object),
        }

        expect(callbackSpies.onSuccess).toHaveBeenCalledWith(expectedResponse)
      })

      it("calls error when network request fails", () => {
        LoadUrl.mockImplementation((url, config) => {
          config.onError()
        })

        ManifestLoader.load("http://foo.bar/test.m3u8", undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith("Network error: Unable to retrieve HLS master playlist")
      })

      it("calls error if not valid HLS response", () => {
        LoadUrl.mockImplementation((url, config) => {
          config.onLoad()
        })

        ManifestLoader.load("http://foo.bar/test.m3u8", undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith("Unable to retrieve HLS master playlist")
      })

      it("calls error when HLS live playlist response is invalid", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onLoad()
        })

        ManifestLoader.load("http://foo.bar/test.m3u8", undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith("Unable to retrieve HLS live playlist")
      })

      it("calls error when network request for HLS live playlist fails", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onError()
        })

        ManifestLoader.load("http://foo.bar/test.m3u8", undefined, callbackSpies)

        expect(callbackSpies.onError).toHaveBeenCalledWith("Network error: Unable to retrieve HLS live playlist")
      })
    })
  })
})
