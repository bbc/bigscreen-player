const LiveSupport = {
  NONE: "none",
  PLAYABLE: "playable",
  RESTARTABLE: "restartable",
  SEEKABLE: "seekable",
}

export type LiveSupport = (typeof LiveSupport)[keyof typeof LiveSupport]

export default LiveSupport
