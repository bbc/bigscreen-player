import { ManifestType } from "../models/manifesttypes"
import { TransferFormat } from "../models/transferformats"
import Plugins from "../plugins"
import getError from "../testutils/geterror"
import LoadUrl from "../utils/loadurl"
import DashManifests, { DASH_MANIFEST_STRINGS } from "./stubData/dashmanifests"
import HlsManifests from "./stubData/hlsmanifests"
import ManifestLoader from "./sourceloader"

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

  describe("handling sources", () => {
    beforeAll(() => {
      jest.spyOn(Plugins.interface, "onManifestParseError")
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe("fetching DASH sources", () => {
      it.each([
        [ManifestType.STATIC, DashManifests.STATIC_NO_PTO()],
        [ManifestType.DYNAMIC, DashManifests.PTO_NO_TIMESHIFT()],
      ])("resolves to parsed metadata for a valid DASH '%s' manifest", async (_, manifestEl) => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(manifestEl)
        })

        const { transferFormat, time } = await ManifestLoader.load("mock://some.manifest/test.mpd")

        expect(transferFormat).toBe(TransferFormat.DASH)
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

      it("falls back to a DOMParser if the XMLHTTPRequest client's parser fails", async () => {
        jest.spyOn(DOMParser.prototype, "parseFromString")

        LoadUrl.mockImplementationOnce((url, config) => config.onLoad(null, DASH_MANIFEST_STRINGS.STATIC_NO_PTO))

        const { transferFormat, time } = await ManifestLoader.load("mock://some.manifest/test.mpd")

        expect(transferFormat).toBe(TransferFormat.DASH)
        expect(time).toEqual(expect.any(Object))

        expect(Plugins.interface.onManifestParseError).not.toHaveBeenCalled()

        expect(DOMParser.prototype.parseFromString).toHaveBeenCalledTimes(1)
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

    describe("fetching HLS sources", () => {
      const hlsMasterResponse =
        "#EXTM3U\n" +
        "#EXT-X-VERSION:2\n" +
        '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2255680,CODECS="mp4a.40.2,avc1.100.31",RESOLUTION=1024x576\n' +
        "live.m3u8\n" +
        '#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=433540,CODECS="mp4a.40.2,avc1.66.30",RESOLUTION=384x216\n' +
        "bar.m3u8\n"

      it("resolves to parsed metadata for a valid HLS 'dynamic' playlist", async () => {
        LoadUrl.mockImplementationOnce((url, config) => {
          config.onLoad(undefined, hlsMasterResponse)
        }).mockImplementationOnce((url, config) => {
          config.onLoad(undefined, HlsManifests.VALID_PROGRAM_DATETIME_NO_ENDLIST)
        })

        const { transferFormat, time } = await ManifestLoader.load("http://foo.bar/test.m3u8")

        expect(transferFormat).toBe(TransferFormat.HLS)
        expect(time).toEqual(expect.any(Object))

        expect(Plugins.interface.onManifestParseError).not.toHaveBeenCalled()
      })

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

    describe("handling MP4 sources", () => {
      it("resolves to metadata reflecting an on-demand stream", async () => {
        const { transferFormat, time } = await ManifestLoader.load("http://foo.bar/test.mp4")

        expect(transferFormat).toBe(TransferFormat.PLAIN)
        expect(time).toEqual({
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
        })
      })
    })
  })
})
