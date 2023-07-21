/* eslint-disable unicorn/no-empty-file */

/**
 * Data required for playback
 * @typedef {Object} BigscreenPlayerData
 * @property {Object} media
 * @property {String} media.type - source type e.g 'application/dash+xml'
 * @property {String} media.mimeType - mimeType e.g 'video/mp4'
 * @property {String} media.kind - 'video' or 'audio'
 * @property {String} media.captionsUrl - 'Location for a captions file'
 * @property {MediaUrl[]} media.urls - Media urls to use
 * @property {Date} serverDate - DEPRECATED: Date object with server time offset
 */

/**
 * @typedef {Object} MediaUrl
 * @property {String} url - media endpoint
 * @property {String} cdn - identifier for the endpoint
 */

/**
 *
 * @typedef {object} InitCallbacks
 * @property {function} [callbacks.onSuccess] - Called after Bigscreen Player is initialised
 * @property {function} [callbacks.onError] - Called when an error occurs during initialisation
 */

/**
 * @typedef {Object} SubtitlesCustomisationOptions
 * @property {String} backgroundColour - CSS background-color string or hex string
 * @property {String} fontFamily - CSS font-family string
 * @property {Number} size - size multiplier to authored subtitles
 * @property {Number} lineHeight - lineHeight multiplier to authored subtitles
 */

/**
 * @typedef {Object} SubtitlesSafePosition
 * @property {Number} top - in px
 * @property {Number} left - in px
 * @property {Number} right - in px
 * @property {Number} bottom - in px
 */
