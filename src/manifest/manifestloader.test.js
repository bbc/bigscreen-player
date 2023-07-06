import TransferFormats from "../models/transferformats"
import WindowTypes from "../models/windowtypes"
import Plugins from "../plugins"
import getError from "../testutils/geterror"
import LoadUrl from "../utils/loadurl"
import DashManifests, { appendTimingResource } from "./stubData/dashmanifests"
import HlsManifests from "./stubData/hlsmanifests"
import ManifestLoader from "./manifestloader"

jest.mock("../utils/loadurl")

describe("ManifestLoader", () => {
  it.each(["m3u8", "mpd"])("fetches a .%s manifest", (fileExt) => {
    const url = `mock://some.manifest.${fileExt}`

    ManifestLoader.load(url)

    expect(LoadUrl).toHaveBeenCalledWith(url, expect.any(Object))
  })

  it.each([
    ["m3u8", "p=q"],
    ["mpd", "p=q"],
    ["m3u8", "a=x", "b=y"],
    ["mpd", "u=v", "q=p"],
  ])("fetches a .%s manifest with query params ?%s", (fileExt, ...queryParams) => {
    const url = `mock://some.manifest.${fileExt}?${queryParams.join("&")}?`

    ManifestLoader.load(url)

    expect(LoadUrl).toHaveBeenCalledWith(url, expect.any(Object))
  })

  it("rejects when resource is not a recognised manifest type", () =>
    expect(ManifestLoader.load("mock://some.url/")).rejects.toThrow("Invalid media url"))

  describe("handling manifests", () => {
    beforeAll(() => {
      jest.spyOn(Plugins.interface, "onManifestParseError")
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe("fetching DASH manifests", () => {
      it.each([[WindowTypes.STATIC, DashManifests.STATIC_WINDOW()]])(
        "resolves to parsed metadata for a valid DASH '%s' manifest",
        async (windowType, manifestEl) => {
          LoadUrl.mockImplementationOnce((url, config) => {
            config.onLoad(manifestEl)
          })

          const { transferFormat, time } = await ManifestLoader.load("mock://some.manifest/test.mpd", {
            windowType,
          })

          expect(transferFormat).toBe(TransferFormats.DASH)
          expect(time).toEqual(expect.any(Object))

          expect(Plugins.interface.onManifestParseError).not.toHaveBeenCalled()
        }
      )

      it.each([
        [WindowTypes.GROWING, DashManifests.GROWING_WINDOW()],
        [WindowTypes.SLIDING, DashManifests.SLIDING_WINDOW()],
      ])("resolves to parsed metadata for a valid DASH '%s' manifest", async (windowType, manifestEl) => {
        appendTimingResource(manifestEl, "https://time.some-cdn.com/?iso")

        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(manifestEl)
        })

        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(new Date().toISOString())
        })

        const { transferFormat, time } = await ManifestLoader.load("mock://some.manifest/test.mpd", {
          windowType,
        })

        expect(transferFormat).toBe(TransferFormats.DASH)
        expect(time).toEqual(expect.any(Object))

        expect(Plugins.interface.onManifestParseError).not.toHaveBeenCalled()
      })

      it("rejects when response is invalid", async () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad()
        })

        expect(await getError(async () => ManifestLoader.load("http://foo.bar/test.mpd"))).toEqual(
          new Error("Unable to retrieve DASH XML response")
        )
      })

      it("rejects when network request fails", async () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onError()
        })

        expect(await getError(async () => ManifestLoader.load("http://foo.bar/test.mpd"))).toEqual(
          new Error("Network error: Unable to retrieve DASH manifest")
        )
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
        "resolves to parsed metadata for a valid HLS '%s' playlist",
        async (windowType) => {
          LoadUrl.mockImplementationOnce((url, config) => {
            config.onLoad(undefined, hlsMasterResponse)
          }).mockImplementationOnce((url, config) => {
            config.onLoad(undefined, HlsManifests.VALID_PROGRAM_DATETIME)
          })

          const { transferFormat, time } = await ManifestLoader.load("http://foo.bar/test.m3u8", { windowType })

          expect(transferFormat).toBe(TransferFormats.HLS)
          expect(time).toEqual(expect.any(Object))

          expect(Plugins.interface.onManifestParseError).not.toHaveBeenCalled()
        }
      )

      it("rejects when network request fails", async () => {
        LoadUrl.mockImplementation((url, config) => {
          config.onError()
        })

        expect(await getError(async () => ManifestLoader.load("http://foo.bar/test.m3u8"))).toEqual(
          new Error("Network error: Unable to retrieve HLS master playlist")
        )
      })

      it("calls error if not valid HLS response", async () => {
        LoadUrl.mockImplementation((url, config) => {
          config.onLoad()
        })

        expect(await getError(async () => ManifestLoader.load("http://foo.bar/test.m3u8"))).toEqual(
          new Error("Unable to retrieve HLS master playlist")
        )
      })

      it("rejects when HLS live playlist response is invalid", async () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onLoad()
        })

        expect(await getError(async () => ManifestLoader.load("http://foo.bar/test.m3u8"))).toEqual(
          new Error("Unable to retrieve HLS live playlist")
        )
      })

      it("calls error when network request for HLS live playlist fails", async () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onError()
        })

        expect(await getError(async () => ManifestLoader.load("http://foo.bar/test.m3u8"))).toEqual(
          new Error("Network error: Unable to retrieve HLS live playlist")
        )
      })
    })
  })
})
