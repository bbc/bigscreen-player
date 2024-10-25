import ManifestParser from "./manifestparser"
import TransferFormat from "../models/transferformats"
import LoadUrl from "../utils/loadurl"

function retrieveDashManifest(url, { initialWallclockTime } = {}) {
  return new Promise((resolveLoad, rejectLoad) =>
    LoadUrl(url, {
      method: "GET",
      headers: {},
      timeout: 10000,
      onLoad: (responseXML) => resolveLoad(responseXML),
      onError: () => rejectLoad(new Error("Network error: Unable to retrieve DASH manifest")),
    })
  )
    .then((xml) => {
      if (xml == null) {
        throw new TypeError("Unable to retrieve DASH XML response")
      }

      return ManifestParser.parse({ body: xml, type: TransferFormat.DASH }, { initialWallclockTime })
    })
    .then((time) => ({ time, transferFormat: TransferFormat.DASH }))
    .catch((error) => {
      if (error.message.indexOf("DASH") !== -1) {
        throw error
      }

      throw new Error("Unable to retrieve DASH XML response")
    })
}

function retrieveHLSManifest(url) {
  return new Promise((resolveLoad, rejectLoad) =>
    LoadUrl(url, {
      method: "GET",
      headers: {},
      timeout: 10000,
      onLoad: (_, responseText) => resolveLoad(responseText),
      onError: () => rejectLoad(new Error("Network error: Unable to retrieve HLS master playlist")),
    })
  ).then((text) => {
    if (!text || typeof text !== "string") {
      throw new TypeError("Unable to retrieve HLS master playlist")
    }

    let streamUrl = getStreamUrl(text)

    if (!streamUrl || typeof streamUrl !== "string") {
      throw new TypeError("Unable to retrieve playlist url from HLS master playlist")
    }

    if (streamUrl.indexOf("http") !== 0) {
      const parts = url.split("/")

      parts.pop()
      parts.push(streamUrl)
      streamUrl = parts.join("/")
    }

    return retrieveHLSLivePlaylist(streamUrl)
  })
}

function retrieveHLSLivePlaylist(url) {
  return new Promise((resolveLoad, rejectLoad) =>
    LoadUrl(url, {
      method: "GET",
      headers: {},
      timeout: 10000,
      onLoad: (_, responseText) => resolveLoad(responseText),
      onError: () => rejectLoad(new Error("Network error: Unable to retrieve HLS live playlist")),
    })
  )
    .then((text) => {
      if (!text || typeof text !== "string") {
        throw new TypeError("Unable to retrieve HLS live playlist")
      }

      return ManifestParser.parse({ body: text, type: TransferFormat.HLS })
    })
    .then((time) => ({ time, transferFormat: TransferFormat.HLS }))
}

function getStreamUrl(data) {
  const match = /#EXT-X-STREAM-INF:.*[\n\r]+(.*)[\n\r]?/.exec(data)

  if (match) {
    return match[1]
  }
}

export default {
  load: (mediaUrl, { initialWallclockTime } = {}) => {
    if (/\.mpd(\?.*)?$/.test(mediaUrl)) {
      return retrieveDashManifest(mediaUrl, { initialWallclockTime })
    }

    if (/\.m3u8(\?.*)?$/.test(mediaUrl)) {
      return retrieveHLSManifest(mediaUrl)
    }

    return Promise.reject(new Error("Invalid media url"))
  },
}
