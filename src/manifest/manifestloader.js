import ManifestParser from './manifestparser'
import TransferFormats from '../models/transferformats'
import LoadUrl from '../utils/loadurl'

function retrieveDashManifest (url, dateWithOffset, callbacks) {
  LoadUrl(
    url,
    {
      method: 'GET',
      headers: {},
      timeout: 10000,
      onLoad: (responseXML, _responseText, _status) => {
        try {
          if (responseXML) {
            callbacks.onSuccess({
              transferFormat: TransferFormats.DASH,
              time: ManifestParser.parse(responseXML, 'mpd', dateWithOffset)
            })
          } else {
            callbacks.onError('Unable to retrieve DASH XML response')
          }
        } catch (ex) {
          callbacks.onError('Unable to retrieve DASH XML response')
        }
      },
      onError: () => {
        callbacks.onError('Network error: Unable to retrieve DASH manifest')
      }
    }
  )
}

function retrieveHLSManifest (url, dateWithOffset, callbacks) {
  LoadUrl(
    url,
    {
      method: 'GET',
      headers: {},
      timeout: 10000,
      onLoad: (_responseXML, responseText) => {
        let streamUrl

        if (responseText) {
          streamUrl = getStreamUrl(responseText)
        }
        if (streamUrl) {
          if (!/^http/.test(streamUrl)) {
            const parts = url.split('/')

            parts.pop()
            parts.push(streamUrl)
            streamUrl = parts.join('/')
          }
          loadLivePlaylist(streamUrl, dateWithOffset, callbacks)
        } else {
          callbacks.onError('Unable to retrieve HLS master playlist')
        }
      },
      onError: () => {
        callbacks.onError('Network error: Unable to retrieve HLS master playlist')
      }
    }
  )
}

function loadLivePlaylist (url, dateWithOffset, callbacks) {
  LoadUrl(
    url,
    {
      method: 'GET',
      headers: {},
      timeout: 10000,
      onLoad: (_responseXML, responseText) => {
        if (responseText) {
          callbacks.onSuccess({
            transferFormat: TransferFormats.HLS,
            time: ManifestParser.parse(responseText, 'm3u8', dateWithOffset)
          })
        } else {
          callbacks.onError('Unable to retrieve HLS live playlist')
        }
      },
      onError: () => {
        callbacks.onError('Network error: Unable to retrieve HLS live playlist')
      }
    }
  )
}

function getStreamUrl (data) {
  const match = /#EXT-X-STREAM-INF:.*[\n\r]+(.*)[\n\r]?/.exec(data)

  if (match) {
    return match[1]
  }
}

export default {
  load: (mediaUrl, serverDate, callbacks) => {
    if (/\.m3u8($|\?.*$)/.test(mediaUrl)) {
      retrieveHLSManifest(mediaUrl, serverDate, callbacks)
    } else if (/\.mpd($|\?.*$)/.test(mediaUrl)) {
      retrieveDashManifest(mediaUrl, serverDate, callbacks)
    } else {
      callbacks.onError('Invalid media url')
    }
  }
}
