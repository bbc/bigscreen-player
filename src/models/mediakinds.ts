const AUDIO = "audio" as const
const VIDEO = "video" as const

export const MediaKinds = { AUDIO, VIDEO } as const

export type Audio = typeof AUDIO
export type Video = typeof VIDEO
export type MediaKinds = (typeof MediaKinds)[keyof typeof MediaKinds]

export default MediaKinds
