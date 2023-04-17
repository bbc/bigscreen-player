import ManifestParser from "./manifestparser"
import TransferFormats from "../models/transferformats"
import LoadUrl from "../utils/loadurl"

function retrieveDashManifest(url, { windowType, initialWallclockTime, onError, onSuccess } = {}) {
  LoadUrl(url, {
    method: "GET",
    headers: {},
    timeout: 10000,
    onLoad: (responseXML, _responseText, _status) => {
      try {
        if (responseXML == null) {
          onError("Unable to retrieve DASH XML response")
          return
        }
        onSuccess({
          transferFormat: TransferFormats.DASH,
          time: ManifestParser.parse(responseXML, { initialWallclockTime, windowType, type: "mpd" }),
        })
      } catch {
        onError("Unable to retrieve DASH XML response")
      }
    },
    onError: () => {
      onError("Network error: Unable to retrieve DASH manifest")
    },
  })
}

function retrieveHLSManifest(url, { windowType, initialWallclockTime, onError, onSuccess } = {}) {
  LoadUrl(url, {
    method: "GET",
    headers: {},
    timeout: 10000,
    onLoad: (_responseXML, responseText) => {
      let streamUrl

      if (responseText) {
        streamUrl = getStreamUrl(responseText)
      }
      if (streamUrl) {
        if (streamUrl.indexOf("http") !== 0) {
          const parts = url.split("/")

          parts.pop()
          parts.push(streamUrl)
          streamUrl = parts.join("/")
        }
        loadLivePlaylist(streamUrl, { windowType, initialWallclockTime, onError, onSuccess })
      } else {
        onError("Unable to retrieve HLS master playlist")
      }
    },
    onError: () => {
      onError("Network error: Unable to retrieve HLS master playlist")
    },
  })
}

function loadLivePlaylist(url, { windowType, initialWallclockTime, onError, onSuccess } = {}) {
  LoadUrl(url, {
    method: "GET",
    headers: {},
    timeout: 10000,
    onLoad: (_responseXML, responseText) => {
      if (!responseText) {
        onError("Unable to retrieve HLS live playlist")
        return
      }

      onSuccess({
        transferFormat: TransferFormats.HLS,
        time: ManifestParser.parse(responseText, { windowType, initialWallclockTime, type: "m3u8" }),
      })
    },
    onError: () => {
      onError("Network error: Unable to retrieve HLS live playlist")
    },
  })
}

function getStreamUrl(data) {
  const match = /.*\n$/.exec(data)

  if (match) {
    return match[0]
  }
}

export default {
  load: (mediaUrl, { windowType, initialWallclockTime, onError, onSuccess } = {}) => {
    if (/\.mpd($|\?.*$)/.test(mediaUrl)) {
      retrieveDashManifest(mediaUrl, { windowType, initialWallclockTime, onError, onSuccess })
    } else if (/\.m3u8($|\?.*$)/.test(mediaUrl)) {
      retrieveHLSManifest(mediaUrl, { windowType, initialWallclockTime, onError, onSuccess })
    } else {
      onError("Invalid media url")
    }
  },
}
