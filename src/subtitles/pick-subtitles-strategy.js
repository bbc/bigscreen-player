export default function pickSubtitleStrategy() {
  const useLegacySubs = window.bigscreenPlayer?.overrides?.legacySubtitles ?? false

  if (useLegacySubs) {
    return import("./legacysubtitles.js").then(({ default: strategy }) => strategy)
  }

  return import("./imscsubtitles.js").then(({ default: strategy }) => strategy)
}
