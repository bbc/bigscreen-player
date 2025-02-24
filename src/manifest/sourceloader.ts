import ManifestParser, { TimeInfo } from "./manifestparser"
import { ManifestType } from "../models/manifesttypes"
import { TransferFormat } from "../models/transferformats"
import LoadUrl from "../utils/loadurl"
import isError from "../utils/iserror"

function parseXmlString(text: string): Document {
  const parser = new DOMParser()

  const document = parser.parseFromString(text, "application/xml")

  // DOMParser lists the XML errors in the document
  if (document.querySelector("parsererror") != null) {
    throw new TypeError(`Failed to parse input string to XML`)
  }

  return document
}

function retrieveDashManifest(url: string) {
  return new Promise<Document | null>((resolveLoad, rejectLoad) =>
    LoadUrl(url, {
      method: "GET",
      headers: {},
      timeout: 10000,
      // Try to parse ourselves if the XHR parser failed due to f.ex. content-type
      onLoad: (responseXML, responseText) => resolveLoad(responseXML || parseXmlString(responseText)),
      onError: () => rejectLoad(new Error("Network error: Unable to retrieve DASH manifest")),
    })
  )
    .then((xml) => {
      if (xml == null) {
        throw new TypeError("Unable to retrieve DASH XML response")
      }

      return ManifestParser.parse({ body: xml, type: TransferFormat.DASH })
    })
    .then((time) => ({ time, transferFormat: TransferFormat.DASH }))
    .catch((error) => {
      if (isError(error) && error.message.indexOf("DASH") !== -1) {
        throw error
      }

      throw new Error("Unable to retrieve DASH XML response")
    })
}

function retrieveHLSManifest(url: string) {
  return new Promise<string | null>((resolveLoad, rejectLoad) =>
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

function retrieveHLSLivePlaylist(url: string) {
  return new Promise<string | null>((resolveLoad, rejectLoad) =>
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

function getStreamUrl(data: string) {
  const match = /#EXT-X-STREAM-INF:.*[\n\r]+(.*)[\n\r]?/.exec(data)

  return match ? match[1] : null
}

export default {
  load: (mediaUrl: string): Promise<{ transferFormat: TransferFormat; time: TimeInfo }> => {
    if (/\.mpd(\?.*)?$/.test(mediaUrl)) {
      return retrieveDashManifest(mediaUrl)
    }

    if (/\.m3u8(\?.*)?$/.test(mediaUrl)) {
      return retrieveHLSManifest(mediaUrl)
    }

    if (/\.mp4(\?.*)?$/.test(mediaUrl)) {
      return Promise.resolve({
        time: {
          manifestType: ManifestType.STATIC,
          presentationTimeOffsetInMilliseconds: 0,
          timeShiftBufferDepthInMilliseconds: 0,
          availabilityStartTimeInMilliseconds: 0,
        },
        transferFormat: TransferFormat.PLAIN,
      })
    }

    return Promise.reject(new Error("Invalid media url"))
  },
}
