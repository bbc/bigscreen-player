export const LiveSupport = {
  NONE: "none",
  PLAYABLE: "playable",
  RESTARTABLE: "restartable",
  SEEKABLE: "seekable",
} as const

export type LiveSupport = (typeof LiveSupport)[keyof typeof LiveSupport]

export default LiveSupport
