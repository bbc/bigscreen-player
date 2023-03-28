import TransferFormats from "../models/transferformats"
import WindowTypes from "../models/windowtypes"
import Plugins from "../plugins"
import LoadUrl from "../utils/loadurl"
import DashManifests from "./stubData/dashmanifests"
import HlsManifests from "./stubData/hlsmanifests"
import ManifestLoader from "./manifestloader"

jest.mock("../utils/loadurl")

describe("ManifestLoader", () => {
  it.each(["m3u8", "mpd"])("fetches %s manifests", (fileExt) => {
    const url = `mock://some.manifest.${fileExt}`

    ManifestLoader.load(url)

    expect(LoadUrl).toHaveBeenCalledWith(url, expect.anything())
  })

  it("calls 'error' callback for a bad manifest url", () => {
    const onErrorStub = jest.fn()

    ManifestLoader.load("mock://some.url/", { onError: onErrorStub })

    expect(onErrorStub).toHaveBeenCalledWith("Invalid media url")
  })

  describe("handling manifests", () => {
    beforeAll(() => {
      jest.spyOn(Plugins.interface, "onManifestParseError")
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe("fetching DASH manifests", () => {
      it.each([
        [WindowTypes.GROWING, DashManifests.GROWING_WINDOW],
        [WindowTypes.SLIDING, DashManifests.SLIDING_WINDOW],
        [WindowTypes.STATIC, DashManifests.STATIC_WINDOW],
      ])("calls 'success' callback for a valid DASH %s manifest", (windowType, manifestDocument) => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(manifestDocument)
        })

        const onSuccessStub = jest.fn()

        ManifestLoader.load("mock://some.manifest/test.mpd", { windowType, onSuccess: onSuccessStub })

        expect(Plugins.interface.onManifestParseError).not.toHaveBeenCalled()

        expect(onSuccessStub).toHaveBeenCalledWith({
          transferFormat: TransferFormats.DASH,
          time: expect.any(Object),
        })
      })

      it("calls 'error' callback when response is invalid", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad()
        })

        const onErrorStub = jest.fn()

        ManifestLoader.load("http://foo.bar/test.mpd", { onError: onErrorStub })

        expect(onErrorStub).toHaveBeenCalledWith("Unable to retrieve DASH XML response")
      })

      it("calls 'error' callback when network request fails", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onError()
        })

        const onErrorStub = jest.fn()

        ManifestLoader.load("http://foo.bar/test.mpd", { onError: onErrorStub })

        expect(onErrorStub).toHaveBeenCalledWith("Network error: Unable to retrieve DASH manifest")
      })
    })

    describe("fetching HLS manifests", () => {
      const hlsMasterResponse =
        "#EXTM3U\n" +
        "#EXT-X-VERSION:2\n" +
        '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2255680,CODECS="mp4a.40.2,avc1.100.31",RESOLUTION=1024x576\n' +
        "live.m3u8\n" +
        '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=433540,CODECS="mp4a.40.2,avc1.66.30",RESOLUTION=384x216\n' +
        "bar.m3u8\n"

      it.each(Object.values(WindowTypes))(
        "calls 'success' callback when a valid HLS playlist is loaded for windowType '%s'",
        (windowType) => {
          LoadUrl.mockImplementationOnce((url, config) => {
            config.onLoad(undefined, hlsMasterResponse)
          }).mockImplementationOnce((url, config) => {
            config.onLoad(undefined, HlsManifests.VALID_PROGRAM_DATETIME)
          })

          const onSuccessStub = jest.fn()

          ManifestLoader.load("http://foo.bar/test.m3u8", { windowType, onSuccess: onSuccessStub })

          expect(Plugins.interface.onManifestParseError).not.toHaveBeenCalled()

          expect(onSuccessStub).toHaveBeenCalledWith({
            transferFormat: TransferFormats.HLS,
            time: expect.any(Object),
          })
        }
      )

      it("calls error when network request fails", () => {
        LoadUrl.mockImplementation((url, config) => {
          config.onError()
        })

        const onErrorStub = jest.fn()

        ManifestLoader.load("http://foo.bar/test.m3u8", { onError: onErrorStub })

        expect(onErrorStub).toHaveBeenCalledWith("Network error: Unable to retrieve HLS master playlist")
      })

      it("calls error if not valid HLS response", () => {
        LoadUrl.mockImplementation((url, config) => {
          config.onLoad()
        })

        const onErrorStub = jest.fn()

        ManifestLoader.load("http://foo.bar/test.m3u8", { onError: onErrorStub })

        expect(onErrorStub).toHaveBeenCalledWith("Unable to retrieve HLS master playlist")
      })

      it("calls error when HLS live playlist response is invalid", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onLoad()
        })

        const onErrorStub = jest.fn()

        ManifestLoader.load("http://foo.bar/test.m3u8", { onError: onErrorStub })

        expect(onErrorStub).toHaveBeenCalledWith("Unable to retrieve HLS live playlist")
      })

      it("calls error when network request for HLS live playlist fails", () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onError()
        })

        const onErrorStub = jest.fn()

        ManifestLoader.load("http://foo.bar/test.m3u8", { onError: onErrorStub })

        expect(onErrorStub).toHaveBeenCalledWith("Network error: Unable to retrieve HLS live playlist")
      })
    })
  })
})
