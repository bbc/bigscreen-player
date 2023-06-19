import ManifestParser from "./manifestparser"
import TransferFormats from "../models/transferformats"
import LoadUrl from "../utils/loadurl"

function retrieveDashManifest(url, { windowType, initialWallclockTime } = {}) {
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

      return ManifestParser.parse(xml, { initialWallclockTime, windowType, type: "mpd" })
    })
    .then((time) => ({ time, transferFormat: TransferFormats.DASH }))
    .catch((error) => {
      if (error.message.indexOf("DASH") !== -1) {
        throw error
      }

      throw new Error("Unable to retrieve DASH XML response")
    })
}

function retrieveHLSManifest(url, { windowType } = {}) {
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

    return retrieveHLSLivePlaylist(streamUrl, { windowType })
  })
}

function retrieveHLSLivePlaylist(url, { windowType } = {}) {
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

      return ManifestParser.parse(text, { windowType, type: "m3u8" })
    })
    .then((time) => ({ time, transferFormat: TransferFormats.HLS }))
}

function getStreamUrl(data) {
  const match = /#EXT-X-STREAM-INF:.*[\n\r]+(.*)[\n\r]?/.exec(data)

  if (match) {
    return match[1]
  }
}

export default {
  load: (mediaUrl, { windowType, initialWallclockTime } = {}) => {
    if (/\.mpd($|\?.*$)/.test(mediaUrl)) {
      return retrieveDashManifest(mediaUrl, { windowType, initialWallclockTime })
    }

    if (/\.m3u8($|\?.*$)/.test(mediaUrl)) {
      return retrieveHLSManifest(mediaUrl, { windowType, initialWallclockTime })
    }

    return Promise.reject(new Error("Invalid media url"))
  },
}
