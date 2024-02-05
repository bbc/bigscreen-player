const TransferFormat = {
  DASH: "dash",
  HLS: "hls",
}

export type PlaybackStrategy = (typeof PlaybackStrategy)[keyof typeof PlaybackStrategy]

export default TransferFormat
