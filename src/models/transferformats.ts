const TransferFormat = {
  DASH: "dash",
  HLS: "hls",
}

export type TransferFormat = (typeof TransferFormat)[keyof typeof TransferFormat]

export default TransferFormat
