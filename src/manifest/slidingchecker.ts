import { TransferFormat } from "../main"
import LoadUrl from "../utils/loadurl"
import { TimeInfo } from "./manifestparser"

type PlaylistData = {
  firstLoadTime: number
  firstSegmentLengthInMilliseconds: number
}

function getM3U8ProgramDateTimeInMilliseconds(data: string) {
  const match = /^#EXT-X-PROGRAM-DATE-TIME:(.*)$/m.exec(data)

  if (match == null) {
    return 0
  }

  const parsedDate = Date.parse(match[1])

  return isNaN(parsedDate) ? 0 : parsedDate
}

function getM3U8FirstSegmentLengthInMilliseconds(data: string): number {
  const regex = /#EXTINF:(\d+(?:\.\d+)?)/g
  const length = regex.exec(data)[1]

  return parseFloat(length) * 1000
}

function getStreamUrl(data: string) {
  const match = /#EXT-X-STREAM-INF:.*[\n\r]+(.*)[\n\r]?/.exec(data)

  if (match) {
    return match[1]
  }
}

function retrieveHLSData(manifestURL: string) {
  return new Promise((resolveLoad, rejectLoad) =>
    LoadUrl(manifestURL, {
      method: "GET",
      headers: {},
      timeout: 10000,
      onLoad: (_, responseText) => resolveLoad(responseText),
      onError: () => rejectLoad(new Error("Network error: Unable to retrieve HLS master playlist")),
    })
  ).then((text: string) => {
    let streamUrl = getStreamUrl(text)

    if (!streamUrl || typeof streamUrl !== "string") {
      throw new TypeError("Unable to retrieve playlist url from HLS master playlist")
    }

    if (streamUrl.indexOf("http") !== 0) {
      const parts = manifestURL.split("/")

      parts.pop()
      parts.push(streamUrl)
      streamUrl = parts.join("/")
    }

    return new Promise((resolveLoad, rejectLoad) =>
      LoadUrl(streamUrl, {
        method: "GET",
        headers: {},
        timeout: 10000,
        onLoad: (_, responseText) => resolveLoad(responseText),
        onError: () => rejectLoad(new Error("Network error: Unable to retrieve HLS live playlist")),
      })
    )
      .then((livePlaylistText: string) => {
        const firstSegmentLengthInMilliseconds = getM3U8FirstSegmentLengthInMilliseconds(livePlaylistText)
        const firstLoadTime = getM3U8ProgramDateTimeInMilliseconds(livePlaylistText)

        const data: PlaylistData = {
          firstSegmentLengthInMilliseconds,
          firstLoadTime,
        }

        return data
      })
      .catch(() => {})
  })
}

function isSliding(manifestURL: string, manifestData: TimeInfo): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (manifestData.transferFormat === TransferFormat.DASH) {
      // spiking with Date.now(), but will likely want to use timingResouce from the manifest
      const hasTimeShift = !!manifestData.timeShiftBufferDepthInMilliseconds
      resolve(
        hasTimeShift
          ? Date.now() - manifestData.availabilityStartTimeInMilliseconds >
              manifestData.timeShiftBufferDepthInMilliseconds
          : false
      )
    }

    retrieveHLSData(manifestURL)
      .then((firstManifestData: PlaylistData) => {
        setTimeout(() => {
          retrieveHLSData(manifestURL)
            .then((secondManifestData: PlaylistData) => {
              resolve(firstManifestData.firstLoadTime !== secondManifestData.firstLoadTime)
            })
            .catch(() => {
              reject(new Error("Unable to retrieve first manifest data"))
            })
        }, firstManifestData.firstSegmentLengthInMilliseconds + 500) // arbitrary half a second more than segment length
      })
      .catch(() => {
        reject(new Error("Unable to retrieve second manifest data"))
      })
  })
}

export default {
  isSliding,
}
