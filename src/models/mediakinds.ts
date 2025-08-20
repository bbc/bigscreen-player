const AUDIO = "audio"
const VIDEO = "video"

export const MediaKinds = { AUDIO, VIDEO } as const

export type Audio = typeof AUDIO
export type Video = typeof VIDEO
export type MediaKinds = (typeof MediaKinds)[keyof typeof MediaKinds]

export default MediaKinds
