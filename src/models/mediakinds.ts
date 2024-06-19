export const MediaKinds = {
  AUDIO: "audio",
  VIDEO: "video",
} as const

export type MediaKinds = (typeof MediaKinds)[keyof typeof MediaKinds]

export default MediaKinds
