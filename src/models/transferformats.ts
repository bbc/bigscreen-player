export const TransferFormat = {
  DASH: "dash",
  HLS: "hls",
} as const

export type TransferFormat = (typeof TransferFormat)[keyof typeof TransferFormat]

export default TransferFormat
